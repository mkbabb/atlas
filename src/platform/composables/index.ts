// composables/index.ts — @mkbabb/atlas · the ./composables family barrel (src-rearchitecture §A.7; O-B9).
//
// THE HEADLINE DE-GODDING (§A.7). The 40-file flat `platform/composables/` bag — the canonical
// mis-colocation offender (structure-census §B.7: ~85% mis-owned) — DISSOLVES. Every
// component/feature-owned composable dispersed to its owning module across O-B4…O-B8:
//   · the viz/chart family (`useEChart`, `useViz*`, `useChartSelection`, `useTrendline`,
//     `useThemeReactiveOption`, `activeViz`) → `charts/composables/` (O-B4/B4R).
//   · the scroll/motion clocks (`useScroll*`, `useCoverProgress`, `useRankMotion`,
//     `useMarkMorphology`, `useHandMarkClock`, `useGoldOneShot`, `useLoadSequence`,
//     `useReducedMotion`) → `motion/` (O-B6).
//   · the affordance family (`useAffordance`, `useAffordanceHint`, `useSelectionTreatment`)
//     → `interaction/` (O-B6).
//   · the filter family (`useFilter*`) → `filter/composables/` (O-B5/B5R).
//   · the dock/aurora families → `chrome/*` (O-B7/B8).
//
// WHAT SURVIVES HERE: the ~6 GENUINELY-GLOBAL helpers — cross-cutting utilities that name no
// component and no feature. This is the anti-god fence's positive space (the fence:
// `tests/gates/composables-anti-god.gate.ts` REJECTS any survivor that names a component/feature —
// a `useDock*`/`useViz*`/`useFilter*` reappearing here is a topology-gate failure).
//
// The monorepo import flip to this home is O-B11.

// — the URL-as-document substrate: the query-state codec + the saved-views shelf —
export * from "./useUrlState";
export * from "./useSavedViews";

// — the theme key (the light/dark reactive signal every re-derive keys off) —
export * from "./useThemeKey";

// — the audacious-figure count-up tween (the crown-number settle) —
export * from "./useCountUp";

// — the roman-numeral formatter (the beat/section enumerator) —
export * from "./useRomanNumeral";

// — the responsive register (the phone/deck MQ seam, one home for the breakpoint strings) —
export * from "./useMobileRegister";
