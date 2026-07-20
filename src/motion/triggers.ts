// platform/motion/triggers.ts — THE CLOSED MOTION-TRIGGER TAXONOMY (K-ANIM A5 · proto/A5-afford.md §1.1).
//
// The ONE home for the canonical `MotionTrigger` enum. The lean motion director (`motion-director.ts`)
// resolves each trigger to ONE DriverEdge scalar; `LeanPreset.on: readonly MotionTrigger[]` (PLURAL — a
// preset's valid-trigger SET) and `MotionSegment.on: MotionTrigger` (SINGULAR — the ONE driver a segment
// picks) are two arities over this ONE enum, no drift. The enum is closed: an unlisted member fails `tsc`.
// (The old `TRIGGER_SEAM` binding map — a reader-less table pointing at the purged catalog seams — was
// swept in N.WC1; the director owns the resolution now, one DriverEdge per trigger.)
//
// THE DECISION RULE (what drives the animation scalar `t` — resolved in `createDirectorCore`):
//   scroll → the --scroll-tl cover band (reversible, scrubbed)     ← useCoverProgress
//   select → a discrete selection-store edge (an impulse spring)   ← useSelection
//   hover  → a pointer enter/leave edge (an impulse spring)        ← emphasis-policy
//   active → a viewport-centre argmin edge (an impulse spring)     ← activeViz
//   filter → the coordinator change epoch (a one-shot pulse)       ← the filter coordinator
//   load   → a mount-once one-shot                                 ← NumericAnimation
//   pin    → the pinned stage's composed step clock (scrubbed)     ← usePinProgress

/** The sealed six + `pin` — the closed taxonomy (no `(string & {})` escape: a trigger MUST resolve to
    a known DriverEdge, so the union stays sealed for exhaustiveness). `pin` is the seventh and last:
    a POSITION-derived scalar like `scroll` (it opens no spring, no rAF, no second poll), composed by
    `usePinProgress` from the pinned stage's ALREADY-registered per-step scrub hosts. It is
    AUTHORING-GATED to a `ChapterStage` — see `SurfaceTrigger` (the W-50 pin gate). */
export type MotionTrigger =
    | "scroll"
    | "select"
    | "hover"
    | "active"
    | "filter"
    | "load"
    | "pin";

/** The ordered roster — the gate iterates this to prove every member resolves to a DriverEdge. */
export const MOTION_TRIGGERS = [
    "scroll",
    "select",
    "hover",
    "active",
    "filter",
    "load",
    "pin",
] as const satisfies readonly MotionTrigger[];
