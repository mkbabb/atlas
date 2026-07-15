# Changelog

## 2.0.0 — 2026-07-15

### Breaking changes

- `VizContract` and `WatchersVizContract` are no longer generic; the unused `_row` inference field is removed.
- `CategorySkin` now carries the complete brand-skin contract. Custom category skins must declare identity, atmosphere, chrome, surface, and background-family fields in addition to their presentation fields.
- `VizAlternate` declarations must state whether they use a `same-instance` or `cross-instance` morph. The registry now reports shipped truth rather than retaining unbuilt dumbbell and balance-beam rows.

### Added

- Public `./viz-set`, `./events`, `./skin`, and `./stage` entry points.
- Canonical story manifests and persistent chapter stages, fixed-sector story cards, hero composition, source browsing, filter-ledger projection, appendix furniture, and unified interaction events.
- Keyed ECharts view morphs, render-ready legends, shared swarm packing, and live-element handmark ornaments.

### Dependencies

- The intended peer floors are keyframes.js 5.3.3 and pencil-boil 0.8.1, retaining value.js 3.1.0. Publication is held until a Glass artifact widens its non-overlapping pencil-boil 0.4.x peer; no forced or legacy peer resolution is accepted.

## 1.1.3 — 2026-07-15

### Fixed

- Expanded mobile docks apply their sheet width and ruled-row styles through the scoped host.

## 1.1.2 — 2026-07-15

### Fixed

- Mobile dock crest clicks now open the section sheet instead of being canceled by Glass dock focus expansion.

## 1.1.1 — 2026-07-15

### Fixed

- Mobile collapsed docks render one interactive TIL crest; the decorative desktop summary remains available without duplicating the mobile section control.

## 1.1.0 — 2026-07-15

### Breaking changes

- Dashboard metadata must declare its `slug`; chapter ordinals are now derived from manifest order, so `Chapter.figure` and `StoryDefinition.transitions` are gone.
- `useChartSelection` requires a `SelectionKind` and always emits typed composite keys. Empty selection IDs now throw.
- `HandUnderline` is removed; use `HandMark` for authored strokes.
- The duplicate row-filter layer is removed: `useFilteredRows`, its data contracts, `fromDimSpecs`, and `DimPredicateSpec` no longer ship. Build query predicates through `@mkbabb/atlas/filter`.
- `useGoldOneShot`, `chapterTransition`, `declaresSharedElement`, and `SceneContextV2` are removed. `figureLabelFor` now receives the derived ordinal, and `useDockStepper` receives caller-owned document progress.
- Peer floors advance to Glass UI 5, keyframes.js 5.3.1, and value.js 3.1.

### Added

- Dashboard contracts can declare filter algebra and hero eyebrows.
- CSV exports carry declared provenance.
- Editorial category and completion recipes are public; sticky scenes now sequence adjacent stage detents.
