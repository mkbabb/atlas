// motion/buildMarkAnimation.ts — THE D4 PRIMITIVE RUNTIME (C.1c · the ~10-line-per-mechanism
// switch), extracted from `motion-director.ts` (O-B4R god-split, §A.9 — a self-contained SVG-mark
// seam with no dependency on the director's declaration/driver core, moved verbatim). The director
// re-exports it, so the `@/motion` surface is byte-stable.

import { NumericAnimation } from "@mkbabb/keyframes.js";
import { MorphSVG } from "@mkbabb/keyframes.js/engine";
import { clamp, easeOutExpo } from "@mkbabb/value.js";
import type { LeanMechanism } from "@/motion/lean-catalog";

const clamp01 = (x: number): number => clamp(x, 0, 1);

/** The imperative off-VDOM handle an SVG plate scrubs off `director.scalarFor(seg.on)`. `at(t)` writes
    the mark geometry at scalar `t`. */
export interface MarkAnimation {
    at(t: number, seek?: boolean): void;
    dispose(): void;
}

/** Options a primitive adapter needs per mechanism. `morph` needs the from/to path `d`; `draw`/`path`
    read the element's own stroke length. */
export interface BuildMarkOptions {
    readonly ease?: (t: number) => number;
    readonly morphFrom?: string;
    readonly morphTo?: string;
}

/** buildMarkAnimation — the whole "D4 runtime" as a switch over keyframes.js 5.1.0 primitives (C.1c):
    `draw`/`path` scrub `stroke-dashoffset` (the DrawSVG sweep `len·(1−t)`, expressed via NumericAnimation
    so it runs headless); `morph` samples MorphSVG (node-safe, no DOM layout). The CANVAS seam does NOT
    use this (it rebuilds the ECharts option off `scalarFor`); this is the SVG-mark seam a plate owns. */
export function buildMarkAnimation(
    el: SVGElement,
    mechanism: Extract<LeanMechanism, "draw" | "path" | "morph">,
    opts: BuildMarkOptions = {},
): MarkAnimation {
    switch (mechanism) {
        case "draw":
        case "path": {
            const geom = el as SVGGeometryElement;
            const raw = typeof geom.getTotalLength === "function" ? geom.getTotalLength() : 0;
            const len = raw > 0 ? raw : 100; // an unmeasured/empty path falls to a nominal stroke length
            const anim = new NumericAnimation([{ dashoffset: len }, { dashoffset: 0 }]); // undrawn → drawn
            const ease = opts.ease ?? easeOutExpo;
            el.style.strokeDasharray = String(len);
            return {
                at(t: number): void {
                    el.style.strokeDashoffset = String(anim.at(clamp01(ease(clamp01(t)))).dashoffset);
                },
                dispose(): void {},
            };
        }
        case "morph": {
            const from = opts.morphFrom ?? el.getAttribute("d") ?? "";
            const to = opts.morphTo ?? from;
            const m = new MorphSVG(from, to);
            return {
                at(t: number): void {
                    el.setAttribute("d", m.sampleD(clamp01(t)));
                },
                dispose(): void {},
            };
        }
        default: {
            const _exhaustive: never = mechanism;
            return _exhaustive;
        }
    }
}
