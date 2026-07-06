// charts/scale/index.ts — the SCALE family barrel (§A.1).
//
// The colour-scale + relight substrate: the one `ColorScale` factory (split into its
// scale-assembly + `./colorRamp` ramp-math at O-B4, §A.9), the four legal KINDS
// (`colorKind`), the canonical OKLab seam (`oklab`), and the render-tier LOD gate.
// `emphasis-policy` + `colorRamp` stay INTERNAL (the encapsulation boundary — consumed
// within the family, not re-exported), mirroring the pre-split flat-bag surface.
export * from "./ColorScale";
export * from "./colorKind";
export * from "./oklab";
export * from "./render-tier";
