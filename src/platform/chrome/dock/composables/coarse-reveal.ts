// coarse-reveal.ts — THE WIDE-COARSE REVEAL SEMANTICS (W-MEMBRANE · E24-TRIUMVIRATE-ADJUDICATION-C2
// §6.6 · UX-A11Y U4 · state-integrity S8). A pure, event-string-free decision the dock's bloom
// listeners consume, unit-provable in isolation (the `resolveDockCollapse` sibling pattern).
//
// ── WHY CAPABILITY, NOT A SINGLE EVENT STRING ─────────────────────────────────────────────────────
// The collapsed-rest rail blooms on intent. On a HOVER-CAPABLE pointer (a mouse on a device that can
// hover) the bloom is a TRANSIENT hover-reveal: its `pointerleave` IS a hover departure, so the rail
// re-collapses. On a GESTURE pointer there is no transient hover — a "leave" is the tap/stroke ENDING,
// not a hover departure — so releasing on it re-collapses the rail mid-gesture and the follow-up
// gesture hit-tests the collapsed disc behind it (the F9/U4 second-action race). A gesture pointer is:
//   • any `touch` pointer (a tap never hovers, even on hover-capable hybrid hardware); OR
//   • any `pen` pointer on a no-hover surface (a no-hover stylus); OR
//   • ANY pointer on a device that cannot hover (`(hover: none)`).
// The E24 scaffolding special-cased ONLY `pointerType === "touch"`, so a no-hover STYLUS
// (`pointerType === "pen"`) still released on leave and recreated the race (U4 ¶2). This module keys
// the decision off the hover CAPABILITY together with the pointer kind — never one raw event string.

/** The reveal's release model for a given pointer + device hover capability. */
export type PointerRevealModel = "hover-transient" | "gesture-persistent";

/**
 * Classify a reveal. Only a `mouse` on a hover-capable device produces a genuine transient hover; a
 * `touch`/`pen` pointer, or ANY pointer on a no-hover device, is a persistent gesture reveal.
 *
 * @param pointerType the `PointerEvent.pointerType` that created (or is dismissing) the reveal.
 * @param canHover the device hover capability — `!(hover: none)` (from `useMobileRegister().isNoHover`).
 */
export function pointerRevealModel(
    pointerType: string,
    canHover: boolean,
): PointerRevealModel {
    return pointerType === "mouse" && canHover
        ? "hover-transient"
        : "gesture-persistent";
}

/** Does a `pointerleave` RELEASE the bloom? Only a hover-transient reveal — a gesture reveal PERSISTS
    (its leave is the gesture ending). This is the pen re-collapse cure (U4/S8): a pen leave no longer
    releases. */
export function revealReleasesOnLeave(pointerType: string, canHover: boolean): boolean {
    return pointerRevealModel(pointerType, canHover) === "hover-transient";
}

/** Does the reveal PERSIST past its opening gesture (so an OUTSIDE pointerdown, a `pointercancel`, or a
    `lostpointercapture` is what dismisses it)? True for every gesture pointer — touch OR pen, or any
    pointer on a no-hover device — and false for a hover-transient mouse (which already released on
    leave, so it has nothing left to dismiss). The outside/cancel arms gate on THIS, never on a
    touch-only string, so a pen reveal is dismissed deterministically and without a timer (S8). */
export function revealPersists(pointerType: string, canHover: boolean): boolean {
    return pointerRevealModel(pointerType, canHover) === "gesture-persistent";
}
