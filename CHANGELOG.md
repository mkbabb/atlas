# Changelog

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
