import prisma from '../../db/prisma';
import { MangaDexClient } from '../../services/mangadex_client';
import redisClient from '../../db/redis_client';
import { queueNewChapterNotification } from './notification_queue';

const mangadexClient = new MangaDexClient();

const LAST_CHECK_KEY = 'noti:last-chapter-check';
const CONCURRENCY = 5; // Parallel MangaDex requests per batch
const BATCH_DELAY = 300; // ms between batches to respect rate limits

/**
 * Poll MangaDex for new chapters of all followed manga.
 * For each new chapter found, fan out a notification to every follower.
 *
 * Uses Redis key `noti:last-chapter-check` as the watermark timestamp.
 * On first run (no key), defaults to 35 minutes ago.
 */
export async function checkNewChapters(): Promise<void> {
    console.log('[NewChapterChecker] Starting check...');

    // 1. Determine "since" timestamp
    let since: Date;
    try {
        const stored = redisClient.isReady()
            ? await redisClient.getClient().get(LAST_CHECK_KEY)
            : null;
        if (stored) {
            since = new Date(stored);
        } else {
            // First run: look back 35 min (slightly more than the 30-min interval)
            since = new Date(Date.now() - 35 * 60 * 1000);
        }
    } catch {
        since = new Date(Date.now() - 35 * 60 * 1000);
    }

    // Mark the current time as the new watermark BEFORE fetching
    // (so we don't miss chapters published during the fetch)
    const checkStartTime = new Date();

    // 2. Get all unique MangaDex manga IDs that are followed by any user
    const followedManga = await prisma.favorite.findMany({
        where: { mangaSource: 'MANGADEX', externalMangaId: { not: null } },
        select: { externalMangaId: true },
        distinct: ['externalMangaId'],
    });

    const mangaIds = followedManga
        .map((f: { externalMangaId: string | null }) => f.externalMangaId!)
        .filter(Boolean);

    if (mangaIds.length === 0) {
        console.log('[NewChapterChecker] No followed manga. Skipping.');
        await updateWatermark(checkStartTime);
        return;
    }

    console.log(`[NewChapterChecker] Checking ${mangaIds.length} manga since ${since.toISOString()}`);

    // MangaDex createdAtSince format: YYYY-MM-DDTHH:mm:ss (no ms, no Z)
    const sinceStr = since.toISOString().slice(0, 19);
    let newChapterCount = 0;

    // 3. Fetch new chapters per manga in parallel batches
    for (let i = 0; i < mangaIds.length; i += CONCURRENCY) {
        if (i > 0) await sleep(BATCH_DELAY);

        const batch = mangaIds.slice(i, i + CONCURRENCY);
        const results = await Promise.allSettled(
            batch.map((mangaId: string) =>
                mangadexClient.getChaptersForManga(mangaId, {
                    limit: 100,
                    createdAtSince: sinceStr,
                    order: { createdAt: 'desc' },
                    includes: ['manga'],
                })
            )
        );

        for (const result of results) {
            if (result.status !== 'fulfilled' || !result.value?.data) continue;

            for (const chapter of result.value.data) {
                const mangaRel = chapter.relationships?.find(
                    (r: any) => r.type === 'manga'
                );
                const mangaId = mangaRel?.id;
                if (!mangaId) continue;

                const mangaTitle =
                    mangaRel?.attributes?.title?.en ??
                    Object.values(mangaRel?.attributes?.title ?? {})[0] ??
                    'Unknown';

                const chapterId = chapter.id;
                const chapterNumber = chapter.attributes?.chapter ?? undefined;

                // 4. Find all users following this manga
                const followers = await prisma.favorite.findMany({
                    where: {
                        externalMangaId: mangaId,
                        mangaSource: 'MANGADEX',
                    },
                    select: { userId: true },
                });

                const followerIds = followers.map((f: { userId: string }) => f.userId);

                if (followerIds.length > 0) {
                    await queueNewChapterNotification(
                        mangaId,
                        mangaTitle as string,
                        chapterId,
                        chapterNumber,
                        followerIds
                    );
                    newChapterCount++;
                }
            }
        }
    }

    // 5. Update watermark
    await updateWatermark(checkStartTime);

    console.log(
        `[NewChapterChecker] Done. Found ${newChapterCount} new chapters.`
    );
}

async function updateWatermark(time: Date): Promise<void> {
    try {
        if (redisClient.isReady()) {
            await redisClient
                .getClient()
                .set(LAST_CHECK_KEY, time.toISOString());
        }
    } catch {
        // Non-fatal
    }
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}