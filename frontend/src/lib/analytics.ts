import posthog from 'posthog-js';

// Initialisation
const PH_KEY = import.meta.env.VITE_PUBLIC_POSTHOG_KEY as string | undefined;
const PH_HOST = import.meta.env.VITE_PUBLIC_POSTHOG_HOST as string | undefined;

export function initPostHog() {
    if (!PH_KEY) {
        console.warn('[Analytics] VITE_PUBLIC_POSTHOG_KEY is not set - analytics disabled.');
        return;
    }

    posthog.init(PH_KEY, {
        api_host: PH_HOST,
        capture_pageview: true,        // auto-track SPA page views
        capture_pageleave: true,       // track when user leaves a page
        autocapture: true,             // auto-capture clicks, inputs, etc.
    });
}

// User identity
export function identifyUser(userId: string, properties?: Record<string, unknown>) {
    posthog.identify(userId, properties);
}

export function resetUser() {
    posthog.reset();
}

// Custom events

// User opens a chapter reader page
export function trackReadChapter(params: {
    manga_id: string;
    manga_title: string;
    chapter_number?: string;
    language?: string;
}) {
    posthog.capture('read_chapter', params);
}

// User views a manga detail page
export function trackViewManga(params: {
    manga_id: string;
    manga_title: string;
    content_rating?: string;
}) {
    posthog.capture('view_manga', params);
}

// User follows a manga
export function trackFollowManga(params: {
    manga_id: string;
    manga_title?: string;
}) {
    posthog.capture('follow_manga', params);
}

// User unfollows a manga
export function trackUnfollowManga(params: {
    manga_id: string;
    manga_title?: string;
}) {
    posthog.capture('unfollow_manga', params);
}

// User shares a manga
export function trackShareManga(params: {
    manga_id: string;
    method: string;
}) {
    posthog.capture('share_manga', params);
}

// User performs a search
export function trackSearchManga(searchTerm: string) {
    posthog.capture('search_manga', { search_term: searchTerm });
}

// User uses advanced filters
export function trackUseFilter(filterType: string) {
    posthog.capture('use_filter', { filter_type: filterType });
}