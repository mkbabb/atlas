// platform/composables/useAffordanceHint.ts — THE FIRST-VIZ AFFORDANCE MICRO-LIFT
// (I-UX.b · UX-D1, the invisible-instrument fix — NO modal, NO coachmark).
//
// THE GAP IT CLOSES. Every verb-of-MOVEMENT (hover→drill, click→light-everywhere, focus→re-aim) is
// INVISIBLE until the reader happens to mouse a mark — a first-time reader scrolls the route as a
// static infographic and never discovers it is a COORDINATED instrument. The fix is restrained by
// construction (DESIGN D1/D6 — no marketing chrome, no tutorial overlay): the FIRST interactive viz
// fires a ONE-TIME micro-lift on its first scroll-into-view so the eye learns "these marks move".
// The instrument teaches itself through its OWN motion — not a pitch.
//
// THE MECHANISM (no new engine). The FIRST `[data-viz-plate]` on the route (every VizPlate stamps
// that marker — the interactive plate host) is handed to the atlas entrance law (`observeFirstView`,
// motion/useFirstView.ts, U/B8 A9): the lift plays once, after the plate has been in view for the
// dwell, never on a pass-through, and on a deep-linked page only after the restore has landed. The
// composable then sets `data-affordance-lift` on that plate for ONE pass; the unscoped
// `chrome-overlays.css` `affordance-lift` keyframe (a brief settle of the figure body, one pass)
// plays, then the attribute is removed. It fires AT MOST ONCE. (Before U/B8 DV repair 1 it armed a
// raw IntersectionObserver and lifted on the first hit: a plate scrolled past, or one sitting at the
// top of a deep-linked page before the restore moved it away, spent the lift off the reader's screen.)
//
// THE THREE FENCES THAT GATE IT (DESIGN §4.0 TENET-5):
//   • SESSION-ONCE — a `sessionStorage` latch (`atlas:affordance-hint`) makes it fire ONCE per
//     session across every route + reload-within-session, so the teach-moment is the FIRST arrival,
//     never a per-route nag. (A new tab / a cleared session re-teaches — the right grain.)
//   • PRM — under `prefers-reduced-motion: reduce` it is a HARD no-op: the attribute is never set, no
//     keyframe attaches, the plate rests at its terminal state (the instant-state fence). The latch
//     is NOT consumed under PRM (a reduced-motion reader who later disables PRM still gets taught).
//   • SSR / no-IO — guarded for `typeof window`/`IntersectionObserver` absence (no throw off-DOM).
//
// SINGLETON BY MOUNT. Consumed ONCE from the app-singleton interaction surface (HoverCard, the one
// platform readout card mounted at the chrome) so there is exactly one observer for the whole app —
// it never duplicates per plate, and it co-locates with the other discoverability surfaces.

import { onBeforeUnmount, onMounted } from "vue";
import { useReducedMotion } from "../motion/useReducedMotion.js";
import { observeFirstView } from "../motion/useFirstView.js";

/** The session-once latch key — the hint fires once per browser session (across routes + a
    same-session reload), never a per-route nag. */
const SESSION_KEY = "atlas:affordance-hint";
/** The marker every VizPlate stamps on its frame — the FIRST one is the route's first interactive
    viz (the plate that hosts the cross-viz selection / drill verbs). */
const VIZ_PLATE_SELECTOR = "[data-viz-plate]";
/** The one-pass attribute the unscoped `affordance-lift` keyframe keys on (chrome-overlays.css). */
const LIFT_ATTR = "data-affordance-lift";
/** The single micro-lift pass duration — matched to the keyframe so the attribute is removed once the
    pass settles (the lift is transient; the plate returns to its own resting state). */
const LIFT_PASS_MS = 1100;

/** True once the session latch has been claimed (so a second mount within the session is inert). */
function alreadyFired(): boolean {
    if (typeof window === "undefined") return true;
    try {
        return window.sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
        // a privacy mode with sessionStorage blocked — degrade to "fire once per page-load".
        return false;
    }
}
function claimFired(): void {
    if (typeof window === "undefined") return;
    try {
        window.sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
        /* sessionStorage blocked — the page-load-scoped latch below still prevents a re-fire */
    }
}

/**
 * Mount the one-time first-viz affordance micro-lift. Self-contained: it owns its first-view watch
 * (the entrance law) + the session latch + the PRM fence; the caller mounts it ONCE (HoverCard) and
 * passes nothing. It is a no-op under PRM, when the session latch is already claimed, or off-DOM.
 */
export function useAffordanceHint(): void {
    const reduced = useReducedMotion();
    let stopView: (() => void) | null = null;
    let liftTimer: ReturnType<typeof setTimeout> | null = null;
    // A page-load-scoped guard so a sessionStorage-blocked browser still fires at most once per load.
    let firedThisLoad = false;
    // J-FILTER C43 (the one-shot guard) — the plate-resolve retry rAF is BOUNDED so it can never
    // become a self-retriggering PULSE loop. A route with no `[data-viz-plate]` (e.g. /home, /demand)
    // would otherwise re-schedule a rAF every frame for the component's whole lifetime; the cap settles
    // the retry after a small budget (the body mounts within a few frames, or the route honestly has no
    // interactive plate). `rafHandle` is tracked so unmount cancels any pending frame.
    let plateRetries = 0;
    const MAX_PLATE_RETRIES = 120; // ~2s at 60fps — the body resolves well within this, then settle.
    let rafHandle: number | null = null;

    /** Play the one micro-lift pass on the plate, then strip the attribute (the lift is transient). */
    function lift(plate: Element): void {
        // a reader who switched to reduced motion while the plate waited gets no lift (the PRM fence).
        if (firedThisLoad || reduced.value) return;
        firedThisLoad = true;
        claimFired();
        plate.setAttribute(LIFT_ATTR, "");
        liftTimer = setTimeout(() => {
            plate.removeAttribute(LIFT_ATTR);
            liftTimer = null;
        }, LIFT_PASS_MS);
    }

    /** Find the first interactive plate + observe it; retry next frame while the body resolves async
        (the dashboard body mounts after the chrome, so a synchronous query at mount can miss it). */
    function observeFirstPlate(): void {
        if (typeof window === "undefined" || typeof IntersectionObserver === "undefined")
            return;
        if (reduced.value || alreadyFired() || firedThisLoad) return;
        const plate = document.querySelector(VIZ_PLATE_SELECTOR);
        if (!plate) {
            // the body is still resolving — retry on the next frame, BOUNDED by the retry budget so
            // a plate-less route can never spin a self-retriggering rAF PULSE for the whole lifetime
            // (J-FILTER C43). The retry SETTLES after MAX_PLATE_RETRIES frames (the body resolves well
            // within ~2s, or the route honestly has no interactive plate — either way the loop stops).
            if (plateRetries >= MAX_PLATE_RETRIES) return;
            plateRetries += 1;
            rafHandle = requestAnimationFrame(observeFirstPlate);
            return;
        }
        // a plate resolved — reset the retry budget (the rAF loop has settled).
        plateRetries = 0;
        rafHandle = null;
        stopView?.();
        // The entrance law owns when "arrived" is: in view for the dwell, after any deep link landed.
        stopView = observeFirstView(plate, () => {
            stopView = null;
            lift(plate);
        });
    }

    onMounted(observeFirstPlate);
    onBeforeUnmount(() => {
        stopView?.();
        stopView = null;
        if (liftTimer) clearTimeout(liftTimer);
        // cancel any pending plate-resolve retry frame (the bounded one-shot rAF, C43).
        if (rafHandle !== null) cancelAnimationFrame(rafHandle);
        rafHandle = null;
    });
}
