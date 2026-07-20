// platform/motion/compileSegment.ts — THE COMPILE BOUNDARY (W-MOTION-CORE · spec-motion §d).
//
// One PURE TOTAL resolver beside the catalog: it answers, for every declared segment, WHICH runtime
// executes it. Not a gate — the gate institution is abrogated. Its correctness is `tsc` (the closed
// mechanism × trigger unions force every cell, and the exhaustive arms cannot be omitted) plus ordinary
// unit tests. There is no throwing branch and no born-RED script.
//
// THE BOUNDARY (spec-motion :443, verbatim):
//   compileTarget(mechanism, trigger) →
//     "compositor"      if trigger ∈ {scroll, pin}  and mechanism ∈ {reveal, draw}
//     "compositor-idle" if mechanism == breath
//     "director-scalar" if trigger ∈ {scroll, pin}  and mechanism ∈ {count, type, morph}
//     "director-spring" if trigger ∈ {select, hover, active, filter, load}
//
// Why it matters: position-derived motion (`scroll`/`pin`) — where the whole volume lives — resolves to
// the COMPOSITOR (0 JS per frame) or to a DIRECTOR SCALAR that reads the ONE cached `--scroll-tl`. So
// the grammar adds no new scroll rAF and no new `--scroll-tl` poll however many segments are declared;
// only the genuine interaction edges take a spring.

import type { MotionTrigger } from "./triggers.js";
import { LEAN_CATALOG, type LeanMechanism } from "./lean-catalog.js";
import type { AnyMotionSegment } from "./motion-director.js";

/** The four runtimes a segment can compile to. `compositor` = a CSS scroll/view-timeline animation
    (zero JS per frame); `compositor-idle` = a compositor loop with no scroll input (the idle breath);
    `director-scalar` = the plate re-renders off `MotionDirector.scalarFor` (no spring, no rAF);
    `director-spring` = one shared impulse spring on the director's self-suspending loop. */
export type CompileTarget =
    | "compositor"
    | "compositor-idle"
    | "director-scalar"
    | "director-spring";

/** A compiled segment — the target plus what the host must actually do to honor it. `dataAttrs` are the
    attributes a COMPOSITOR host stamps (the `scroll-driven.css` `data-reveal-*` register drives off
    them); `directorBind` is the trigger a DIRECTOR host reads its scalar for. Exactly one is present:
    a compositor segment binds no director scalar, a director segment stamps no attribute. */
export interface CompiledSegment {
    readonly target: CompileTarget;
    readonly dataAttrs?: Readonly<Record<string, string>>;
    readonly directorBind?: MotionTrigger;
}

/** The POSITION-derived triggers — the two that read a scroll clock rather than an impulse edge. */
const POSITION_TRIGGERS = new Set<MotionTrigger>(["scroll", "pin"]);

/**
 * The compile boundary as a pure total function over the two closed unions. Every `(mechanism ×
 * trigger)` cell resolves to exactly one target; the exhaustiveness arm makes a new mechanism a `tsc`
 * error here rather than a silent fall-through (the totality the spec asks `tsc` to carry).
 */
export function compileTarget(
    mechanism: LeanMechanism,
    trigger: MotionTrigger,
): CompileTarget {
    // MECHANISM first (an idle mechanism resolves independently of any trigger), then the
    // position/impulse split within it — the boundary's own reading order.
    const position = POSITION_TRIGGERS.has(trigger);
    switch (mechanism) {
        case "breath":
            // The idle arm — trigger-INDEPENDENT by construction: a breath reads no clock and no
            // edge, so its declared trigger names only the mount seam the CSS stamp rides.
            return "compositor-idle";
        case "reveal":
        case "draw":
        case "path": // the reserved DrawSVG fold-slot rides the draw arm
            return position ? "compositor" : "director-spring";
        case "count":
        case "type":
        case "morph":
        case "emphasis":
        case "flip":
            // On a position trigger these read the ONE cached scalar (no spring, no rAF); on an
            // impulse trigger they ride the director's shared, self-suspending spring.
            return position ? "director-scalar" : "director-spring";
        default: {
            const _exhaustive: never = mechanism;
            return _exhaustive;
        }
    }
}

/**
 * Resolve ONE declared segment to its runtime. Total: every catalog member × every trigger compiles;
 * nothing throws. The mechanism comes from the sealed catalog (`LEAN_CATALOG[seg.use].mechanism`), so a
 * segment can never name a runtime the catalog does not bind.
 */
export function compileSegment(seg: AnyMotionSegment): CompiledSegment {
    const mechanism = LEAN_CATALOG[seg.use].mechanism;
    const target = compileTarget(mechanism, seg.on);
    if (target === "compositor" || target === "compositor-idle")
        return { target, dataAttrs: { "data-motion": seg.use } };
    return { target, directorBind: seg.on };
}
