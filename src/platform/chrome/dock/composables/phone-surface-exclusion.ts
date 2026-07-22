// phone-surface-exclusion.ts — THE CONTINUOUS PHONE SHEET↔DRAWER EXCLUSIVITY (C4 · W-MEMBRANE ·
// E24-TRIUMVIRATE-ADJUDICATION-C2 §6.6 · UX-A11Y U5 · state-integrity S5). A pure resolver the dock
// consumes to guarantee a SINGLE viewport owner at every frame — the `resolveDockCollapse` pattern.
//
// ── WHY A CONTINUOUS RESOLVER, NOT TWO TERMINAL WATCHERS ──────────────────────────────────────────
// On phone the crest-tap SHEET (+ its scrim) and the filter DRAWER (body-teleported UNDER the dock)
// must never CO-OCCUPY the viewport at ANY frame — not merely at settle. The E24 arbiter was two
// default-flush watchers (open one ⇒ close the other) that made the ENDPOINT booleans exclusive but
// left the OUTGOING scrim a fixed, full-viewport, pointer-active element for its 200ms (120ms PRM)
// leave clock. During a drawer's open transition the sheet has not yet collapsed, so BOTH flags are
// briefly true and a pointer caught by the leaving scrim blocks the emerging drawer while the scrim's
// own click handler no-ops (U5). Eventual boolean exclusivity ≠ a no-co-occupancy invariant.
//
// This resolver is given the two open flags plus which surface was MOST RECENTLY activated (the
// crossfade tie-break) and names, for THIS frame: the single viewport owner, whether the scrim owns
// hit-testing, and which surface is subordinated (aria-hidden / non-focusable). It decides STATE + hit
// ownership ONLY; it chooses NO phone FORM — the dial-13 posture (top sheet, bottom dock, safe frame,
// …) stays owner-held. The invariant holds whichever form the owner later picks.

/** The phone surfaces that contend for the viewport. `none` ⇒ neither is open. */
export type PhoneSurface = "sheet" | "drawer" | "none";

export interface PhoneSurfaceState {
    /** the crest-tap sheet is open (its scrim veils the page). */
    sheetOpen: boolean;
    /** the filter drawer is open (body-teleported under the dock). */
    drawerOpen: boolean;
    /** the most-recently ACTIVATED surface — the crossfade tie-break when both are momentarily open.
        `none` before either has ever opened. */
    lastActivated: PhoneSurface;
}

export interface PhoneExclusion {
    /** the ONE surface that owns the viewport this frame — never two at once. */
    owner: PhoneSurface;
    /** the scrim owns hit-testing ONLY while the SHEET owns the viewport; a yielding/leaving scrim
        (a drawer incoming) is hit-inert so it can never intercept the emerging drawer. */
    scrimOwnsHit: boolean;
    /** the sheet is subordinated (aria-hidden / non-focusable) whenever it does not own the viewport. */
    sheetSubordinated: boolean;
    /** the drawer is subordinated whenever it does not own the viewport. */
    drawerSubordinated: boolean;
}

/**
 * Resolve the single viewport owner + hit ownership for a phone frame. When both surfaces are
 * momentarily open (a crossfade), the LAST-ACTIVATED surface wins — so the just-opened surface owns
 * the viewport and the outgoing one yields. With no recency yet (`none`), the drawer wins the tie: the
 * drawer opens from a trigger that subordinates the sheet, so the drawer is always the incoming
 * surface in a both-open-from-cold edge.
 */
export function resolvePhoneExclusion(state: PhoneSurfaceState): PhoneExclusion {
    const { sheetOpen, drawerOpen, lastActivated } = state;
    const owner: PhoneSurface =
        sheetOpen && drawerOpen
            ? lastActivated === "none"
                ? "drawer"
                : lastActivated
            : sheetOpen
              ? "sheet"
              : drawerOpen
                ? "drawer"
                : "none";
    return {
        owner,
        scrimOwnsHit: owner === "sheet",
        sheetSubordinated: owner !== "sheet",
        drawerSubordinated: owner !== "drawer",
    };
}
