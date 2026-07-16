// platform/chrome/freshness.ts — the data-freshness colophon + the revalidate-on-
// focus trigger (S2 §3.6, the dock-foot freshness chip). Two jobs, one composable:
//
//   1. A reactive "data as of {generatedAt}" label, read off the ACTIVE dashboard's
//      feed meta. The platform store (useActiveDashboard) carries the generic FeedMeta
//      with `generatedAt`; when a feed predates the generatedAt stamp we fall back to
//      its latest data year, so the chip never blanks.
//
//   2. A revalidate-on-refocus trigger: when the tab regains VISIBILITY after the
//      user was away (a switched-back-to long-idle tab), the snapshot the live CF
//      Function served may have moved on, so we kick the store reload. We watch
//      @vueuse `useDocumentVisibility` ("visible" is the signal a backgrounded tab
//      has returned to the foreground) and revalidate on the rising edge only —
//      never on the initial mount, never when the tab hides. The fire is DEBOUNCED
//      so a flurry of tab-switches coalesces to one refetch (perf-safe; we do not
//      thrash the network on every flicker of focus).
//
// REDESIGN (B2b.md §interim). The chip is new chrome; it leans on the platform store
// + @vueuse rather than bespoke plumbing (INV: lib leverage).

import { computed, watch, type ComputedRef } from "vue";
import { useDocumentVisibility, useDebounceFn } from "@vueuse/core";
import { useActiveDashboard } from "../stores/useActiveDashboard.js";
import type { FeedMeta } from "../../data/contract.js";

/** How long a return-to-tab must settle before we refetch (coalesces flutter). */
const REVALIDATE_DEBOUNCE_MS = 400;

/** What the freshness chip renders + the seam to force a refetch. */
export interface Freshness {
    /** The human colophon — "data as of 7 Jun 2026", or "" before the feed lands. */
    label: ComputedRef<string>;
    /** The raw generatedAt (ISO) when the active feed carries one, else null. */
    generatedAt: ComputedRef<string | null>;
    /** Force a refetch of the active dashboard's feed (bypasses the per-slug memo). */
    revalidate: () => Promise<void>;
}

/** Format an ISO timestamp (or a bare year) as the short colophon date. */
function formatAsOf(generatedAt: string | null, fallbackYear: number | null): string {
    if (generatedAt) {
        const d = new Date(generatedAt);
        if (!Number.isNaN(d.getTime())) {
            return d.toLocaleDateString(undefined, {
                day: "numeric",
                month: "short",
                year: "numeric",
            });
        }
    }
    // No generatedAt yet (the interim USF feed) — name the data year instead, so the
    // chip is honest about the vintage without inventing a precision it lacks.
    return fallbackYear ? `FY${fallbackYear}` : "";
}

/**
 * PURE — resolve the colophon as-of stamp off the feed meta. A FROZEN program (ECF) is stamped by
 * its EXTRACT vintage (`extractAsOf`, the workbook "as of" date), NEVER `generatedAt` (the emit
 * stamp): reading `generatedAt` for a frozen feed painted the ECF dual as-of ("Jun 16, 2026" beside
 * the true "May 27, 2022"). `frozenAsOf` (the program-terminal FY) is the coarse fallback. A LIVE
 * feed reads `generatedAt`, falling back to its latest data year (the interim no-stamp feed).
 */
export function resolveAsOf(meta: FeedMeta | null): string {
    if (!meta) return "";
    if (meta.frozen) {
        if (meta.extractAsOf) return formatAsOf(meta.extractAsOf, null);
        if (meta.frozenAsOf) return `FY${meta.frozenAsOf}`;
    }
    const latestYear = meta.years[meta.years.length - 1] ?? null;
    return formatAsOf(meta.generatedAt, latestYear);
}

/**
 * The freshness composable. Reads the active dashboard's feed meta for the as-of
 * stamp and wires a regain-of-focus revalidate. Must be called inside a component
 * setup (it touches the Pinia store + a @vueuse window listener).
 */
export function useFreshness(): Freshness {
    const store = useActiveDashboard();

    const generatedAt = computed<string | null>(() => store.meta?.generatedAt ?? null);

    const label = computed<string>(() => {
        const stamp = resolveAsOf(store.meta);
        return stamp ? `data as of ${stamp}` : "";
    });

    async function revalidate(): Promise<void> {
        // Refetch the active dashboard's feed off the platform store (bypasses the
        // per-slug memo so a refocus pulls a fresh snapshot). Once the feed lands,
        // the `generatedAt`/`label` computeds re-read it — the freshness chip moves
        // on its own (no manual chip update; reactivity carries it).
        if (store.feed) await store.reload();
    }

    // Debounced so a flurry of tab-switches coalesces to one refetch. The trailing
    // edge fires after the tab has stayed put for REVALIDATE_DEBOUNCE_MS.
    const revalidateDebounced = useDebounceFn(revalidate, REVALIDATE_DEBOUNCE_MS);

    // Revalidate on the rising edge of document visibility only. @vueuse
    // `useDocumentVisibility` tracks the Page Visibility state; we fire on the
    // hidden→visible transition (a backgrounded tab brought back to the front),
    // never on the initial "visible" and never when the tab hides.
    const visibility = useDocumentVisibility();
    watch(visibility, (now, was) => {
        if (now === "visible" && was === "hidden") void revalidateDebounced();
    });

    return { label, generatedAt, revalidate };
}
