# Changelog

## 5.0.0 — 2026-07-16

### Breaking changes

- Selection keys are canonical-only: `parseSelKey` throws for bare, malformed, or unknown-kind strings, and the selection and URL stores reject invalid ingress instead of silently dropping it. The unused `markKeyFor` and `parseMarkKey` story wrappers are removed.
- The parallel visualization-alternate registry, `resolveFromAlternates`, and the `VizPlacement` alias are removed. Use `VizSetContract`, `resolveVizSurface`, and `VizAnnotationPlacement`.
- The held `DockTOC` / `useDockViewMode`, standalone `FilterContinuum`, and `useDeckDetent` surfaces are removed. The dock stepper, `FilterPanel`, and `useStageDeck` / persistent stage now own those concerns.
- `CATEGORY_SKINS` and `resolveCategorySkin` are removed; use `SKINS` and `resolveSkin`. `useSharedColorMode` and the optional `useVizPalette(mode)` argument are removed; palette invalidation follows the Glass post-settle clock.
- Feed validation rejects v1 and `meta.year`, enforces canonical metadata, complete year spines, normalized unique `(keyField, year)` identities, and numeric-or-null measures. The runtime `encodeColumnar` export is removed; columnar encoding belongs to the snapshot producer.
- Reveal shape `unfold` is removed, and `reveal.aside` no longer aliases right-aligned title placement. Declare `reveal.layout.title` explicitly when placement matters.
- `useVizRegistry().updateDims` is renamed to `updateFilterFacet` and now updates dimensions with filter response atomically.
- `directEndLabel`, labeled `markPointRivet`, and `dropRule` now require the resolved canvas mono-family argument instead of embedding a font name.

### Changed

- One Glass Drawer now owns the complete filter PIP → ledger → drawer continuum, including explicit responsive/static filter behavior.
- Appendix actions use Glass Button primitives; canvas typography resolves from the shared live font tokens; component-backed story points load eagerly only when adjacent to the active point.

## 4.0.0 — 2026-07-15

### Breaking changes

- `ChapterStage` replaces the optional `graphic` arm with one required persistent `instance`, requires a non-empty scene tuple and fixed stage anatomy, and removes the `PointViz` scene arm and `StoryStage` alias.
- Stage events derive from one event hub, and story manifests carry the persistent stage contract directly instead of parallel ownership paths.

### Added

- Per-scene morph modes, interruptible crossfades, and shared row/section virtual-window measurement state.

## 3.0.0 — 2026-07-15

### Breaking changes

- `Beat` and `StoryCard` no longer treat unnamed content as figure content. Move figure bodies into the named `#figure` slot; the fixed card anatomy now owns title, figure, aggregate-stat, prose, and appendix sectors in that order.
- `useDeckDetent(options).bind(element)` and its three-value `activeDetent` / `request` / `setDetent` API are removed. Call `useDeckDetent(element, options)` and consume `activeIndex`, `isSupported`, `containerAttrs`, `slideAttrs`, and `goTo`; `transition` is now a boolean that delegates to the bound document's View Transition API.

### Added

- Story cards hoist nested VizPlate aggregate stats through a card-scoped registry, keep optional `keyStats` as the non-card crown, consume Glass Card rhythm variables, and suppress only the nested ChartFrame perimeter.
- Appendix detail remains an inline non-modal disclosure on desktop and print, while phone full state composes the Glass 6 bottom Drawer for focus containment, Escape, restoration, scrim, and modal semantics.
- ChapterStage owns one identity-keyed ECharts morph push per genuine scene boundary; `useEChart` and ScatterPlate yield duplicate boundary paints, and story manifests can carry non-ECharts scenes directly.
- The generic N-slide deck driver consumes Glass deck state, native `scrollsnapchange`, and one shared IntersectionObserver fallback.

## 2.0.1 — 2026-07-15

### Fixed

- Narrative docks again apply Atlas's fixed left-rail geometry through the direct Glass 6 component root, including the desktop collapsed state.
- The shared filter continuum occupies its ratified lower-third right-edge seat on desktop while retaining the phone safe-area placement.
- Story cards leave rim, clipping, and the 16px card radius to the Glass Card vessel instead of overriding it with Atlas's plate radius.

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

- Peer floors advance to Glass UI 6.0.0, keyframes.js 5.3.5, pencil-boil 0.9.2, and value.js 3.1.0.
- The runtime floor advances to Node.js 24 and npm 11 to match the required pencil-boil peer.
- Source browsing delegates its native-table shell and grid semantics to the published Glass data-table surface while Atlas retains query, windowing, focus, and export ownership.

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
