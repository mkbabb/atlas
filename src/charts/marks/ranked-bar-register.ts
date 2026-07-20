// charts/marks/ranked-bar-register.ts — A-04(b): the RankedBar LABEL REGISTER, as arithmetic.
//
// The floor is POLICY, so it is a pure function of the mark's OWN measured box (never the
// viewport, never a consumer option) and is tested as arithmetic beside the other two A-04
// predicates (`endLabelGutterCollapsed`, `cellFloorScale`). The mark imports it; nothing about a
// dashboard reaches it.
//
// THE ORDERING (DOGFOOD §3.4, "labels wrap before the track collapses") — and the two things the
// first cut of it got wrong:
//
//   1. A box too narrow for the desktop shape has ONE inset that is dead weight: the wide right
//      gutter exists for the value run and nothing else. Reserving the run the mark actually
//      COUNTS (the face is set in the mono voice, so its width is countable rather than measured —
//      a ruler would race the webfont's load) buys the name column back the pixels the track floor
//      is otherwise taking from it.
//   2. A wrapped name must be BOUNDED BY ITS ROW BAND. Unbounded wrapping is illegible twice over:
//      the blocks overprint, and ECharts then silently drops the labels that would collide, so a
//      row loses its identity altogether. Capping the block at the whole lines the band holds makes
//      both impossible — which is what lets the mark ask for every name (`interval: 0`).
//
// At or above `barDesktopMinPx()` NOTHING here fires: the register is the declared desktop shape,
// field for field, so a wide box (and an unmeasured one) renders byte-identically to the shape
// this file was introduced beside.

/** The plot px a bar needs for LENGTH to read as a magnitude (the whale AND the tail). */
export const BAR_TRACK_FLOOR_PX = 140;
/** The name gutter's ceiling — the desktop budget (every wide box renders byte-unchanged). */
export const BAR_LABEL_MAX_PX = 168;
/** The narrowest name column that still names a row (past it the column stops yielding). */
export const BAR_LABEL_MIN_PX = 56;
/** The row-name line box — 12px Newsreader set in a 15px line (the wrap's vertical unit). */
export const BAR_LABEL_LINE_PX = 15;
/** The value run's own type size, and the monospaced advance that makes its face countable. */
export const VALUE_FACE_PX = 11;
export const MONO_ADVANCE_EM = 0.6;
/** The value run's breathing room past its counted face (ECharts' 5px label distance + a hair). */
export const VALUE_RUN_PAD_PX = 6;
/** The squeezed name↔axis gap; the desktop 8 is a pixel-pair the track floor cannot afford. */
export const NARROW_LABEL_MARGIN_PX = 4;

/** What the mark reserves out of its measured box. */
export interface RankedBarRegister {
    /** False ⇒ the declared desktop shape, field for field (also the unmeasured/SSR case). */
    narrow: boolean;
    /** The right inset: the desktop gutter, or the value run the mark counts. */
    valueGutter: number;
    /** The name column's width. */
    labelWidth: number;
    /** Whole name lines the row band can hold — the wrap's hard cap. */
    maxLines: number;
    /** True when the band affords a line with clearance, so every name may be drawn. */
    nameEveryRow: boolean;
}

/** The box that affords the desktop name ceiling AND the track floor inside the declared insets. */
export function barDesktopMinPx(gridLeft: number, gridRight: number): number {
    return gridLeft + gridRight + BAR_LABEL_MAX_PX + BAR_TRACK_FLOOR_PX;
}

/** The px the value run needs: its longest face, counted in the mono advance, plus the gap. */
export function valueRunPx(longestFaceChars: number): number {
    return longestFaceChars > 0
        ? Math.ceil(longestFaceChars * MONO_ADVANCE_EM * VALUE_FACE_PX) +
              VALUE_RUN_PAD_PX
        : 0;
}

/**
 * The register a box affords.
 *
 * @param hostWidth   the mark's own measured width (0 before the first measure ⇒ desktop shape)
 * @param hostHeight  the mark's own measured height (the row band's source)
 * @param rowCount    the drawn rows (the budgeted set, residual included)
 * @param longestFaceChars  characters in the longest value face; 0 when no `valueLabel` is bound
 * @param grid        the mark's declared insets
 */
export function rankedBarRegister(
    hostWidth: number,
    hostHeight: number,
    rowCount: number,
    longestFaceChars: number,
    grid: { left: number; right: number; top: number; bottom: number },
): RankedBarRegister {
    if (!hostWidth || hostWidth >= barDesktopMinPx(grid.left, grid.right)) {
        return {
            narrow: false,
            valueGutter: grid.right,
            labelWidth: BAR_LABEL_MAX_PX,
            maxLines: 1,
            nameEveryRow: false,
        };
    }
    const valueGutter = Math.min(grid.right, valueRunPx(longestFaceChars));
    // The TRACK is reserved first; the name column takes what the reclaimed gutter leaves it, and
    // stops yielding at the floor below which a column no longer names anything.
    const labelWidth = Math.round(
        Math.min(
            BAR_LABEL_MAX_PX,
            Math.max(
                BAR_LABEL_MIN_PX,
                hostWidth -
                    grid.left -
                    valueGutter -
                    NARROW_LABEL_MARGIN_PX -
                    BAR_TRACK_FLOOR_PX,
            ),
        ),
    );
    // The band is the wrap's ceiling: a block that fits it can never reach a neighbour's row. A
    // band too shallow for even one line keeps ECharts' own thinning — dropping a name is honest
    // where overprinting one is not.
    const band =
        (hostHeight - grid.top - grid.bottom) / Math.max(1, rowCount);
    return {
        narrow: true,
        valueGutter,
        labelWidth,
        maxLines: Math.max(1, Math.floor((band - 4) / BAR_LABEL_LINE_PX)),
        nameEveryRow: band >= BAR_LABEL_LINE_PX + 4,
    };
}
