// platform/charts/composables/useCardPlacement.ts — the HoverCard PLACEMENT geometry (I-ARCH.AR-8 ·
// the HoverCard sub-form). HoverCard is the ONE platform-owned entity card — not an ECharts-option
// plate and not N readout layouts (the payload renders through ONE uniform projection), so its §Y
// discharge is the PLACEMENT math: the viewport-clamp + the right-peek mobile dock + the compare-
// rail seat, lifted out of the SFC into this pure geometry module. The host shrinks to "read the
// readout store + apply the placement + render the projection".
//
// THE PURE CORE — no Vue refs, no DOM, no side-effects. Each function takes the anchor + footprint +
// viewport scalars and returns the clamped {left, top}; the SFC threads the live window/anchor in.
// The rendered card position stays byte-identical (the same inputs yield the same px). The viewport-
// clamp law lives ONCE here, so the transient card, the single pin, and the rail all read one seam.

/** A measured viewport anchor (the hovered datum's screen point) or null (no settled geometry). */
export interface Anchor {
    x: number;
    y: number;
}

/** The card's measured footprint (width/height) — never a magic 280 (H-5/B2). */
export interface Footprint {
    w: number;
    h: number;
}

/** The viewport box the card is clamped within. */
export interface Viewport {
    vw: number;
    vh: number;
}

/** The placement constants (the rail geometry — the §2.4 COMPARE register). */
export const CARD_PAD = 16;
export const RAIL_PAD = 16;
export const RAIL_TOP = 96; // below the chrome dock — the rail starts under the masthead
export const RAIL_CARD_STRIDE = 8; // the gap between stacked rail cards

/** The TRANSIENT card seat — clamped off the MEASURED footprint so `x + pad + w ≤ vw − pad`, top
    likewise. The card hugs the hovered DATUM (the desktop pointer register), viewport-clamped.

    J-MOBILE §3 — the mobile `tapPeek` RIGHT-MARGIN fork is REMOVED. The coarse-pointer phone
    register's readout is the platform `ReadoutSheet` bottom-sheet (the ONE thumb-reach answer),
    NOT a right-margin peek; HoverCard already suppresses its transient card on that register
    (`!tapPeek.value`), so this seat math is the desktop-pointer path ONLY — the dead right-margin
    branch is retired and the reach idiom has a single home. */
export function transientSeat(
    anchor: Anchor,
    footprint: Footprint,
    viewport: Viewport,
): { left: number; top: number } {
    const { vw, vh } = viewport;
    const left = Math.max(
        CARD_PAD,
        Math.min(anchor.x + CARD_PAD, vw - footprint.w - CARD_PAD),
    );
    const top = Math.max(
        CARD_PAD,
        Math.min(anchor.y + CARD_PAD, vh - footprint.h - CARD_PAD),
    );
    return { left, top };
}

/** A SINGLE pin seats at its datum ANCHOR (the same law as the transient card), clamped on-screen. */
export function pinAnchorSeat(
    anchor: Anchor,
    footprint: Footprint,
    viewport: Viewport,
): { left: number; top: number } {
    const { vw, vh } = viewport;
    const left = Math.max(
        RAIL_PAD,
        Math.min(anchor.x + RAIL_PAD, vw - footprint.w - RAIL_PAD),
    );
    const top = Math.max(
        RAIL_PAD,
        Math.min(anchor.y + RAIL_PAD, vh - footprint.h - RAIL_PAD),
    );
    return { left, top };
}

/** 2–3 pins dock to the right-margin COMPARE RAIL, flowed top-aligned in pin order — each right-
    pinned + stacked via a `top` offset sized from the measured stride, so the rail reads as one
    ledger column. */
export function railSeat(
    index: number,
    footprint: Footprint,
    viewport: Viewport,
): { left: number; top: number } {
    const left = Math.max(RAIL_PAD, viewport.vw - footprint.w - RAIL_PAD);
    const top = RAIL_TOP + index * (footprint.h + RAIL_CARD_STRIDE);
    return { left, top };
}
