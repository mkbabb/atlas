// platform/composables/useSavedViews.ts — the ONE saved-views shelf (RECAP.md #8,
// G10 §7.2). A saved view is a named bookmark of the FULL document state: because
// every deep-linkable param already round-trips to the URL (the filter dims, the
// year-scope, the pinned selection — all through `useUrlState`/`useViewParams`),
// a saved view need carry nothing more than the URL itself. Restoring is then a
// plain navigation to that URL; the view-params + year-scope reconstruct from the
// query on arrival, with zero bespoke serialization. We do NOT reinvent the URL
// state — we lean on it (INV-5, the URL-as-document floor).
//
// The shelf lives in `localStorage` under one key, reactive + cross-tab via @vueuse
// `useStorage` (a save in one tab shows in another's gallery). Entries key on the
// full URL: re-saving the same URL replaces the prior name rather than duplicating,
// so the shelf stays a set of distinct views, not a log of clicks.

import { computed, type ComputedRef } from "vue";
import { useStorage, useEventListener } from "@vueuse/core";

/** The localStorage key for the platform-wide saved-views shelf. */
const SHELF_KEY = "platform:views";

// ── THE SHELF BOUNDS (C8.3 / pf-hardening M3) ─────────────────────────────────────────
// The pre-C8 shelf was UNBOUNDED, UNVERSIONED, and restored as a router target from
// user-editable + cross-tab-writable storage. Three hardenings, all on READ + on save so a
// hand-edited or stale localStorage cannot blow the quota, mis-migrate, or feed a hostile
// `:to` into the gallery's `<RouterLink :to="view.url">`:
//
//   • BOUND — `save` caps the shelf to MAX_VIEWS most-recent (the prepend then slice), so
//     an unbounded shelf can never approach the ~5MB quota.
//   • VERSIONED — a sibling `platform:views:v` key carries the schema version. On bind, a
//     stale version migrates-or-DROPS (we discard rather than mis-read a prior shape), and
//     the current version is stamped. The shelf array itself stays a bare `SavedView[]`
//     under `platform:views` (the round-trip contract the gallery + proofs read).
//   • SAME-ORIGIN-PATH VALIDATED — on read, every entry is filtered to a SAFE shape: a
//     non-empty `slug`, and a `url` that is a leading-`/` SAME-ORIGIN path (not `//host`,
//     not `javascript:`, not an absolute `http(s)://` URL). The gallery binds `view.url`
//     straight into a `RouterLink :to`, so a hand-edited hostile url is dropped before it
//     can restore off-origin or carry an unexpected scheme.

/** The shelf's current schema version. Bump when `SavedView` changes shape; a stored
    shelf stamped at an OLDER version is DROPPED on read (migrate-or-discard), never
    mis-parsed against the new shape. */
const SHELF_VERSION = 1;
/** The sibling key carrying the stored shelf's schema version. */
const VERSION_KEY = "platform:views:v";
/** The most-recent N views the shelf retains (the quota bound). */
const MAX_VIEWS = 50;

/**
 * A stored entry is SAFE iff it carries a non-empty slug and a leading-`/` same-origin
 * path (the gallery binds `url` into `RouterLink :to`). Rejects `//host`, `javascript:`,
 * `http(s)://…`, and any non-string/empty field — so a hand-edited localStorage cannot
 * restore off-origin or smuggle a non-path scheme into the router.
 */
function isSafeView(v: unknown): v is SavedView {
    if (typeof v !== "object" || v === null) return false;
    const e = v as Record<string, unknown>;
    if (typeof e.slug !== "string" || e.slug.length < 1) return false;
    if (typeof e.url !== "string") return false;
    // Leading single slash, NOT a protocol-relative `//host` (which the URL parser would
    // resolve to a foreign origin).
    if (!e.url.startsWith("/") || e.url.startsWith("//")) return false;
    if (typeof e.id !== "number" || typeof e.name !== "string") return false;
    return true;
}

/** A single saved view — a named bookmark of one dashboard's full URL state. */
export interface SavedView {
    /** Stable id (the save timestamp in ms) — keys the list, orders newest-first. */
    id: number;
    /** The user's label for the view (defaults to the dashboard title on save). */
    name: string;
    /** The dashboard slug the view belongs to (for the cross-dashboard gallery). */
    slug: string;
    /** The FULL relative URL — path + query — the restore navigates to. The query
        carries the filter dims, the year-scope, and the pinned selection verbatim. */
    url: string;
    /** ISO save stamp (the colophon under the entry). */
    savedAt: string;
}

/** The composable's reactive surface. */
export interface UseSavedViews {
    /** Every saved view across every dashboard, newest first. */
    views: ComputedRef<SavedView[]>;
    /** The saved views for one dashboard slug, newest first. */
    viewsFor: (slug: string) => SavedView[];
    /**
     * Save the current view under `name`. Re-saving the SAME url replaces the prior
     * entry (the shelf is a set of distinct views, not a click-log). Returns the
     * stored entry. A blank name falls back to the slug so an entry is never nameless.
     */
    save: (entry: { name: string; slug: string; url: string }) => SavedView;
    /** Forget a saved view by id. */
    remove: (id: number) => void;
    /** Forget every saved view (the shelf reset). */
    clear: () => void;
}

/** The current document's full relative URL — path + query (the saved-view key). */
export function currentUrl(): string {
    return `${window.location.pathname}${window.location.search}`;
}

// A monotonic id source: `Date.now()` can repeat within a millisecond (two rapid
// saves), which would collide two entries on one id. We carry the last-issued value
// forward so every entry gets a distinct, time-ordered id even under a fast burst.
let lastId = 0;
function nextId(): number {
    const now = Date.now();
    lastId = now > lastId ? now : lastId + 1;
    return lastId;
}

/**
 * Bind the saved-views shelf. `useStorage` keeps the array reactive AND synced to
 * `localStorage` (so a restore link in the gallery reflects a save made on a
 * dashboard, even across tabs). The serializer is the default JSON codec — the
 * `SavedView[]` is plain data, so it round-trips without a custom serializer.
 */
export function useSavedViews(): UseSavedViews {
    // G-E9b.1 (the /usf flip-cost residual) — the shelf is bound with `listenToStorageChanges:
    // false`, so a FOREIGN storage write (glass-ui's `useGlobalDark` stamping the theme key on a
    // theme flip) no longer fires this shelf's cross-instance re-sync ON the flip's main-thread
    // long task (the ~42ms the E2 profile flagged: two shelf instances — Dock + FilterPanel —
    // each reconciling on every storage event). The cross-TAB feature is PRESERVED off the flip
    // path: a `visibilitychange`/`focus` re-read pulls another tab's saves the moment this tab
    // regains focus (the natural moment to reconcile), never on a storage event mid-interaction.
    const shelf = useStorage<SavedView[]>(SHELF_KEY, [], undefined, {
        listenToStorageChanges: false,
    });

    // Cross-tab reconcile OFF the flip path — re-read the shelf when this tab regains focus (a
    // sibling tab may have saved while we were away). Guarded for SSR / no-localStorage.
    function reReadShelf(): void {
        try {
            const raw = localStorage.getItem(SHELF_KEY);
            if (raw == null) return;
            const parsed = JSON.parse(raw) as unknown;
            if (Array.isArray(parsed)) shelf.value = parsed as SavedView[];
        } catch {
            // a garbled foreign write — leave the in-memory shelf (the `views` read-filter guards it).
        }
    }
    if (typeof document !== "undefined") {
        useEventListener(document, "visibilitychange", () => {
            if (document.visibilityState === "visible") reReadShelf();
        });
        useEventListener(window, "focus", reReadShelf);
    }

    // VERSION MIGRATE-OR-DROP (M3). If the stored shelf was stamped at an OLDER schema
    // version (or carries no/garbled version stamp), DROP the incompatible entries rather
    // than mis-read a prior shape against the current `SavedView` — migrate = discard — then
    // stamp the current version so the NEXT shape change can migrate cleanly. Guarded for
    // SSR / no-localStorage environments. (At v1 the discard collapses to the same safe-filter
    // the read applies; the `< SHELF_VERSION` arm is the future-proofing for a v2 shape change.)
    try {
        const storedVersion = Number(localStorage.getItem(VERSION_KEY));
        if (storedVersion !== SHELF_VERSION) {
            if (!Number.isFinite(storedVersion) || storedVersion < SHELF_VERSION) {
                shelf.value = shelf.value.filter(isSafeView);
            }
            localStorage.setItem(VERSION_KEY, String(SHELF_VERSION));
        }
    } catch {
        // no localStorage (SSR/private mode) — the in-memory shelf is the floor.
    }

    // Newest-first, defensively re-sorted, SAFE-FILTERED, AND BOUND on read (M3): a
    // hand-edited localStorage or a cross-tab write could land out of order, carry a hostile
    // `url`, OR exceed the cap, so we (1) drop any entry that is not a leading-`/`
    // same-origin path before the gallery binds it into `RouterLink :to`, and (2) slice to
    // MAX_VIEWS so even a hand-edited over-long shelf surfaces at most the cap. We never
    // trust the stored order, the stored url, OR the stored length.
    const views = computed<SavedView[]>(() =>
        [...shelf.value]
            .filter(isSafeView)
            .sort((a, b) => b.id - a.id)
            .slice(0, MAX_VIEWS),
    );

    function viewsFor(slug: string): SavedView[] {
        return views.value.filter((v) => v.slug === slug);
    }

    function save(entry: { name: string; slug: string; url: string }): SavedView {
        const name = entry.name.trim() || entry.slug;
        const stored: SavedView = {
            id: nextId(),
            name,
            slug: entry.slug,
            url: entry.url,
            savedAt: new Date().toISOString(),
        };
        // Replace any existing entry for the same URL (idempotent re-save), then
        // prepend the fresh one. Assigning a NEW array triggers the storage write.
        // BOUND (M3): cap the shelf to MAX_VIEWS most-recent so it can never approach
        // the ~5MB localStorage quota — the oldest entries fall off the tail.
        const next = shelf.value.filter((v) => v.url !== entry.url);
        shelf.value = [stored, ...next].slice(0, MAX_VIEWS);
        return stored;
    }

    function remove(id: number): void {
        shelf.value = shelf.value.filter((v) => v.id !== id);
    }

    function clear(): void {
        shelf.value = [];
    }

    return { views, viewsFor, save, remove, clear };
}
