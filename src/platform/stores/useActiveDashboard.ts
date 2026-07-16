// platform/stores/useActiveDashboard.ts — the platform data store (a Pinia SETUP
// store). It generalizes the USF god-store's loaded-dataset half: instead of a
// hardcoded `loadUsf()`, it resolves the ACTIVE dashboard slug from the route, looks
// it up in the glob registry, and loads ITS feed through B2c's generic `loadFeed`.
// Every dashboard inherits the same `{feed, meta, rows, loading, error, reload}`
// surface; the dashboard-specific derivations (USF's program/hinge/per-capita) build
// ON this store, they do not live IN it (B3 carves the USF store on top).
//
// MEMOIZED: a feed is loaded once per slug and cached on the store, so re-navigating
// to a dashboard (or two components reading the store) does not re-fetch. A slug
// change loads the new feed and swaps the active reference; `reload` forces a refetch
// past the memo (the live CF Function may have moved on since the snapshot).

import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import { loadFeed } from "../../data/loadFeed.js";
import type { Feed, FeedMeta, FeedRow } from "../../data/contract.js";
import { useDashboardRegistry } from "../../contract/index.js";

export const useActiveDashboard = defineStore("platform:activeDashboard", () => {
    const route = useRoute();
    // The instance-built registry, injected (L1-INVERSION). This Pinia SETUP store runs in an
    // app-level injection context (it already calls useRoute()), so it injects the registry the
    // instance installed at bootstrap rather than statically importing `@/dashboards/registry`.
    const { findDashboard } = useDashboardRegistry();

    /** The active dashboard slug, off the `/:slug` route param (null on the gallery). */
    const slug = computed<string | null>(() => {
        const raw = route.params.slug;
        const s = Array.isArray(raw) ? raw[0] : raw;
        return s ? String(s) : null;
    });

    /** The registry entry for the active slug (title/grain/loader), or undefined. */
    const entry = computed(() => (slug.value ? findDashboard(slug.value) : undefined));

    // One feed cache per slug — the memo that makes re-navigation free. The active
    // feed is whichever slug the route currently points at.
    const feeds = ref<Map<string, Feed>>(new Map());
    const loading = ref(false);
    const error = ref<string | null>(null);

    /** The loaded feed for the active slug, or null before its first load resolves. */
    const feed = computed<Feed | null>(() =>
        slug.value ? (feeds.value.get(slug.value) ?? null) : null,
    );
    /** The active feed's metadata (key field, grain, years, measures), or null. */
    const meta = computed<FeedMeta | null>(() => feed.value?.meta ?? null);
    /** The active feed's tidy-long rows (one per key×year), or the empty list. */
    const rows = computed<FeedRow[]>(() => feed.value?.rows ?? []);

    /**
     * Load the active slug's feed through `loadFeed`, honouring the per-slug memo
     * unless `force` is set. Resolves silently when there is no active slug (the
     * gallery) or the feed is already cached. Errors land on `error` rather than
     * throwing, so a binding shows a state instead of crashing the route.
     */
    async function ensureLoaded(force = false): Promise<void> {
        const s = slug.value;
        if (!s) return;
        if (!force && feeds.value.has(s)) return;
        loading.value = true;
        error.value = null;
        try {
            const loaded = await loadFeed(s);
            // Replace the Map (a new reference) so the `feed` computed re-evaluates.
            const next = new Map(feeds.value);
            next.set(s, loaded);
            feeds.value = next;
        } catch (e) {
            error.value = e instanceof Error ? e.message : String(e);
        } finally {
            loading.value = false;
        }
    }

    /** Force a refetch of the active slug, bypassing the memo (e.g. a manual retry). */
    async function reload(): Promise<void> {
        await ensureLoaded(true);
    }

    return {
        slug,
        entry,
        feed,
        meta,
        rows,
        loading,
        error,
        ensureLoaded,
        reload,
    };
});
