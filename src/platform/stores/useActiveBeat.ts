// platform/stores/useActiveBeat.ts — the shared ACTIVE-BEAT store (I5 §4 · single-writer).
//
// The dock already computes `activeBeatId` via its EXISTING `IntersectionObserver` over the beat
// section ids (`Dock.vue` — the sole observer, the upper-third reading line). The SelectionPreview
// card needs that same beat — for the "In: <active beat>" caption AND for the contextual-stat
// registry (`useSelectionStat` resolves a beat's resolver). It must NOT mount a SECOND observer:
// the single-scroll-scalar discipline (the `useDocumentScrollProgress` single-writer law) forbids a
// duplicate writer that would re-detonate the multi-writer scroll defect.
//
// So the beat is LIFTED into this tiny platform store: the dock WRITES `setActiveBeat(id)` from its
// one observer (the ONE writer line, added in Dock.vue), and the card + the stat registry READ
// `activeBeatId`. The beat is chrome WAYFINDING (which section the reader is in), not dashboard
// data, so it is a PLATFORM store — not a `DashboardContext` field (OQ-3). The store is an
// app-singleton; a route change re-seeds it as the next dock's observer mounts and writes its first
// beat (the dock SEEDS the first beat on setup, so the rail never reads zero — that seed flows here).

import { defineStore } from "pinia";
import { computed, ref } from "vue";

export const useActiveBeat = defineStore("platform:active-beat", () => {
    /** The id of the beat section nearest the reading line, written by the dock's ONE observer.
        Empty string at rest / before the first section resolves (the dock seeds the first beat). */
    const activeBeatId = ref<string>("");
    /** The human label of the active beat (the "In: <label>" caption), written ALONGSIDE the id by
        the same dock writer. Empty when the dock has not supplied a label (the id is the fallback). */
    const activeBeatLabel = ref<string>("");

    /** True once a real beat is active (drives the card's caption presence). */
    const hasBeat = computed<boolean>(() => activeBeatId.value !== "");

    // ── THE CENTRE-GRAIN ACTIVE-VIZ SIGNAL (K-ACTIVE · the A1 dual-grain mint) ────────────────────
    // BESIDE the dock's upper-third `activeBeatId` sits the centre-grain active-VIZ signal: the viz
    // nearest viewport-CENTRE (the `argmin |‑‑scroll-tl − 0.5|` over the mounted scrub hosts). It is a
    // SECOND single-writer target — written by the `activeViz.ts` registry's ONE rAF reader, never by
    // the dock — so the two grains stay DISJOINT (the single-writer-per-signal law, mirrored at the
    // second grain). Two faces of the one mint:
    //   · `activeVizId`  — the SINGLETON centre-most viz (the deft golden rim's subject);
    //   · `activeVizIds` — the IN-VIEWPORT SET (the hosts mid-transit) D1's filter-panel union reads.
    // The dock writes `activeBeatId`/`activeBeatLabel`; the registry writes `activeVizId`/`activeVizIds`.

    /** The id of the viz nearest viewport-centre (argmin |‑‑scroll-tl − 0.5|), written by the
        `activeViz.ts` registry's ONE rAF reader. Empty string when no scrub host is centred (the rim
        is absent). It drives the deft golden `.plate-active-rim`. */
    const activeVizId = ref<string>("");

    /** The IN-VIEWPORT set — the scrub hosts mid-transit (`0 < --scroll-tl < 1`) this frame. D1's
        unified filter panel projects `⋃ activeVizIds.dims` off this set. A frozen `ReadonlySet` the
        registry swaps by reference ONLY when the membership changes (the I17 starvation guard). */
    const activeVizIds = ref<ReadonlySet<string>>(new Set());

    /** True once a real viz is centred (drives the rim's presence + D1's "in view" projection). */
    const hasActiveViz = computed<boolean>(() => activeVizId.value !== "");

    /**
     * THE ONE WRITER (the dock). Set the active beat id (+ its optional label) from the dock's
     * existing observer. Idempotent — a re-write of the same id is a no-op assignment Vue dedupes.
     * The label is optional so a caller that only knows the id (a deep test) still writes correctly;
     * an empty/omitted label leaves the prior label untouched ONLY when the id is unchanged, else it
     * clears (a new beat with no label has no stale caption).
     */
    function setActiveBeat(id: string, label?: string): void {
        const changed = activeBeatId.value !== id;
        activeBeatId.value = id;
        if (label !== undefined) activeBeatLabel.value = label;
        else if (changed) activeBeatLabel.value = "";
    }

    /**
     * THE SECOND WRITER (the `activeViz.ts` registry — the centre-grain rAF reader). Commits BOTH
     * centre-grain faces in one call: the singleton `activeVizId` (the rim) + the `activeVizIds`
     * in-viewport set (D1's panel union). It NEVER touches `activeBeatId`/`activeBeatLabel` — the
     * two single-writers own DISJOINT targets (the two-writer-isolation law). The registry already
     * dedupes on the scroll-hot path, so this is a plain commit.
     */
    function setActiveViz(id: string, inViewport: ReadonlySet<string>): void {
        activeVizId.value = id;
        activeVizIds.value = inViewport;
    }

    return {
        activeBeatId,
        activeBeatLabel,
        hasBeat,
        setActiveBeat,
        activeVizId,
        activeVizIds,
        hasActiveViz,
        setActiveViz,
    };
});
