// platform/interaction/keyboard.ts — THE KEYBOARD LAYER (N.WD1 · §4.D1.5 — opt-in per figure).
//
// Distinct from the READING default (ChartDataTable's `role=img` + off-screen table stays untouched),
// additive to it: the OPERATING path is opt-in, ONE tab stop (`role=application`). A figure declares a
// `KeyboardNavSpec<D>` over its mark set; the pure `keyStep()` folds a key press into { the next nav
// state, an intent }. The intents are the SAME union the pointer machine emits — arrows emit
// `inspect`, Enter emits `pin` — on the SAME store verbs (the unification thesis: `End → Enter →
// ArrowLeft` produces byte-identical treatment to a mouse click). This module owns ZERO DOM: the .vue
// adapter binds one keydown handler, folds `keyStep`, and dispatches onto the store + moves the focus
// rim. Keys are FIXED per archetype (no per-figure rebinding — one muscle memory across the suite).

/** The archetypes that share the rank-order walk vs the spatial walk. `scatter`/`strip`/`treemap`
    walk their `order()` (rank order) with a nearest cross-axis; `timeseries` steps the year /
    switches series; `geo`/`hexmap` walk nearest-centroid in the arrow's half-plane. */
export type NavArchetype = "scatter" | "strip" | "treemap" | "timeseries" | "geo" | "hexmap";

/** A figure's keyboard navigation contract over its data marks `D`. The figure supplies the ordered
    mark list + the key/label/anchor projections; `cross` (optional) resolves the nearest cross-axis
    neighbour for the perpendicular arrows (a scatter's y-walk, a geo's half-plane step). */
export interface KeyboardNavSpec<D> {
    /** The archetype — FIXES the key map (no per-figure rebinding). */
    archetype: NavArchetype;
    /** The ordered mark list the primary arrows walk (rank order for scatter/strip/treemap). */
    order(): readonly D[];
    /** The stable selection key of a mark (the `{kind}:{id}` codec the store equates). */
    keyOf(d: D): string;
    /** The read-aloud label of a mark (the aria-live sentence + the rim caption read it). */
    labelOf(d: D): string;
    /** The mark's viewport anchor — where the focus rim seats (scrolled into view on every move). */
    anchorOf(d: D): { x: number; y: number };
    /** The nearest cross-axis neighbour for the perpendicular arrows (optional; omit ⇒ no cross-walk). */
    cross?(d: D, dir: "prev" | "next"): D | null;
}

/** The keyboard nav state — the focused index into `order()` + whether the figure's nav is engaged
    (the ONE tab stop is focused). `index === -1` is "no mark focused yet" (a fresh focus). */
export interface NavState {
    /** The focused mark's index into `order()`, or -1 before the first move. */
    index: number;
    /** True while the figure's application-mode nav is engaged (the first Esc exits it). */
    engaged: boolean;
}

/** The rest nav state. */
export function initialNavState(): NavState {
    return { index: -1, engaged: false };
}

/** The keyboard intent — the SAME sinks the pointer machine emits, PLUS the two-rung Esc ladder.
    `inspect`/`pin` land on the selection sink (byte-identical to a pointer inspect/pin); `exit` is
    the FIRST Esc (leaves nav, consumed, focus restored by the adapter); `clear` is the SECOND Esc
    (rides the existing global clear); `none` is an unhandled key (the adapter lets it bubble). */
export type KeyIntent =
    | { verb: "inspect"; key: string }
    | { verb: "pin"; key: string; additive: boolean }
    | { verb: "exit" }
    | { verb: "clear" }
    | { verb: "none" };

/** The `keyStep` result — the next nav state + the intent + the focused mark (for the rim + aria-live). */
export interface KeyStepResult<D> {
    state: NavState;
    intent: KeyIntent;
    /** The mark the rim should seat on after this step (null when nav is not on a mark). */
    focused: D | null;
}

/** A DOM-agnostic key descriptor (the adapter maps a KeyboardEvent onto it). */
export interface KeyInput {
    /** The `KeyboardEvent.key` value (`"ArrowRight"`, `"Enter"`, `"Home"`, `"Escape"`, …). */
    key: string;
    /** The Shift modifier (Shift+Enter = additive pin). */
    shift: boolean;
}

/** Clamp an index into `[0, n-1]`, treating -1 (fresh) as "before 0". */
function clampIndex(i: number, n: number): number {
    if (n === 0) return -1;
    if (i < 0) return 0;
    if (i >= n) return n - 1;
    return i;
}

/**
 * `keyStep` — PURE + TOTAL. Fold one key press over a figure's nav, returning the next nav state, the
 * intent to dispatch, and the newly-focused mark (for the rim + the aria-live sentence). Keys are
 * FIXED per archetype:
 *   · the PRIMARY walk (ArrowRight/Down = next, ArrowLeft/Up = prev) advances through `order()`, each
 *     step emitting `inspect` (the unification: an arrow IS a pointer inspect on the same verb);
 *   · Home/End jump to the extremes (also `inspect`);
 *   · the CROSS walk (the perpendicular arrows) uses `spec.cross` when declared (else falls through
 *     to the primary walk so a figure without a cross-axis still moves);
 *   · Enter pins the focused mark, Shift+Enter pins additively (byte-identical to a mouse pin);
 *   · the ESC LADDER — the FIRST Esc (nav engaged) exits nav (consumed); a SECOND Esc (nav already
 *     exited) rides the global clear.
 * Never mutates its inputs; no DOM; deterministic.
 */
export function keyStep<D>(spec: KeyboardNavSpec<D>, s: NavState, e: KeyInput): KeyStepResult<D> {
    const marks = spec.order();
    const n = marks.length;

    // The primary axis differs by archetype: a strip/treemap/geo reads vertically (Up/Down primary),
    // a scatter/timeseries reads horizontally (Left/Right primary). Both accept either pair; the
    // "cross" pair routes through `spec.cross` when present.
    const horizontalPrimary =
        spec.archetype === "scatter" || spec.archetype === "timeseries" || spec.archetype === "hexmap";
    const nextKeys = horizontalPrimary ? ["ArrowRight"] : ["ArrowDown"];
    const prevKeys = horizontalPrimary ? ["ArrowLeft"] : ["ArrowUp"];
    const crossNextKeys = horizontalPrimary ? ["ArrowDown"] : ["ArrowRight"];
    const crossPrevKeys = horizontalPrimary ? ["ArrowUp"] : ["ArrowLeft"];

    const focusAt = (i: number): KeyStepResult<D> => {
        const idx = clampIndex(i, n);
        const mark = idx >= 0 ? marks[idx] : null;
        return {
            state: { index: idx, engaged: true },
            intent: mark ? { verb: "inspect", key: spec.keyOf(mark) } : { verb: "none" },
            focused: mark,
        };
    };

    // The Esc ladder — engaged ⇒ exit nav (consumed); disengaged ⇒ ride the global clear.
    if (e.key === "Escape") {
        if (s.engaged) {
            return { state: { index: s.index, engaged: false }, intent: { verb: "exit" }, focused: null };
        }
        return { state: s, intent: { verb: "clear" }, focused: null };
    }

    // A fresh key press on an un-engaged / index-less nav lands on the first mark (or End's last).
    const cur = s.index;

    if (nextKeys.includes(e.key)) return focusAt(cur < 0 ? 0 : cur + 1);
    if (prevKeys.includes(e.key)) return focusAt(cur < 0 ? 0 : cur - 1);
    if (e.key === "Home") return focusAt(0);
    if (e.key === "End") return focusAt(n - 1);

    // The cross walk — declared `cross` resolves the neighbour; else fall through to the primary walk.
    if (crossNextKeys.includes(e.key) || crossPrevKeys.includes(e.key)) {
        const dir: "prev" | "next" = crossNextKeys.includes(e.key) ? "next" : "prev";
        if (spec.cross && cur >= 0 && cur < n) {
            const neighbour = spec.cross(marks[cur], dir);
            if (neighbour) {
                const ni = marks.findIndex((m) => spec.keyOf(m) === spec.keyOf(neighbour));
                if (ni >= 0) return focusAt(ni);
            }
            // A declared cross with no neighbour in this direction is a no-op (hold focus, consume).
            return { state: { ...s, engaged: true }, intent: { verb: "none" }, focused: cur >= 0 ? marks[cur] : null };
        }
        return focusAt(cur < 0 ? 0 : dir === "next" ? cur + 1 : cur - 1);
    }

    if (e.key === "Enter") {
        if (cur >= 0 && cur < n) {
            return {
                state: { index: cur, engaged: true },
                intent: { verb: "pin", key: spec.keyOf(marks[cur]), additive: e.shift },
                focused: marks[cur],
            };
        }
        return { state: { ...s, engaged: true }, intent: { verb: "none" }, focused: null };
    }

    // An unhandled key — let it bubble (the adapter does not consume it).
    return { state: s, intent: { verb: "none" }, focused: cur >= 0 && cur < n ? marks[cur] : null };
}

/**
 * `ariaLiveSentence` — serialize the focused readout Fact[] into ONE polite-region sentence, from the
 * SAME `Fact[]` the HoverCard renders (one source, no drift). The label leads; each fact reads as
 * "`<label>` `<value>`"; the parts join with " · " and end with a period (the read-aloud cadence).
 */
export function ariaLiveSentence(
    label: string,
    facts: readonly { label: string; value: string }[],
): string {
    const body = facts.map((f) => `${f.label} ${f.value}`).join(" · ");
    return body ? `${label}. ${body}.` : `${label}.`;
}
