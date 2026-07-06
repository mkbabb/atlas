// platform/context/readiness.ts — THE READINESS MACHINE (N.WD1 · §4.D1.2 — a pure derivation).
//
// A viz's DATA phase is a PURE FOLD, never a set flag. `useActiveDashboard` already carries the
// primary source's `{loading, error, feed}`; every SECONDARY loader (the loadDocument seam:
// `sci-schools`, `usf-integrity-figures`) registers its own phase at the hub (`registerSource`).
// The union is closed at THREE — `{loading | error | ready}` — because pre-fetch idle folds into
// loading (the body's `onMounted ensureLoaded` makes idle a one-tick transient; a fourth state buys
// nothing), and the aggregate is a TOTAL ORDER **error ≻ loading ≻ ready**.
//
// THE COMPOSITION LAW (the live-defect cure): `isEmpty()` is evaluated by the HOST ONLY at `ready`.
// A source is `ready` iff its feed has RESOLVED (`resolved:true`) — the load COMPLETED — NOT iff it
// carries rows. So `rows.length === 0` during load reads as `loading` (the skeleton), and a genuine
// designed void reads as `ready ∧ isEmpty` — the two are no longer indistinguishable (the
// VizPlate.vue void/loading conflation, cured structurally: the misread becomes unrepresentable).
//
// NOBODY SETS readiness. This module is a pure, total, DOM-free derivation — unit-testable in
// isolation (the n0-context flip spec drives it against the fixtures below).

/** The closed readiness union — three states, no fourth (pre-fetch idle folds into `loading`). */
export type Readiness = "loading" | "error" | "ready";

/** One source's raw phase — the shape `useActiveDashboard` (and every registered secondary loader)
    exposes. `error` is truthy-when-errored (a message string or a flag); `resolved` is "the feed
    object EXISTS" (the load completed), NOT "the feed has rows" — the distinction the composition
    law rests on (an empty-but-resolved feed is `ready`, an unresolved feed is `loading`). */
export interface SourcePhase {
    /** The load is in flight. */
    loading: boolean;
    /** Truthy when the source errored (a message or a flag); falsy/null when healthy. */
    error: unknown;
    /** The feed has RESOLVED (the load completed) — `false` before the first load lands. NOT a
        row-count signal: an empty-but-loaded feed is `resolved:true` (and folds to `ready`). */
    resolved: boolean;
}

/**
 * `foldReadiness` — PURE + TOTAL. Fold one source's raw phase into its `Readiness`, in the total
 * order **error ≻ loading ≻ ready**: an errored source is `error` regardless of the other flags; a
 * loading OR not-yet-resolved source is `loading` (pre-fetch idle folds in); a resolved, healthy,
 * idle source is `ready`. Deterministic; never mutates its input; no DOM, no store.
 */
export function foldReadiness(p: SourcePhase): Readiness {
    if (p.error) return "error";
    if (p.loading) return "loading";
    if (!p.resolved) return "loading"; // pre-fetch idle folds into loading (the one-tick transient)
    return "ready";
}

/**
 * `aggregateReadiness` — PURE + TOTAL. The union of N source phases under the SAME total order
 * **error ≻ loading ≻ ready**: any error dominates, else any loading dominates, else ready. An
 * empty list is `ready` (a viz that depends on no source is never blocked). Order-independent.
 */
export function aggregateReadiness(phases: readonly Readiness[]): Readiness {
    if (phases.some((p) => p === "error")) return "error";
    if (phases.some((p) => p === "loading")) return "loading";
    return "ready";
}

/** Is this the phase where a host may evaluate `isEmpty()`? EXACTLY `ready` (the composition law:
    a void can only mean "loaded and genuinely empty"). The host's 4-rung ladder reads this. */
export function mayEvaluateEmpty(r: Readiness): boolean {
    return r === "ready";
}

// ─── THE NEGATIVE + POSITIVE CONTROLS (the flip spec drives these) ────────────────────────────

/** CLEAN — a resolved, healthy, idle source folds to `ready`. */
export const READY_PHASE: SourcePhase = { loading: false, error: null, resolved: true };
/** NEG — a source mid-load folds to `loading` (never `ready`, even if a stale feed lingers). */
export const LOADING_PHASE: SourcePhase = { loading: true, error: null, resolved: true };
/** NEG — an unresolved, idle source folds to `loading` (pre-fetch idle, the conflation cure). */
export const IDLE_PHASE: SourcePhase = { loading: false, error: null, resolved: false };
/** NEG — an errored source folds to `error` regardless of loading/resolved. */
export const ERROR_PHASE: SourcePhase = { loading: true, error: "feed 500", resolved: true };
