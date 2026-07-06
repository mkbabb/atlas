// platform/interaction/pointer-machine.ts — THE INTENT BUS (N.WD1 · §4.D1.4 — a pure `step()`).
//
// Touch + mouse are DRIVERS of the shipped store verbs — never a parallel feature layer. The 5-state
// pointer machine is a typed PURE reducer: `step(state, event) → { state, intents }`, where every
// intent lands on ONE of TWO named sinks — (1) selection/readout verbs (inspect/pin/clear/brush) or
// (2) viz-local view-transform state (zoom/pan → dataZoom/roam). Motion drivers read the STATE, not
// the gestures (ruled). This module owns ZERO DOM and ZERO store reach — the .vue adapter maps DOM
// PointerEvents onto `PointerInput`, folds `step`, and dispatches the emitted intents onto the store
// (`tap-same → unpin` RIDES the store's sole-same-clears algebra — never re-implemented here).
//
//   IDLE ─down→ PRESSED ─2nd-down∧pinch→ PINCHING ─move→ zoom
//                       ─2nd-down∧¬pinch→ YIELDED
//               │ move>8px ∧ touch ∧ ¬armed → YIELDED (scroll)
//               │ move>8px ∧ (armed ∨ mouse-brush) → DRAGGING → brush
//               │ tick ≥500ms ∧ <8px ∧ touch → pin{additive}+bloom (stay; longFired)
//               │ up <8px ∧ ¬longFired → TAP: hit ? pin : clear
//     DRAGGING ─up→ brush{commit:true}   (cancel → NO commit)
//     YIELDED is ABSORBING until every pointer lifts (the anti-scroll-trap invariant)
//
// Constants: SLOP 8px · LONG 500ms fires ON HOLD (release timing never matters; a mouse NEVER
// long-presses) · hit-slop 24px coarse / 12px fine (the .vue adapter resolves the nearest mark).

/** The move threshold (px): under it a press is a TAP / long-press candidate; over it, a drag/scroll. */
export const SLOP = 8;
/** The long-press dwell (ms): a held touch inside the slop fires a pin ON HOLD (release never matters). */
export const LONG_MS = 500;
/** The coarse-pointer effective hit radius (px) — the .vue adapter's nearest-mark resolution. */
export const HIT_SLOP_COARSE = 24;
/** The fine-pointer effective hit radius (px). */
export const HIT_SLOP_FINE = 12;

/** The five machine phases. YIELDED is ABSORBING (the anti-scroll-trap): once a gesture yields to the
    browser (native scroll / a non-pinch multi-touch) it stays yielded until every pointer lifts. */
export type PointerPhase = "IDLE" | "PRESSED" | "PINCHING" | "YIELDED" | "DRAGGING";

/** The pointer kind — a fine (mouse/pen) pointer may brush without arming; a coarse (touch) pointer
    yields to native scroll unless the brush dial is explicitly ARMED. */
export type PointerKind = "mouse" | "pen" | "touch";

/** One live pointer's identity + current position. */
export interface Pointer {
    id: number;
    x: number;
    y: number;
}

/** The machine state — SERIALIZABLE (the .vue adapter holds one instance per plate). `armed` is the
    explicit, visible brush dial (never inferred); `longFired` guards a tap after a long-press pinned. */
export interface PointerState {
    phase: PointerPhase;
    /** The live pointers, in first-down order. */
    pointers: Pointer[];
    /** The first-down anchor (slop is measured from it); null at rest. */
    origin: { x: number; y: number } | null;
    /** The first-down timestamp (ms) — the long-press clock reads it; 0 at rest. */
    startedAt: number;
    /** The pointer kind of the first-down (the desktop degrade rides the same machine). */
    kind: PointerKind;
    /** True once the long-press pin fired this gesture — suppresses the release-time TAP. */
    longFired: boolean;
    /** The explicit brush ARMED dial (a visible mode, set by `{type:"arm"}`), persistent across gestures. */
    armed: boolean;
    /** The two-pointer pinch anchor (centroid + spread) captured on the 2nd-down; null otherwise. */
    pinch: { centroid: { x: number; y: number }; spread: number } | null;
    /** The DRAGGING brush rectangle (origin → current), or null. */
    brushRect: { x0: number; y0: number; x1: number; y1: number } | null;
}

/** The rest state — the machine's identity element. */
export function initialPointerState(armed = false): PointerState {
    return {
        phase: "IDLE",
        pointers: [],
        origin: null,
        startedAt: 0,
        kind: "mouse",
        longFired: false,
        armed,
        pinch: null,
        brushRect: null,
    };
}

/** A DOM-agnostic pointer input — the .vue adapter maps a PointerEvent onto one of these. `hit` (on
    `down`) names whether the press landed ON a mark (the adapter's hit-slop nearest resolution ran);
    `t` is a monotonic ms clock; `kind` rides every `down`. `tick` is the long-press timer probe. */
export type PointerInput =
    | { type: "down"; id: number; x: number; y: number; t: number; kind: PointerKind; hit: boolean }
    | { type: "move"; id: number; x: number; y: number; t: number }
    | { type: "up"; id: number; x: number; y: number; t: number }
    | { type: "cancel"; id: number }
    | { type: "tick"; t: number }
    | { type: "arm"; armed: boolean };

/** A brush rectangle in viewport px. */
export interface BrushRect {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
}

/** The intent union — every emitted verb names its SINK. Sink `"selection"` drives the store's
    inspect/pin/clear/brush verbs; sink `"view"` drives the viz-local zoom/pan (dataZoom/roam). The
    two sinks are the whole output surface — the machine touches nothing else. */
export type Intent =
    | { sink: "selection"; verb: "inspect"; hit: boolean }
    | { sink: "selection"; verb: "pin"; additive: boolean }
    | { sink: "selection"; verb: "clear" }
    | { sink: "selection"; verb: "brush"; commit: boolean; rect: BrushRect }
    | { sink: "selection"; verb: "bloom" } // the long-press haptic/visual bloom (rides the pin)
    | { sink: "view"; verb: "zoom"; scale: number; centroid: { x: number; y: number } }
    | { sink: "view"; verb: "pan"; dx: number; dy: number };

/** The reducer result — the next state + the intents to dispatch (order-preserving). */
export interface StepResult {
    state: PointerState;
    intents: Intent[];
}

/** Euclidean distance between two points. */
function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

/** The two-pointer pinch anchor (the real tracker — NOT the prototype single-pointer version):
    the centroid is the midpoint of the two live pointers, the spread their separation. */
function pinchAnchor(ps: readonly Pointer[]): { centroid: { x: number; y: number }; spread: number } {
    const [a, b] = ps;
    return {
        centroid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
        spread: dist(a, b),
    };
}

/** Replace / add a pointer by id (immutably); keeps first-down order. */
function upsert(ps: readonly Pointer[], p: Pointer): Pointer[] {
    const i = ps.findIndex((q) => q.id === p.id);
    if (i === -1) return [...ps, p];
    const next = ps.slice();
    next[i] = p;
    return next;
}

/**
 * `step` — PURE + TOTAL. Fold one `PointerInput` over the machine, returning the next state + the
 * emitted intents. Never mutates its input; deterministic; no DOM, no store, no timers (the `tick`
 * input IS the long-press clock, supplied by the adapter). See the header ASCII for the transition
 * table; the `arm` input is a global dial edit valid in any phase.
 */
export function step(s: PointerState, e: PointerInput): StepResult {
    // The brush ARMED dial is a global edit — it toggles the visible mode without moving the phase.
    if (e.type === "arm") {
        return { state: { ...s, armed: e.armed }, intents: [] };
    }

    // pointercancel is ALWAYS honored — drop the pointer; a DRAGGING cancel commits NOTHING; the
    // gesture collapses to IDLE once the last pointer leaves (else it stays absorbing).
    if (e.type === "cancel") {
        const pointers = s.pointers.filter((p) => p.id !== e.id);
        if (pointers.length === 0) return { state: { ...initialPointerState(s.armed) }, intents: [] };
        return { state: { ...s, pointers }, intents: [] };
    }

    switch (s.phase) {
        case "IDLE": {
            if (e.type === "down") {
                return {
                    state: {
                        ...initialPointerState(s.armed),
                        phase: "PRESSED",
                        pointers: [{ id: e.id, x: e.x, y: e.y }],
                        origin: { x: e.x, y: e.y },
                        startedAt: e.t,
                        kind: e.kind,
                    },
                    intents: [],
                };
            }
            return { state: s, intents: [] };
        }

        case "PRESSED": {
            if (e.type === "down") {
                // A 2nd pointer: a two-finger touch is a PINCH candidate (fine pointers never pinch);
                // any other 2nd-down (or an already-armed brush) YIELDS to the browser.
                const pointers = upsert(s.pointers, { id: e.id, x: e.x, y: e.y });
                if (s.kind === "touch" && !s.armed && pointers.length === 2) {
                    return {
                        state: { ...s, phase: "PINCHING", pointers, pinch: pinchAnchor(pointers) },
                        intents: [],
                    };
                }
                return { state: { ...s, phase: "YIELDED", pointers }, intents: [] };
            }
            if (e.type === "move") {
                const pointers = upsert(s.pointers, { id: e.id, x: e.x, y: e.y });
                const moved = s.origin ? dist(s.origin, { x: e.x, y: e.y }) : 0;
                if (moved <= SLOP) return { state: { ...s, pointers }, intents: [] };
                // Past the slop: a coarse pointer that has not armed the brush YIELDS to native scroll
                // (the anti-scroll-trap); an armed dial OR a fine pointer starts a brush DRAG.
                const mayBrush = s.armed || s.kind !== "touch";
                if (!mayBrush) {
                    return { state: { ...s, phase: "YIELDED", pointers }, intents: [] };
                }
                const rect: BrushRect = {
                    x0: s.origin?.x ?? e.x,
                    y0: s.origin?.y ?? e.y,
                    x1: e.x,
                    y1: e.y,
                };
                return {
                    state: { ...s, phase: "DRAGGING", pointers, brushRect: rect },
                    intents: [{ sink: "selection", verb: "brush", commit: false, rect }],
                };
            }
            if (e.type === "tick") {
                // The long-press fires ON HOLD (a mouse NEVER long-presses): a held touch inside the
                // slop past LONG_MS pins additively + blooms, then STAYS pressed with longFired set
                // (so the release-time TAP is suppressed).
                if (s.kind !== "touch" || s.longFired) return { state: s, intents: [] };
                if (e.t - s.startedAt >= LONG_MS) {
                    return {
                        state: { ...s, longFired: true },
                        intents: [
                            { sink: "selection", verb: "pin", additive: true },
                            { sink: "selection", verb: "bloom" },
                        ],
                    };
                }
                return { state: s, intents: [] };
            }
            if (e.type === "up") {
                const rest = { ...initialPointerState(s.armed) };
                // A long-press already pinned — the release is inert (no double-fire).
                if (s.longFired) return { state: rest, intents: [] };
                const moved = s.origin ? dist(s.origin, { x: e.x, y: e.y }) : 0;
                if (moved > SLOP) return { state: rest, intents: [] };
                // THE TAP: a hit pins (the store's sole-same-clears algebra turns tap-same into unpin,
                // never re-implemented here); a miss clears.
                return {
                    state: rest,
                    intents: [{ sink: "selection", verb: "pin", additive: false }],
                };
            }
            return { state: s, intents: [] };
        }

        case "PINCHING": {
            if (e.type === "move") {
                const pointers = upsert(s.pointers, { id: e.id, x: e.x, y: e.y });
                if (pointers.length < 2 || !s.pinch) {
                    return { state: { ...s, pointers }, intents: [] };
                }
                const now = pinchAnchor(pointers);
                const scale = s.pinch.spread > 0 ? now.spread / s.pinch.spread : 1;
                const dx = now.centroid.x - s.pinch.centroid.x;
                const dy = now.centroid.y - s.pinch.centroid.y;
                return {
                    state: { ...s, pointers },
                    intents: [
                        { sink: "view", verb: "zoom", scale, centroid: now.centroid },
                        { sink: "view", verb: "pan", dx, dy },
                    ],
                };
            }
            if (e.type === "up") {
                const pointers = s.pointers.filter((p) => p.id !== e.id);
                if (pointers.length === 0) return { state: initialPointerState(s.armed), intents: [] };
                // One finger lifted mid-pinch → YIELDED (absorbing) until the other lifts too, so the
                // survivor never snaps back into a stray pan/tap.
                return { state: { ...s, phase: "YIELDED", pointers }, intents: [] };
            }
            if (e.type === "down") {
                return { state: { ...s, pointers: upsert(s.pointers, { id: e.id, x: e.x, y: e.y }) }, intents: [] };
            }
            return { state: s, intents: [] };
        }

        case "DRAGGING": {
            if (e.type === "move") {
                const pointers = upsert(s.pointers, { id: e.id, x: e.x, y: e.y });
                const rect: BrushRect = {
                    x0: s.brushRect?.x0 ?? e.x,
                    y0: s.brushRect?.y0 ?? e.y,
                    x1: e.x,
                    y1: e.y,
                };
                return {
                    state: { ...s, pointers, brushRect: rect },
                    intents: [{ sink: "selection", verb: "brush", commit: false, rect }],
                };
            }
            if (e.type === "up") {
                const rect: BrushRect = s.brushRect ?? { x0: e.x, y0: e.y, x1: e.x, y1: e.y };
                // DRAGGING up COMMITS the brush; a cancel (handled above) commits nothing.
                return {
                    state: initialPointerState(s.armed),
                    intents: [{ sink: "selection", verb: "brush", commit: true, rect }],
                };
            }
            return { state: s, intents: [] };
        }

        case "YIELDED": {
            // ABSORBING: track the lifts, emit nothing, collapse to IDLE only when the last lifts.
            if (e.type === "up") {
                const pointers = s.pointers.filter((p) => p.id !== e.id);
                if (pointers.length === 0) return { state: initialPointerState(s.armed), intents: [] };
                return { state: { ...s, pointers }, intents: [] };
            }
            if (e.type === "down") {
                return { state: { ...s, pointers: upsert(s.pointers, { id: e.id, x: e.x, y: e.y }) }, intents: [] };
            }
            if (e.type === "move") {
                return { state: { ...s, pointers: upsert(s.pointers, { id: e.id, x: e.x, y: e.y }) }, intents: [] };
            }
            return { state: s, intents: [] };
        }
    }
}

/**
 * `touchActionFor` — the CSS half of the intent bus (verified live in the mock DOM): the
 * `touch-action` value the plate host must carry for the current state. Rest = `pan-y pinch-zoom`
 * (native scroll + pinch survive) → a declared/active pinch = `pan-y` → a brush ARMED dial = `none`
 * (while armed ONLY). The dial is explicit + visible; `pointercancel` is always honored upstream.
 */
export function touchActionFor(s: PointerState): "pan-y pinch-zoom" | "pan-y" | "none" {
    if (s.armed) return "none";
    if (s.phase === "PINCHING") return "pan-y";
    return "pan-y pinch-zoom";
}
