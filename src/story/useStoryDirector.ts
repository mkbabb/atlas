// platform/story/useStoryDirector.ts — THE STORY DIRECTOR (T2 · one story-spanning clock · N.md §4.B1).
//
// ONE clock for the whole story. The story axis is `storyT` — the CENTRE-SEQUENCE parameterization
// (`centreAxis`): the viewport centre's position through the ordered stage centres, ∈ [0, N−1],
// piecewise-linear, continuous, bidirectional-by-geometry. Beat i is settled at `storyT = i`; the edge
// i→i+1 scrubs on `frac(storyT)`. Every scalar below DERIVES from ONE scroll read per frame.
//
// THE SINGLE-SCROLL-SCALAR DISCIPLINE (D1.1). The atlas has ONE window-scroll writer
// (`useDocumentScrollProgress`, the KEPT source); a second `useWindowScroll`/`scrollY` reader is a
// DEFECT. So the director does NOT add its own scroll listener (the NP1 prototype's "one passive
// listener" is, in the atlas, the ONE existing writer) — it CONSUMES that scalar as its reactive
// heartbeat and measures the anchors in VIEWPORT space each tick (the scroll offset cancels: both the
// anchor centres and the viewport centre are read in the same frame's viewport coordinates). ZERO new
// listeners, ZERO new rAF — the reactive graph is the drain. Under PRM every edge `t` snaps (≥0.5 ⇒ 1
// else 0), the overlay never mounts, focus applies settled (information parity).

import {
    computed,
    shallowReactive,
    type ComputedRef,
    type Ref,
} from "vue";
import { useWindowSize } from "@vueuse/core";
import { useDocumentScrollProgress } from "@/motion/useScrollProgress";
import { useReducedMotion } from "@/motion/useReducedMotion";
import { centreAxis, activeIndexAt } from "@/story/centreAxis";
import type {
    BeatTransition,
    EdgeSpec,
    FocusEffect,
    MarkStageHandle,
    StoryChapter,
} from "@/story/story-contract";

/** One live edge as the director exposes it — the compiled edge + its scrub `t` + the active flag. */
export interface EdgeState {
    edge: BeatTransition;
    /** The continuous scrub 0..1 across the edge corridor. PRM ⇒ snapped to 0 | 1. */
    t: ComputedRef<number>;
    /** 0 < t < 1 — the overlay/choreography is live (never true under PRM). */
    active: ComputedRef<boolean>;
}

/** The director's public surface (the NP1 contract, verbatim). */
export interface StoryDirectorContext {
    /** The active chapter id — `round(storyT)`'s stage (the centre-argmin winner). */
    activeId: ComputedRef<string>;
    /** The continuous story position ∈ [0, N−1] (beat index + edge fraction). */
    storyT: ComputedRef<number>;
    /** The edge ARRIVING at chapter `to`, or null (no declared transition / not measurable). */
    edgeFor(to: string): EdgeState | null;
    /** The beat's declarative focus effects (template archetype + fill extensions). */
    focusFor(id: string): readonly FocusEffect[];
    /** The morph/focus seam a figure registered (the overlay reads endpoints through it). */
    stageFor(id: string): MarkStageHandle | undefined;
    /** A figure registers its morph/focus seam; returns the unregister disposer. */
    registerStage(id: string, handle: MarkStageHandle): () => void;
    /** A figure registers the element whose CENTRE is its story anchor; returns the disposer. */
    registerAnchor(id: string, el: Ref<HTMLElement | null>): () => void;
    /** True when ANY chapter declares a transition (the host mounts the overlay only then). */
    readonly hasChoreography: boolean;
}

/** A settled anchor's viewport-space centre (top + height/2), or null when unmeasurable. */
function anchorCentre(el: HTMLElement | null): number | null {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (r.height === 0 && r.top === 0) return null; // un-laid-out — not yet measurable
    return r.top + r.height / 2;
}

/**
 * THE DIRECTOR — one per story host. `DashboardEssay` mounts it when any chapter declares a
 * `transition` (zero-cost otherwise). The chapters are STATIC per route, so the id→chapter maps + the
 * edge specs are built ONCE at setup; only the anchor measurement re-runs per scroll tick.
 */
export function useStoryDirector(
    chapters: readonly StoryChapter[],
): StoryDirectorContext {
    const reduced = useReducedMotion();
    const tick = useDocumentScrollProgress(); // the KEPT single scroll writer — the heartbeat only
    const { height: viewportH } = useWindowSize();

    // Static per route (built once): the ordered ids, the id→index map, the arriving-edge specs.
    const order = chapters.map((c) => c.id);
    const indexOf = new Map(order.map((id, i) => [id, i]));
    const edges = new Map<string, EdgeSpec>();
    for (let i = 1; i < chapters.length; i++) {
        const spec = chapters[i]!.transition;
        if (spec) edges.set(chapters[i]!.id, spec);
    }
    const focus = new Map<string, readonly FocusEffect[]>(
        chapters.map((c) => [c.id, c.focus ?? []]),
    );
    const hasChoreography = edges.size > 0;

    // The live registries — anchor element refs + morph handles, keyed by chapter id.
    const anchors = shallowReactive(new Map<string, Ref<HTMLElement | null>>());
    const stages = shallowReactive(new Map<string, MarkStageHandle>());

    // The present anchors in chapter order + their viewport-space centres (re-measured each tick).
    const presentCentres = computed<{ id: string; centre: number }[]>(() => {
        void tick.value; // the reactive heartbeat — re-measure each scroll frame
        void viewportH.value; // and on resize
        const out: { id: string; centre: number }[] = [];
        for (const id of order) {
            const ref = anchors.get(id);
            const c = anchorCentre(ref?.value ?? null);
            if (c !== null) out.push({ id, centre: c });
        }
        return out;
    });

    const storyT = computed(() => {
        const present = presentCentres.value;
        if (present.length === 0) return 0;
        const vc = viewportH.value / 2; // the viewport centre in viewport coordinates
        return centreAxis(
            present.map((p) => p.centre),
            vc,
        );
    });

    const activeId = computed(() => {
        const present = presentCentres.value;
        if (present.length === 0) return order[0] ?? "";
        const i = Math.min(activeIndexAt(storyT.value), present.length - 1);
        return present[Math.max(0, i)]!.id;
    });

    function edgeFor(to: string): EdgeState | null {
        const spec = edges.get(to);
        if (spec === undefined) return null;
        const toIdx = indexOf.get(to);
        if (toIdx === undefined || toIdx === 0) return null;
        const from = order[toIdx - 1]!;
        const edge: BeatTransition = { from, to, spec, span: spec.span };
        // The scrub across the arriving corridor: storyT crosses from the previous present-anchor to
        // `to`'s present index. Both endpoints are resolved against the PRESENT ordering so an
        // unmeasured sentinel never shifts the fraction.
        const t = computed(() => {
            const present = presentCentres.value;
            const k = present.findIndex((p) => p.id === to);
            if (k <= 0) return 0; // not present, or the first present stage (no arriving edge yet)
            const raw = Math.max(0, Math.min(1, storyT.value - (k - 1)));
            if (reduced.value) return raw >= 0.5 ? 1 : 0; // PRM: the edge snaps, no scrub
            return raw;
        });
        const active = computed(() => {
            if (reduced.value) return false; // PRM: the overlay never mounts
            const v = t.value;
            return v > 0 && v < 1;
        });
        return { edge, t, active };
    }

    function focusFor(id: string): readonly FocusEffect[] {
        return focus.get(id) ?? [];
    }

    function stageFor(id: string): MarkStageHandle | undefined {
        return stages.get(id);
    }

    function registerStage(id: string, handle: MarkStageHandle): () => void {
        stages.set(id, handle);
        return () => {
            if (stages.get(id) === handle) stages.delete(id);
        };
    }

    function registerAnchor(id: string, el: Ref<HTMLElement | null>): () => void {
        anchors.set(id, el);
        return () => {
            if (anchors.get(id) === el) anchors.delete(id);
        };
    }

    return {
        activeId,
        storyT,
        edgeFor,
        focusFor,
        stageFor,
        registerStage,
        registerAnchor,
        hasChoreography,
    };
}
