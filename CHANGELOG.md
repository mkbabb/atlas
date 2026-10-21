# Changelog

## Unreleased (8.0.0 train)

### Breaking changes

- **The hover card is the peek (U/B7 · O-13).** `HoverReadout.eyebrow` is deleted and
  `HoverReadout.sources` added. The card is 20rem wide and shows the name, one context line, at most
  four facts (none repeating the title), the sources and "Click for detail". `ReadoutFacts` uses a
  label-safe grid (`max-content minmax(0,1fr)`) that stacks under 18rem; the breakdown takes the
  same columns. See MIGRATION.md §5d.
- **The styles contract (U · D5A-W1).** `@mkbabb/atlas/styles` is now Tailwind v4 *source*
  (`dist/styles/index.css`), compiled by the consumer's one Tailwind root, which imports
  `tailwindcss`, then `@mkbabb/glass-ui/styles`, then `@mkbabb/atlas/styles`, in that order, in one
  `.css` file. The compiled `dist/style.css` aggregate is gone, atlas no longer compiles Tailwind or
  glass-ui into its own bytes, and `src/design/index.css` / `styles/tokens.css` are deleted.
  `./styles/breakpoints` resolves to `dist/styles/design/foundations/breakpoints.css`.
  `tw-animate-css` is a dependency. See MIGRATION.md §1.
- **`atlasCorePreset()` enforces the cascade contract.** It now returns
  `[vue(), ...atlasLayers(), tailwindcss()]`: `atlas:root-order` throws when a root imports the
  three sheets out of order, and `atlas:layers` wraps the recorded root's non-atlas items in
  `@layer atlas.recipes` and throws when any other compiled sheet (a second `.css` file, an SFC
  `<style>` block) carries the atlas styles (CX-1). New exports from `./vite`: `atlasLayers`,
  `checkRootOrder`, `importSpecifiers`, `topLevelItems`, `wrapInAtlasLayers`, `carriesAtlasStyles`,
  `ATLAS_LAYER_ORDER`, `ROOT_IMPORTS`.
- **One readiness mechanism (J-1, CX-4).** `useEChart` returns `settled` (false from every
  structural act until the next `finished`), `frame` (counts every `finished`) and `push(option)`
  (the one structural write path), and exports `EChartReadiness` and `SETTLE_FRAME_MS`. A data act
  or a push supersedes a held emphasis: no stale index is painted. The B3 `rendered` gate is gone.
  `StageMorphTarget` requires `push(option)`; the stage-morph driver no longer calls `setOption`.
- **Overlays ride the primitive (CX-5).** `VizTextOverlay` takes `:echart` (an `EChartReadiness`)
  instead of `:chart`; `useVizOverlay(echart, svgRef, leaves)` and `useEChartOrnament(echart, key)`
  take the handle; `EChartOrnament` takes `:echart`. None subscribes to a chart event; useEChart
  holds the one `finished` site. ScatterPlate's view-change morph goes through `push`.
- **`SubFloorValues` values carry an `id` (J-6).** `SubFloorRow.values` is
  `SubFloorValue { id, value, unit }[]` (new export); cells are keyed by `id`, not `unit`. The rows
  share a label column (subgrid, label up to 16rem, a 40rem measure) and stack below a 30rem plate.
- **`SelectionRegion` keyboard entry (J-4).** On focus the cursor moves to the first selected key
  in key order, or the first key, and that key is raised; the region's focus ring is drawn inside
  it. A key is emitted once per distinct value.

- `SelectionRegion` emits `active-change` only as reader intent (U-F59a). It no longer emits
  `keys[0]` from its setup watcher, and it no longer emits when `keys` re-orders or narrows under an
  unfocused cursor. It raises a key on focus and on arrow movement while focused, and emits `null`
  only to release a key it raised (on blur, on unmount while focused, or when the list empties).
  Consumers that swallowed the first emission with a local "seeded" flag must delete that flag:
  under the new contract it would drop the reader's first real focus. Consumers that tested
  `document.activeElement` before writing a hover store can bind `@active-change` straight to the
  store.
- A-39, the plate. A figure's own actions (Enlarge, export, options) live at the figure, in its act
  row; the dock carries none of them. Deleted with no alias: the membrane viz-context zone's Enlarge
  (`data-viz-context-enlarge`) and its options band; the facet-6 export teleport from `VizPlate` and
  the stage source-data teleport from `ChapterStage` (and their dock-portal holds); the options band
  in `UnifiedFilterPanel`; `useVizPlate().toggleEnlarge`; and the registry's stage-controls seam
  (`registerStageControls`, `deregisterStageControls`, `stageControlsFor`, `RegisteredStageControls`,
  now `StageControls` from the stage adapter). The facet-6 provenance teleport
  (`useMembraneProvenanceSource`) is deleted too, by the dock re-seat below. A composed stage's
  graphic must use the stage id as its contract id: the stage's Enlarge opens `?fig=<stage id>`.

- **The dock re-seat (U · §L D3-1, §M M-4).** The dock keeps no figure subject and puts no
  container seat in glass's toolbar run. The run (GlassDock `#default`, which glass 10.1.0 marks
  `role="toolbar"` and roves) now holds the chapter rungs themselves, one control per seat, so glass's
  own roving is the chapter rail: one Tab stop (the current chapter), ArrowUp/Down/Home/End between
  chapters, glass's reach-scroll and status line. The rail's wrapper, its `FadingScroll` port and its
  spine element leave the run: the identity spine is the run's background (`spine-fill.ts`, the year
  cross-fade on a registered `--spine-o`), the "step N of M" readout is teleported to `<body>`, and
  the crest rule sits under the crest in `#persistent`. `ControlPlaneSpine` is deleted from
  `./chrome` with no alias. The foot (Filters, Compare years, Save this view,
  theme, Collapse; the gear on the phone) moves to GlassDock's `#persistent-end`, so each control is
  its own Tab stop; it hides with the deck when the rail collapses. The filter trigger is
  route-level (`DockFilterTrigger`, test id `dock-filter-trigger`): it pins no figure and carries no
  figure id. Deleted with no alias: the facet-5 viz-context zone (`MembraneVizContext`), the facet-6
  provenance detent (`MembraneProvenanceDetent`) and its teleport seam (`useMembraneProvenanceSource`,
  `useMembraneProvenanceHost`, `useDialVizId`, `MEMBRANE_PROVENANCE_TARGET_*`), and the
  `"viz-context"`/`"provenance-detent"` facets and the `"context"` band. See MIGRATION.md §5c.

- **U-F60 clause 4, the atlas half (U · §K K-2).** A plate dial (`viz.<id>.<dial>`) is read on
  load and never written: `useVizOptions` holds the value in the view store's dial memory
  (`dialParam`, `setDial`, `registerDials`), shared by every reader of the dial, and `set`/`reset`
  and `resetParams` never write a dial key. A `global` dial still writes its filter's own key.
  `useSelection` no longer mirrors the selection to `?sel` (the seed-once read stays) and
  `useViewParams.setSel` is deleted. `ReadoutDrill`'s [focus] re-aims in memory only and
  `useViewParams.setFocus` is deleted (`focusKey`/`focusForGrain` still read `?focus`). `openFig`
  and the source-data doors now push a history entry (`pushParam`), and closing is Back
  (`popParam`; a deep-linked overlay clears in place). `ChapterStage` no longer registers or watches
  `?drawer`; it reads it once and honours it through the stage's open-at-detent command.
- **The dock-hold census narrows (U · §K K-4).** `PortalSurface` is `"body-teleport"` only and
  `PortalHoldReason` is `"teleported-surface-fires-dock-leave"` only; `"inline-aside"` and
  `"door-in-dock-surface-outside"` are deleted with no alias.
- **The plate's layers claim Escape (U · §K K-1).** `PlateAct`'s Options popover, Download menu and
  phone sheet each hold a dismiss-arbiter claim while open (`plateLayerClaim`,
  `PLATE_LAYER_PRIORITY` 110, above the enlarged figure's 100). One Escape closes the topmost plate
  layer, even with a selection held, and focus returns to the control that opened it.
  `FilterPanel`'s dock `topmost` gate is deleted: its claim (priority 30) always takes Escape and
  outside pointer, and a plate layer over it outranks it.
- The `@mkbabb/glass-ui` peer moves `^7.0.0` → `^10.1.0` (dev pin `10.1.0`).
- `HandMark` follows glass 9's one-pen re-cut. Props are `shape`, `color`, `weight`, `clock`,
  `seed`; `variant`, `path`, `drawMs`, `boil` and `progress` are removed. Free paths, rings and
  rules move to the new `InkStroke` (`kind: "line" | "ring" | "path"`, `points`, `color`,
  `weight`, `seed`, `clock: "static" | "scroll"`).
- Removed exports: `useMarkMorphology`, `MarkMorphology`, `MarkMorphologyInput`,
  `ENGINE_HAS_AMPLITUDE`, `MarkVariant`, `BOIL_BUDGET`, `HIGHLIGHT_WEIGHT_VB`, `MarkAppear`,
  `clockAppear`, `clockAnimation`. `clockDraws(clock)` replaces the appear/animation map, and
  `useHandMarkClock` returns `{ draw, resolveInkColor }`.
- `CompletionSeal` is atlas-owned (glass 8 deleted it): `@mkbabb/atlas/editorial` exports it with
  `CompletionSealProps` and `CompletionSealShape`.
- `AtmospherePreset.dockOpacity` and the `--glass-opacity-dock` write are removed. Glass 8 stopped
  reading `--glass-opacity-*`; the glass 10 dock owns its own legibility over the ground.
- **The stamped snapshot is the only feed source (U · §L H9 (a)).** `loadFeed(slug)` reads
  `/data/<slug>.snapshot.json` and nothing else. The live arm (`/api/<slug>`, which served an
  unstamped Sheet read under Pages) and its silent catch-and-fall-to-snapshot are deleted, with
  `apiUrl` (no alias). A failed fetch or malformed body rejects; `snapshotUrl` throws on anything
  that is not a bare lowercase slug, so a URL or path is refused before any fetch. `loadFeed` no
  longer reads `prefersReducedData()` (there is one transport).
- **Pooled membership is the latest period (U · §L horn 8 (ii), F-D4S-8).** `aggregateRows(feed,
  years)` admits a unit only if it has a row in the latest selected period, and reduces from that
  row: closed units leave the pooled frame, attributes (flag, names) ride so a route filter tests
  the unit as it stands in that period, and a `latest` measure reads that row with no fall-back to
  an older non-null value (the "entitynn" helper is deleted). The reduced row's `year` is that
  period. On the sci 2014–2025 snapshot the pooled frame goes from 322 to 302 units and
  `flag=CHARTER` admits 187 (was 0, F-D4S-1). `trajectory()` now throws when a `latest` measure
  meets more than one row in a period (it used to return an arbitrary entity's value).
- **One set-valued period key (U · §L 6(f), X-5′, X-11′).** The year scope reads and writes ONE
  URL key through one codec (`data/period.ts`): `?sy=` on a feed that declares
  `meta.period = {axis: "school-year", param: "sy"}`, else `?year=`. Single `sy=2024-25`; a pool
  `sy=2014-15..2025-26`; a gapped pool `sy=2014-15,2016-17..2018-19` (gaps kept, never a hull);
  compare `sy=range:2014-15..2016-17`. `yearMode` and integer `years` (and `year` on a
  school-year feed) are read once on load by `restatePeriod`, restated element-wise with a notice
  (`useYearScope().notice`), and never written. Reader writes go through `setPeriod` (and
  `setSingle`/`setRange`/`setAggregate`, which call it); each writes the axis key, deletes the
  legacy keys, closes the notice, and throws on a year the feed does not carry. Nothing is
  written on load. New: `useYearScope().hold(scope)` (a program's in-memory period), `noun`
  (the one `PeriodNoun`), `codec`, `text`, `notice`; `FeedMeta.period` / `FeedPeriodAxis`
  (validated: an unknown axis fails `isFeed`). `YearScope` is now `PeriodScope`.
- **A scene's year is held, never written (§L 6(f)).** `SceneRuntime.setYear` holds the scope in
  memory while the scene is on screen and releases it when the scene leaves; the snapshot/restore
  of the reader's scope through URL writes is deleted.
- **Period dials (`VizOptionScope "period"`).** A plate dial on the year scope declares
  `scope: "period"` and writes through `setSingle`. A `global` dial keyed `year`, `years`,
  `yearMode` or `sy` throws. `data-viz-scope` names the dial's scope (`global` or `period`).
- FilterPanel's freshness chip names the period with the feed's noun ("2024–25", or the pooled set)
  instead of "FY{year}" / "all years".

### Added

- `useViewParams` gains `pushParam(key, value)` and `popParam(key, value?)` (the overlay push
  verb), and `dialParam`, `setDial`, `registerDials` (the dial memory) (§K K-2).
- The stage's commands: `StageCommands { openProvenance(detent) }`, provided as
  `STAGE_COMMANDS_KEY` and read with `useOptionalStageCommands()`; `createStageProvenance` and
  `linkedDetent` back it (§K K-2).
- `plateLayerClaim`, `PLATE_LAYER_PRIORITY`, `PLATE_LAYER_ATTR` and `PlateLayer` from the plate's
  act contract (§K K-1).
- The engine lane's `emulateMotion` command, so a spec runs under both motion settings.

- `Treemap` emits `layout` (`TreemapBoxLayout[]`: key, x, y, width, height) after each settled
  render, once per distinct layout (J-2). Consumers size labels from it instead of polling
  ECharts' model.
- Each mark exports its `SETTLE_BOUND_MS` (StackedBar, RankedBar, Treemap, TimeSeries,
  DiscreteColumns, ScatterPlate), tested in a real engine (CX-4).
- The engine lane: `npm run test:engines` (vitest browser mode, playwright 1.60.0 exactly:
  chromium-1223, firefox-1522, webkit-2287) runs the colocated `*.browser.spec.ts` specs; `ci.yml`
  runs it as a three-engine matrix on push to master and `release/**`, on `workflow_dispatch` and
  on pull requests.
- Release vehicle: `scripts/release.sh` admits `vX.Y.Z-rc.N`; `release.yml` publishes a
  prerelease under `--tag next` and a final under `--tag latest`, over OIDC trusted publishing
  (no `NPM_TOKEN`), after checking that `ci.yml` passed on the tagged commit.
- Contract tests: `styles/contract.spec.ts` (no declaration lost in the consumer's Lightning CSS
  pass; every utility candidate in `dist/**/*.js` renders, CX-2), `src/vite/preset.spec.ts`,
  `src/vite/preset.compile.spec.ts` (six consumer fixtures), and
  `tests/unit/source-styles-contract.spec.ts` (every source sheet parses under PostCSS).
- `ChartFrame` `#act` seat: the figure's last child, sticky to the viewport foot within the plate,
  with an `enlarge` slot prop bound to that frame. `VizPlate` fills it with `PlateAct` (subject line;
  options popover, Download CSV/image or Source data, Enlarge; under a 30rem plate one 44 px "Take
  this figure" button opening the stock glass bottom sheet). `ChapterStage` renders the same row for
  a stage. In a focal `StickyScene` the row is placed in the scene's act seat, above the step chips.
  While enlarged, a figure claims Escape on the dismiss arbiter at priority 100
  (`figureEscapeClaim`, `FIGURE_ESCAPE_PRIORITY`), so one Escape closes the figure only.

- `@mkbabb/atlas/interaction`: `createReaderIntentGate`, the focus-gated cursor rule that
  `SelectionRegion` rides (a key is raised only while focused; a clear is sent only for a key the
  control raised). Any other roving keyboard control can drive it the same way.
- `@mkbabb/atlas/editorial`: the U-F25 evidence floor. `EVIDENCE_FLOOR` (5), `floorMet`,
  `countNoun`, `nounFor`, `nCount`, `valueSpan`, `subFloorReason`, `subFloorNote`, the reactive
  `useEvidenceFloor(n, noun, floor?)`, and the `SubFloorValues` plate. The floor licenses rank,
  crown, superlative and "median" wording only. Below it a cell prints its value with its n, and
  the n names what it counts.

### Changed

- Drawers compose glass `Dialog` + `SheetContent` (glass 8 folded `Drawer` into Sheet): the readout
  sheet (bottom, detents 0.12/0.5/1), the filter continuum (right, non-modal, PIP/drawer detents)
  and the phone appendix sheet. The sheet's own close replaces atlas's duplicate close buttons.
- Buttons use glass `emphasis` (glass 7 removed `variant`). Selection cards write `--glass-accent`
  and wear `metal-gold-border`; the year and aspatial swatches are atlas-owned (glass 7 made
  `StatusDot` a status vocabulary).
- The paper grain adopts glass's warm tooth (`paper-underpaint`, `paper-grain-overlay`,
  `--paper-grain-tooth`); atlas's `paper-aged-surface` utility is removed. Retired spring tokens
  re-point to `--spring-present` / `--spring-dock`. `StoryCard` padding reads the glass space series.
- `GlassDock` loses `position`, `density`, `overflow`, `interaction` and `start-collapsed`; atlas's
  dock mounts with `collapse="closed"` and fixes its own position. Glass 10.1.0 has no successor
  for `interaction="manual"`, so glass's environmental collapse writers are live again (relayed).

### Fixed

- `src/design/foundations/base.css:92` carried a stray `</content>` that PostCSS's strict parser
  rejects.
- Two `-webkit-backdrop-filter` duplicates (MembraneTitleLozenge, StickyScene) that the consumer's
  Lightning CSS pass kept in place of the unprefixed declaration are deleted.
- The skip link's `focus-visible:ring-ring` named a theme colour glass 7 does not define; it reads
  `--focus-ring-color`.
- GeoChoropleth texture bins follow the ramp ordinal (optional `value` prop); the texture is an
  ink-only overlay over each region's own fill (M-1).
- Silent drops under glass 10: the hover card's stacking rung (`z-hovercard` compiled to no rule),
  `PaperBackdrop`'s ignored `opacity`, `DataTable` pagination props, the `label-class` and
  `register` props, and nine custom properties glass 8–10 stopped defining. A new
  `tests/unit/glass-contract.spec.ts` fails on any glass prop, custom property, theme utility or
  glass class atlas names that the installed glass-ui no longer has.
- The dock crest has a visible gold focus ring; the `focus-ring-gold` class it relied on was never
  shipped by glass.
- `SourceDataBrowser`'s control row is a labelled `role="group"`, not `role="toolbar"` (§K H-A1′).
  Its seats are containers (the grain ToggleGroup roves its own stop; the export group holds four
  buttons) and it keeps a plain Tab order, so it no longer claims the one-stop arrow contract of a
  toolbar. The `.source-browser__toolbar` class and the "Source data controls" label are unchanged.
- Nothing writes the URL on load (U-F60 clause 3, §K K-3). `useUrlState` owns its bag (the
  `@vueuse` `useUrlSearchParams` dependency of this composable is gone): it is seeded from
  `location.search` before its write-back watch exists, has one `replaceState` sink, and re-reads
  on popstate without writing. The dock writes `?at` only after a reader act and a 300 ms scroll
  settle, and its restore no longer writes; `StickyScene` holds a step's `apply` until the first
  reader act; `ChapterStage` keeps a `?scene` link's anchor in memory (`linkSceneAnchor`) and
  writes `?scene` only after a reader act. A reader act is a trusted `pointerdown`, `keydown`,
  `wheel` or `touchstart` (`platform/composables/reader-act.ts`).
- `StickyScene`'s pinned graphic holds its grid track (`min-inline-size: 0`, §K K-5 (3)). A
  painter root still carrying its pre-resize width after an Enlarge closed held the figure chain
  open, and the host's `resize()` collapsed it inside its own ResizeObserver callback ("ResizeObserver
  loop completed with undelivered notifications", WebKit /sci at 1440).

## 6.0.1 — 2026-07-16

### Fixed

- Interactive dock rung navigation re-anchors once when lazy hydration moves the target, and yields
  immediately to fresh reader input. This correction targets Baseline 2025 browsers, including
  Safari 26.2 and later, and does not change Atlas's public API.

## 6.0.0 — 2026-07-16

### Breaking changes

- The dead shared instrument-timing surface is removed: `INSTRUMENT_SPRING`,
  `InstrumentSpringStyle`, `instrumentSpringStyle`, and `DOCK_COLLAPSE_SPRING` no longer ship.
  `VizGearDock` owns its bloom
  transition in component CSS and snaps locally under reduced motion; dock posture remains owned by
  `useDockCollapse`.

### Fixed

- Narrative restoration performs one bounded late-layout re-anchor, then stops on quiet, deadline, or reader input.
- Package declarations are emitted directly from Node-ESM-qualified source imports; the obsolete
  declaration rewrite, development alias, and release-only alias guard are removed.
- Data JSON carriers are source-folded into native-ESM-safe JavaScript modules, with county glyph
  consumers sharing one registry; the generated-code attribute rewrite and Vite warning are gone.
- The Glass completion-seal CSS output rewrite is removed; Atlas no longer patches dependency CSS.

### Packaging notes

- Strict packed-consumer acceptance covers the changed `./data` and `./vite` carriers. Existing
  all-subpath declaration failures in Glass UI 6, keyframes.js 5.3.5, Reka UI, and VueUse remain
  upstream-held for W33 and are not represented as whole-package strict acceptance.

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
- Source readers replace `RowsSource` / `rowsAt` with a declarative `RowsQueryPlan` and one `RowsProjection` returned by `project`; source panels receive the required shared `SourcePanelProps` host contract.

### Changed

- One Glass Drawer now owns the complete filter PIP → ledger → drawer continuum, including explicit responsive/static filter behavior.
- Appendix actions use Glass Button primitives; canvas typography resolves from the shared live font tokens; component-backed story points load eagerly only when adjacent to the active point.

### Fixed

- Heavy-feed worker infrastructure failures retire the failed singleton and parse each already-fetched body synchronously; malformed feed data still falls through to the existing snapshot tier.
- Outside-pointer dismissal snapshots one winning claim per gesture, so delayed arbitration cannot dismiss a replacement surface.

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
