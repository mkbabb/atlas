// motion/useFirstView.ts — THE ONE ENTRANCE LAW (U/B8 A9 and P-G4; reference: gregg src/lib/motion.ts).
//
// Every atlas entrance (a rule that draws in, a map that lands its shapes) obeys one law:
//   1. It plays once, the first time its element has been in view for FIRST_VIEW_DWELL_MS (130 ms).
//      A scroll, a dock jump or a restore that flies past does not use it up: leaving view before
//      the dwell ends cancels the timer. An element taller than the viewport counts once it fills
//      half the viewport, so nothing tall is stranded before its entrance.
//   2. On a page opened on a deep link it waits until the link has landed (`whenNarrativeLanded`),
//      so the elements above the anchor do not play at the top of the page before the restore
//      scrolls them away.
//   3. Under reduced motion it never plays: the element is painted in its final state. A switch to
//      reduced motion mid-flight puts it at rest.
//   4. It never loops. A chart mark has no idle or repeating motion (the `breath` mechanism is an
//      ornament register only; `motion-director.ts` refuses it on a plate).
//
// The ECharts first paint is not an entrance: `useEChart` paints a chart's first frame at rest
// (see `firstPaint` there), so a chart mounted below the fold never spends its entrance off screen.
import { onBeforeUnmount, onMounted, onScopeDispose, ref, watch, type Ref, type WatchSource } from "vue";
import { useReducedMotion } from "./useReducedMotion.js";
import { narrativeLandingHeld, whenNarrativeLanded } from "./narrative-restore.js";

/** How long an element must stay in view before its entrance plays. */
export const FIRST_VIEW_DWELL_MS = 130;
/** The share of the element that counts as in view. */
export const FIRST_VIEW_SHARE = 0.25;

/** Fine enough that a very tall element still reports when it fills half the viewport. */
const THRESHOLDS = [0, 0.01, 0.025, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1];

export interface FirstViewOptions {
    /** The share of the element that counts as in view (default 0.25). */
    threshold?: number;
}

/**
 * Call `onView` once, when `el` has been in view for the dwell, after any deep link has landed.
 * Returns a stop. Without IntersectionObserver it never calls `onView` (the caller rests).
 */
export function observeFirstView(
    el: Element,
    onView: () => void,
    { threshold = FIRST_VIEW_SHARE }: FirstViewOptions = {},
): () => void {
    let io: IntersectionObserver | null = null;
    let dwell: ReturnType<typeof setTimeout> | undefined;
    let done = false;
    const stop = (): void => {
        done = true;
        cancelLanding();
        clearTimeout(dwell);
        io?.disconnect();
        io = null;
    };
    const watchForView = (): void => {
        if (done || typeof IntersectionObserver === "undefined") return;
        const thresholds = [...new Set([...THRESHOLDS, threshold])].sort((a, b) => a - b);
        io = new IntersectionObserver(
            (entries) => {
                const seen = entries.some(
                    (e) =>
                        e.isIntersecting &&
                        (e.intersectionRatio >= threshold ||
                            e.intersectionRect.height >= window.innerHeight * 0.5),
                );
                // Leaving view cancels the dwell. Staying in view keeps the dwell already running:
                // each threshold a scroll crosses reports again, and restarting the timer on every
                // report would hold a slowly scrolled element past its 130 ms.
                if (!seen) {
                    clearTimeout(dwell);
                    dwell = undefined;
                    return;
                }
                if (dwell !== undefined) return;
                dwell = setTimeout(() => {
                    if (done) return;
                    stop();
                    onView();
                }, FIRST_VIEW_DWELL_MS);
            },
            { threshold: thresholds },
        );
        io.observe(el);
    };
    const cancelLanding = whenNarrativeLanded(watchForView);
    return stop;
}

/**
 * The composable form over a live target: observe whatever element `target` names (null observes
 * nothing), re-arming when it changes, so an entrance turned on after mount still plays once on its
 * first view. `isSupported` is false where the engine has no IntersectionObserver.
 */
export function useFirstViewTarget(
    target: WatchSource<Element | null | undefined>,
    onView: () => void,
    options: FirstViewOptions = {},
): { isSupported: Readonly<Ref<boolean>> } {
    const isSupported = ref(typeof IntersectionObserver !== "undefined");
    let stop: (() => void) | null = null;
    watch(
        target,
        (el) => {
            stop?.();
            stop = el && isSupported.value ? observeFirstView(el, onView, options) : null;
        },
        { immediate: true, flush: "post" },
    );
    onScopeDispose(() => stop?.());
    return { isSupported };
}

/** `rest`: painted final, no flight · `pending`: held at its first frame, waiting for the first view
    · `play`: the first view came; the caller runs its flight once and the phase stays here. */
export type EntrancePhase = "rest" | "pending" | "play";

export interface EntranceOptions extends FirstViewOptions {
    /** An element already in view at mount (with no deep link owed) rests instead of playing.
        Default `false`: it plays after the dwell like any other. */
    restInViewAtMount?: boolean;
}

/**
 * The entrance phase of one element under the entrance law. Server render and first client render
 * read `rest`; the mount moves an element that will play to `pending`.
 */
export function useEntrance(
    el: Ref<Element | null | undefined>,
    { restInViewAtMount = false, ...view }: EntranceOptions = {},
): { phase: Readonly<Ref<EntrancePhase>> } {
    const reduced = useReducedMotion();
    const phase = ref<EntrancePhase>("rest");
    let stop: (() => void) | null = null;
    const rest = (): void => {
        stop?.();
        stop = null;
        phase.value = "rest";
    };
    onMounted(() => {
        const target = el.value;
        if (!target || reduced.value || typeof IntersectionObserver === "undefined") return;
        if (restInViewAtMount && !narrativeLandingHeld()) {
            const r = target.getBoundingClientRect();
            if (r.bottom > 0 && r.top < window.innerHeight) return;
        }
        phase.value = "pending";
        stop = observeFirstView(target, () => (phase.value = "play"), view);
    });
    watch(reduced, (r) => {
        if (r && phase.value !== "rest") rest();
    });
    onBeforeUnmount(() => stop?.());
    return { phase };
}
