// platform/charts/mark-tokens.ts — the Phase-A mark-family motion knobs I-MARK OWNS (I-MARK.d ·
// GAP-3 · the §U "continuously-animated option once drawn").
//
// The handmark engine HAS a boil clock (the pencil-boil draw-then-boil — the living line that
// settles into a gentle continuous wobble after it draws on), but every atlas consumer has
// FORBIDDEN it (the `AnimatedRule` frame-guard, "THE BOIL STAYS FORBIDDEN" — correct for a
// STRUCTURAL rule, applied universally). §U asks for exactly ONE living line: a narrow, budgeted
// boil on the route's HERO mark only (the one masthead pick-out word OR the one signature figure
// mark). This module is that budget — a single Phase-A constant co-located with the mark family.
//
// OWNERSHIP (the inverse fold, harden-mark.md GAP-MARK-2): I-MARK authors `BOIL_BUDGET` HERE in
// Phase A because I7's `motion-budget.ts` is Phase C and does not exist yet — a Phase-A read of it
// would dangle. I7 LATER ABSORBS this knob into its `MOTION_BUDGET` table (DESIGN §4.9 already
// owns "the one budgeted hero boil" policy + the `--scroll-motion-budget` token); when it does,
// this constant becomes the seam I7 folds, not a second source of truth. Until then it lives here,
// next to `HandUnderline`/`HandHighlight`/`AnimatedRule`, the consumers it governs.

/**
 * The Phase-A boil allowance: at most ONE `animation="draw-then-boil"` mark may continuously boil
 * per route (the hero mark — the masthead pick-out word OR the one signature figure mark). Every
 * other mark stays static-once-drawn: every structural rule and every scroll-clock underline keeps
 * the pencil-boil frame-guard (`frameCount <= 1`, zero rAF at rest), the E1/E4 root law.
 *
 * The cost of the one sanctioned boil is bounded by construction — the singleton pencil-boil
 * scheduler folds it into ONE shared rAF callback (tab-visibility-paused, PRM-gated,
 * self-withdrawing when the frame count collapses). The boil-budget GATE counts `data-boil` MOUNT
 * INTENT per route (≤ BOIL_BUDGET); the true rAF-subscriber count is the A-7 BB carry (a read-only
 * active-subscriber ref on the scheduler the ask-brief books).
 *
 * I7 absorbs this into `MOTION_BUDGET` later (the inverse ownership); do NOT read a Phase-C
 * `motion-budget.ts` from a Phase-A consumer — read THIS constant.
 */
export const BOIL_BUDGET = 1;

/**
 * THE CONSTANT viewBox HULL WEIGHT (K-HANDMARK · the blob fix). The highlighter rung's
 * `ribbon:"hull"` band rests at a FIXED 22 VB-y units of the engine's 40-tall
 * `viewBox="0 0 100 40"` — half-width 11 centred at the VB-y-20 midline spans ≈9→31, a band
 * ≈ 0.55 of the line box (under the `k-handmark-hull` `≤ 0.7` blob guard). It is the ONE rung that
 * is CONSTANT-VB: the stroke rungs (pen/pencil/crayon/marker) stay font-proportional px.
 *
 * It is NEVER the `weight:40` diameter the old `HandHighlight` override carried (read as a
 * full-box smear under the hull — the hull is a `fill`, unshielded by `non-scaling-stroke`, so the
 * weight is a viewBox UNIT, not a screen-px band — `K-FRAMEWORK §3`) and NEVER a width-derived
 * strip (NON-LINEAR in word width, mis-sizing a wrapping clause). The `k-handmark-hull.gate` reads
 * THIS constant for its band ceiling, never a literal `22` baked into the gate (the
 * `j-handmark-boil.gate` "STRUCTURE, not a magic integer" discipline).
 */
export const HIGHLIGHT_WEIGHT_VB = 22;
