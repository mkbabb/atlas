// src/lib/dpr.ts — the canvas backing-store ratio (U/B8 A3). Every atlas canvas sizes its backing
// store at the device pixel ratio capped here: past 2 the raster cost keeps growing and the eye sees
// no difference. The unit chart and the constellation backdrop both read this one cap.

/** The backing-store ratio ceiling. */
export const MAX_CANVAS_DPR = 2;

/** `raw` (default the window's ratio) capped at `MAX_CANVAS_DPR`; a missing or non-positive ratio reads 1. */
export function cappedDpr(raw: number = typeof devicePixelRatio === "number" ? devicePixelRatio : 1): number {
    return Math.min(raw > 0 ? raw : 1, MAX_CANVAS_DPR);
}
