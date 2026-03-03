import type { ConnectionOptions } from 'bullmq';

/**
 * BullMQ Redis connection config.
 *
 * Supports two modes via environment variables:
 *  - **Upstash (default)**: Uses REDIS_HOST / REDIS_PORT / REDIS_PASSWORD with TLS.
 *  - **Local Redis**: Set REDIS_LOCAL_URL (e.g. "redis://localhost:6379") to bypass Upstash.
 *
 * BullMQ uses ioredis internally, which requires `maxRetriesPerRequest: null`.
 */

function buildConnection(): ConnectionOptions {
    const localUrl = process.env.REDIS_LOCAL_URL;

    if (localUrl) {
        // Option C: local Redis (docker / self-hosted)
        const url = new URL(localUrl);
        console.log(`[BullMQ] Using local Redis at ${url.hostname}:${url.port}`);
        return {
            host: url.hostname,
            port: Number(url.port) || 6379,
            password: url.password || undefined,
            maxRetriesPerRequest: null,
        };
    }

    // Option A: Upstash Redis (TLS required)
    const host = process.env.REDIS_HOST;
    const port = Number(process.env.REDIS_PORT) || 6379;
    const password = process.env.REDIS_PASSWORD;

    if (!host || !password) {
        console.warn('[BullMQ] Missing REDIS_HOST or REDIS_PASSWORD — queues will not start.');
    }

    console.log(`[BullMQ] Using Upstash Redis at ${host}:${port}`);
    return {
        host,
        port,
        password,
        tls: {},
        maxRetriesPerRequest: null,
    };
}

export const bullmqConnection: ConnectionOptions = buildConnection();