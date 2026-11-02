// interaction/useCardPlacement.ts — the HoverCard PLACEMENT geometry (I-ARCH.AR-8 ·
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

/** A viewport box the card keeps clear of (a fixed dock, a rail). A `DOMRect` satisfies it. */
export interface Rect {
    left: number;
    top: number;
    right: number;
    bottom: number;
}

/** The TRANSIENT card seat — clamped off the MEASURED footprint so `x + pad + w ≤ vw − pad`, top
    likewise. The card hugs the hovered DATUM (the desktop pointer register), viewport-clamped.

    J-MOBILE §3 — the mobile `tapPeek` RIGHT-MARGIN fork is REMOVED. The coarse-pointer phone
    register's readout is the platform `EntityDetail` bottom-sheet (the ONE thumb-reach answer),
    NOT a right-margin peek; HoverCard already suppresses its transient card on that register
    (`!tapPeek.value`), so this seat math is the desktop-pointer path ONLY — the dead right-margin
    branch is retired and the reach idiom has a single home.

    U/B8 A5 — the card FLIPS to the far side of the anchor on each axis when the near side would
    cross the viewport edge and the far side has room, so the clamp never slides it back over the
    anchor and its mark. `avoid` (a fixed dock) is a box the seat stays clear of when a corner can.

    `pointer` is the live pointer (null for a keyboard or deep-link selection): the seat never covers
    it (U/B7c L · F-14). */
export function transientSeat(
    anchor: Anchor,
    footprint: Footprint,
    viewport: Viewport,
    pointer: Anchor | null = null,
    avoid: Rect | null = null,
): { left: number; top: number } {
    const { vw, vh } = viewport;
    const { w, h } = footprint;
    const clampX = (x: number) => Math.max(CARD_PAD, Math.min(x, vw - w - CARD_PAD));
    const clampY = (y: number) => Math.max(CARD_PAD, Math.min(y, vh - h - CARD_PAD));
    const right = anchor.x + CARD_PAD;
    const left = anchor.x - CARD_PAD - w;
    const below = anchor.y + CARD_PAD;
    const above = anchor.y - CARD_PAD - h;
    // The near side (right, below) unless it crosses the far edge and the other side fits.
    const flipX = right + w > vw - CARD_PAD && left >= CARD_PAD;
    const flipY = below + h > vh - CARD_PAD && above >= CARD_PAD;
    const [x0, x1] = (flipX ? [left, right] : [right, left]).map(clampX) as [number, number];
    const [y0, y1] = (flipY ? [above, below] : [below, above]).map(clampY) as [number, number];
    // The corners round the anchor, the preferred one first; the first that leaves the live pointer
    // and the avoid-rect clear wins. A card under the pointer eats the next click on the mark (F-14),
    // so the pointer outranks the avoid-rect when no corner clears both.
    const seats = [
        { left: x0, top: y0 },
        { left: x1, top: y0 },
        { left: x0, top: y1 },
        { left: x1, top: y1 },
    ];
    const clearOfPointer = (s: { left: number; top: number }) =>
        !pointer || pointer.x < s.left || pointer.x > s.left + w || pointer.y < s.top || pointer.y > s.top + h;
    const clearOfAvoid = (s: { left: number; top: number }) =>
        !avoid || s.left >= avoid.right || s.left + w <= avoid.left || s.top >= avoid.bottom || s.top + h <= avoid.top;
    return (
        seats.find((s) => clearOfPointer(s) && clearOfAvoid(s)) ?? seats.find(clearOfPointer) ?? seats[0]!
    );
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
