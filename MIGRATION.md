# Migrating to Atlas 8.0.0 (unreleased; the rc train)

Each row is drawn from the `u/build-atlas-rc` commits over 6dd96b9 (`git log 6dd96b9..`), not from
intent. The version is not bumped here; the rc tag is an owner act.

## 1 · The styles contract: the consumer compiles atlas's styles

`@mkbabb/atlas/styles` is Tailwind v4 source. Replace any import of the old compiled sheet with ONE
root stylesheet, in ONE `.css` file, in exactly this order:

```css
@import "tailwindcss";
@import "@mkbabb/glass-ui/styles";
@import "@mkbabb/atlas/styles";
```

and build with `atlasCorePreset()` from `@mkbabb/atlas/vite` (it already includes `tailwindcss()`;
do not add a second one). The preset refuses, at build and on the dev server:

| Shape | Error |
|---|---|
| the three imports out of order, or glass missing | `atlas:root-order: … imports …; an atlas styles root imports tailwindcss → @mkbabb/glass-ui/styles → @mkbabb/atlas/styles, in that order` |
| a root that reaches `@mkbabb/atlas/styles` through a second `.css` file | `atlas:layers: … compiles @mkbabb/atlas/styles but is not an atlas styles root` |
| the root written in an SFC `<style>` block | the same `atlas:layers` error |

An SFC that needs atlas utilities uses `@reference "<path to the root>.css";`. `./styles/breakpoints`
keeps its specifier; it now resolves to `dist/styles/design/foundations/breakpoints.css`.
`dist/style.css` no longer exists.

## 2 · useEChart readiness: `settled`, `frame`, `push`

| Before | After |
|---|---|
| `chart.on("finished", fn)` or a private "painted" flag in a plate | `watch(api.frame, fn)`, reading the chart only while `api.settled.value` |
| `try { chart.convertToPixel(…) } catch {}` | project only while `settled` (in a lazy paint window it answers `undefined`) |
| `chart.value.setOption(option, { notMerge: true, lazyUpdate: true })` for a view or scene change | `api.push(option)` |
| a `StageMorphTarget` literal `{ chart, host, option }` | add `push(option)` (useEChart passes its own) |
| a highlight held across a data change, replayed on the new data | superseded: the reader's next hover dispatches against the new data |

`EChartReadiness = Pick<UseEChart, "chart" | "settled" | "frame">` is the handle to pass to
projecting components.

## 3 · Overlays and the ornament take the handle

| Before | After |
|---|---|
| `<VizTextOverlay :chart="chart" …>` | `<VizTextOverlay :echart="{ chart, settled, frame }" …>` |
| `useVizOverlay(chart, svgRef, leaves)` | `useVizOverlay({ chart, settled, frame }, svgRef, leaves)` |
| `<EChartOrnament :chart="chart" :mark-key>` | `<EChartOrnament :echart="{ chart, settled, frame }" :mark-key>` |
| `useEChartOrnament(() => chart, key)` | `useEChartOrnament({ chart, settled, frame }, key)` |

## 4 · Smaller breaks and new seams

| Change | Consumer edit |
|---|---|
| `SubFloorRow.values[]` requires `id` (cells keyed by it) | add a stable `id` per value, unique within the row, e.g. `{ id: "requests", value, unit }` |
| `Treemap` emits `layout: TreemapBoxLayout[]` (additive) | delete any `getModel().getSeriesByIndex(0).getData()` poll and its timers; bind `@layout` |
| `SelectionRegion` focus seats the cursor on the first selected key | none; plates that ring `@active-change` now ring the selection on entry |
| marks export `SETTLE_BOUND_MS`; useEChart exports `SETTLE_FRAME_MS` (additive) | a figure built on `useEChart` states its own bound the same way |
| `GeoChoropleth` gains an optional `value` prop (M-1, additive) | pass the number the scale was fed, so the texture order is ordinal |
| release tags `vX.Y.Z-rc.N` publish under `next`; trusted publishing replaces `NPM_TOKEN` | owner: set the npmjs.com trusted publisher (mkbabb/atlas, `.github/workflows/release.yml`) |

## 5 · A-39, the plate: per-figure actions leave the dock

| Removed (no alias) | Consumer edit |
|---|---|
| the membrane viz-context Enlarge (`data-viz-context-enlarge`) and its options band; the options band in `UnifiedFilterPanel` | none for `VizPlate`/`ChapterStage` routes: the figure's own act row (`PlateAct`, in `ChartFrame`'s `#act` seat) carries Options, Download and Enlarge |
| `useVizPlate().toggleEnlarge` | enlarge through the `#act` slot prop `enlarge`, bound to that frame |
| `registerStageControls`, `deregisterStageControls`, `stageControlsFor`, `RegisteredStageControls` | `StageControls` from the stage adapter; `ChapterStage` renders the stage's act row |
| the facet-6 export teleport and the stage source-data teleport (and their dock holds) | none; the provenance teleport stays. A composed stage's graphic uses the stage id as its contract id (`?fig=<stage id>`) |

## 5a · U-F60 clause 4 and the plate's dismissal (U · §K K-1, K-2, K-4)

| Change | Consumer edit |
|---|---|
| dials no longer write `viz.<id>.<dial>`; a deep link still seeds them | a store that read the dial with `view.param("viz.<id>.<dial>")` builds its own `useVizOptions(<id>, specs)` and reads `values` (sci's band-cake store already does) |
| `useViewParams.setSel` deleted; the selection is not mirrored to `?sel` | delete any `?sel` write; read the seed with `view.selKeys` |
| `useViewParams.setFocus` deleted | re-aim with `useSelection().focus(key)`; read `?focus` with `focusKey`/`focusForGrain` |
| `openFig` pushes; `closeFig` goes Back | none for `ChartFrame`/`VizPlate`; a consumer that opens `?browse=` calls `view.pushParam("browse", id)` (sci `04-scatter/stage.ts:141` writes it with `setParam` today) |
| `?drawer` is read once by `ChapterStage` and never written | delete any `drawer` write and its `registerKeys`; open the appendix with `useOptionalStageCommands()?.openProvenance(detent)` |
| `PortalSurface` / `PortalHoldReason` narrowed | a claim spec uses `"body-teleport"` / `"teleported-surface-fires-dock-leave"` |
| `PlateAct` layers claim Escape at priority 110 | none; a page claim that needs to outrank a plate layer must claim above 110 |

## 5b · The data plane (U · §L H9, horn 8 (ii), 6(f))

| Change | Consumer edit |
|---|---|
| `loadFeed` reads only `/data/<slug>.snapshot.json`; the `/api/<slug>` live arm, its fallback and `apiUrl` are deleted (H9 (a)) | delete any `apiUrl` import and any `/api/<slug>` Pages Function that served a feed; a missing or malformed snapshot now surfaces as the store's `error`, so ship the snapshot with the build |
| `aggregateRows` admits a unit only on its row in the latest selected period; closed units leave; `latest` measures no longer fall back to an older value; attributes ride on the reduced row (horn 8 (ii)) | update pooled counts (sci 2014–2025: 322 → 302 units); delete any client re-join of attributes onto the pooled frame; a `latest` cell can now be `null` where the unit's latest-period value is null |
| `trajectory()` throws on a `latest` measure over a multi-row period | declare `sum`/`mean`/`weightedAvg`/`ratio` for a cross-entity series, or pass a `trajectoryFeed` (one row per period) |
| the year scope writes one key: `?sy=` on a feed declaring `meta.period.axis: "school-year"`, else `?year=`, spelled by `data/period.ts` (pool `a..b`, gaps `a,b`, compare `range:`); `yearMode`/`years` (and `year` on a school-year feed) are read once with a notice and never written (6(f)) | delete any reader of `?yearMode`/`?years` and any own `?sy` parser (sci `edition/period.ts`, `useSyOverride`, `legacyNotice`): read `view.yearScope.scope`, `.text`, `.noun` and `.notice`; render `.notice` at the period readout |
| `setSingle`/`setRange`/`setAggregate` throw on a year the feed does not carry | offer only `yearScope.years` in the control |
| `SceneRuntime.setYear` holds in memory; a scene no longer writes the year | none; a consumer that read the scene's year from the URL reads `view.yearScope.scope` |
| a `global` dial keyed `year`/`years`/`yearMode`/`sy` throws | declare it `scope: "period"` (sci `SchoolMap.vue:138`) |

## 5c · The dock re-seat: no figure subject, one seat in the toolbar run (U · §L D3-1, §M M-4)

| Change | Consumer edit |
|---|---|
| `useMembraneProvenanceSource`, `useMembraneProvenanceHost`, `useDialVizId`, `MEMBRANE_PROVENANCE_TARGET_ID` and `MEMBRANE_PROVENANCE_TARGET_SELECTOR` deleted from `./provenance`; the dock hosts no figure's record | a plate's provenance renders in place: drop the `<Teleport>` and the `useMembraneProvenanceSource` call and render `ProvenanceBar`/`ProvenanceChip` directly with the passed `hosted` (sci `dashboards/PlateProvenance.vue`) |
| the dock's filter trigger is route-level: `data-testid="dock-filter-trigger"` (was `membrane-filter-trigger-<vizId>`), no `data-active-viz`, no pin; it paints whenever the route declares a `filterBody` | a selector on the old test id moves to `dock-filter-trigger`; `[data-membrane-filter-trigger]` is unchanged |
| the dock's foot (Filters, Compare years, Save this view, theme, Collapse; the gear on the phone) is glass's `#persistent-end` band, outside the toolbar run | none; a selector on `.glass-dock [role=toolbar] [data-testid=dock-persistent-foot]` drops the toolbar step |
| the toolbar run's seats are the chapter rungs (`.usf-dock__step`), its direct children; glass roves them (one Tab stop, the current chapter; ArrowUp/Down/Home/End between chapters). The wrappers `.usf-dock__viewport`, `.usf-dock__scroll` (`dock-scroll-middle`) and `.usf-dock__stepper` are gone | a selector through a removed wrapper selects `.glass-dock [role=toolbar] > .usf-dock__step` |
| `ControlPlaneSpine` deleted from `./chrome`; the dock's spine is the run's background | a consumer that drew its own spine draws it locally (a `linear-gradient` bar) |
| the "step N of M" live readout is teleported to `<body>` (`data-testid="dock-step-readout"`) | none |
| `MembraneFacet` drops `"viz-context"` and `"provenance-detent"`; `MembraneBand` drops `"context"` | a total switch over either union drops those arms |

## 5d · Figure surfaces (U/B7 · O-11, O-12, O-13, O-14, O-17, O-18, O-19)

| Change | Consumer edit |
|---|---|
| `HoverReadout.eyebrow` deleted; the hover card shows the name, one context line (`subhead`), at most four facts, a sources line (new `HoverReadout.sources: string[]`) and "Click for detail". A fact whose value repeats the title is not shown | drop `eyebrow` from every published payload; put the kind and period in `subhead` ("LEA 93N · Charter · 2025–26"); pass the dataset names in `sources` |
| `ReadoutFacts` lays out on its own grid (`max-content minmax(0,1fr)`, stacked under 18rem) and no longer depends on Tailwind grid utilities | none |
| `formatBandwidth`, `formatGbpsAxis` and `tierLabel(_, "bandwidth")` print "Gbps" (was "Gb/s") | update any test or string match on "Gb/s" |
| `formatKbps` deleted; `formatKbpsPerStudent` prints an integer kbps with a thousands separator and never re-units to Mbps | replace `formatKbps(x)` with `formatKbpsPerStudent(x)` (sci `SchoolMap.vue`, `RainbowStack.vue`, `selectionStat.ts`, `useScatterStatResolver.ts`; speedtest) |
| new `formatPeriod(key, "school-year" \| "funding-year" \| "year")` → "2025–26", "FY2026", "2024"; the school-year period noun reads it | print periods through it |
| ReadoutDrill's verbs read "Show only this unit", "Add to comparison", "Zoom to this unit"; UnifiedFilterPanel's headings "Filter" and "Filter this dashboard"; ScrollTimeline's default label "Year" (R-LABELS §3.9) | update text selectors |
| new `./chrome` seat API: `useSurfaceSeat(seat, owner)`, `useSeatedOpen(open, seat, owner)`, `useViewportSeat()`, `useSeatYield(fn)`, `useSurfaceSeats`. One open surface per seat (`right` at ≥ 768 px, `bottom` below); the filter drawer holds its seat through it | a sheet that shares the right or bottom edge binds its open model with `useSeatedOpen` (the dock's sheets in A4) |
| new `describeEntity` contract in `./interaction`: `EntityDescription { name, kind, ids[{label,value,param}], place, measures[{id,label,value,unit,period,sourceId,sourceLabel?,stateMedian,peerMedian,rank,n}], series[{measureId,label,unit,points[{period,value,covered}]}] }`, registered once per route with `useEntityDetail().register(fn)`; helpers `formatMeasure`, `rankText`, `RANK_MIN_N` (5) | each route registers one describer beside its stat resolver, for every grain it plots (sci, usf, ecf, bead, speedtest, usf-integrity; S3) |
| `EntityDetail` replaces the single-select branch of `SelectionDrilldownPanel`: one selected unit opens a non-modal glass Sheet (right, 26rem, at ≥ 768 px; bottom with half and full detents below). `SelectionDrilldownPanel` renders only for two or more units | none for the mount; the panel's `promote` event also fires from the detail's "Show only this unit" |
| `ReadoutSheet` deleted (`./charts`); `EntityDetail` is the only phone readout sheet | delete the `<ReadoutSheet>` mount (sci `home/DashboardView.vue:261`) |
| the hover card closes while the detail is open | none |
| `resolveEntityIcon` never returns the raw key as a label: an unresolved unit is titled by its kind (`GRAIN_NOUN`: "District", "Charter school", "Map cell", …); a school is no longer titled with its district's name | pass `label` (the route's name index) where a name is known |
| `ChapterScene` drops `steps`, `apply`, `anchor` and `side`; it takes `period?: "year"` (the period control: a glass Select of every carried period, ‹ › steppers, a one-pass ▶ at 900 ms per period that stops on hover, focus or any input and is absent under reduced motion) and `caption?: SceneProse` (one data line under the figure). `StickyScene` is an in-flow figure: no step observer, no pin, no `?at=<beat>.<step>` restore, no scroll hold of the year; the control writes `?sy=` through `yearScope.setSingle` on a reader act only. `SceneSide`, `SceneAnchor` and `SceneRuntime.setYear` are deleted. New `PeriodControl` in `./charts` | sci `02-map/scene.ts`: delete the four step cards and `apply`; declare `period: "year"` and a `caption` bound to the selected year (S3) |
| `ChapterStage` drops `anchor`; every `SceneOption` (and `SceneStep`) requires `label`, the name on the stage's glass segmented control. `?scene=` is written only by that control; `apply` runs when the reader chooses a scene and once on mount for the opening scene; the active scene's `prose` is the one line under the figure. The stage no longer clears `?scene=` when it leaves the viewport | sci `04-scatter/stage.ts`: add `label` to each scene in the R-LABELS §3 words; drop `anchor` |
| `SceneAct` and `SCENE_ACT_SEAT` deleted; a plate's act row renders in place | none |
| `PlateAct` and the plate's act row (`[data-plate-act]`, `.plate-act`, the `#act` seat) deleted for `PlateDock` (`./charts`): one collapsed handle (Ellipsis, 44 px) in the figure head's top-right seat (`[data-figure-dock-seat]`, the new `ChartFrame` `#dock` slot with `{ enlarge, expanded }`). A press opens it leftward: Options, Download (a menu of "CSV data" and "PNG image") or View data when the plate declares a source scope, Enlarge, and Close where the handle sat. Every control carries `data-subject="<plate id>"` and the figure's title in its name. Escape closes an open menu, then the dock, and returns focus to the handle. A sheet taking a screen seat closes it | a selector on `[data-plate-act]` or `[data-action="filter"]` moves to `[data-plate-dock][data-subject=<id>]`; the dock's handle is its `[aria-expanded][aria-controls]` element. `PlateLayer` is `"options" \| "download" \| "dock"` |
| `useVizPlate` drops `filterDockOpen`, `toggleFilterDock`, `activeDimChips`, `activeFilterCount`, `showAppliedSummary` and `panel` (the retired J-VIZDOCK cluster); the `.viz-dock` CSS is gone | a test double of the composable drops those keys |
| the provenance strip (`VizAppendixDock`) is one line at every width: 36 px tall, `--radius-bar` (falling back to `--radius-panel` until glass ships it), sentence case ("Source: <dataset>"), one trailing action "Source & method". "Browse & export" moved from the strip into the opened pane's head | a text selector on "source & method" in lower case, or on the strip's browse button, follows the move |
| dark sequential ramp widened (`--viz-sequential-low` `oklch(0.3 0.04 250)`, `--viz-sequential-high` `oklch(0.84 0.14 235)`: ΔL 0.54, was 0.43); `--ncsu-red` gets a dark value (`hsl(6 88% 62%)`) that clears 3:1 on the dark card | none |
| the enlarged figure (`?fig=`) paints the plate's paper (`--card`) over glass's scrim and covers the viewport; its body (`[data-frame-fullscreen]`) is the layer's scroller (`block-size: 100%`, `overflow-y: auto`; the 120vh floor is gone). The resting box holds its measured height while the figure is open, so the page behind it never reflows, and focus returns to the opener with `preventScroll` once the figure has closed. While a figure is enlarged `--z-hovercard` is `--z-modal` + 1 | a test that measured the 120vh body measures `[data-frame-fullscreen]` against the viewport |
| new `FeedDictionary` (`./contract` types; `./provenance` resolvers `resolveColumn`, `unresolvedColumns`, `sourcesLine`, `columnHeading`, `vintageLabel`, `coverageText`): a snapshot's `meta.dictionary[column]`, `meta.vintages[]` and `meta.coverage[column]` (R-SOURCES §3.1) | the producers stamp the three records (S1); a route's test checks `unresolvedColumns(meta, keys)` is empty for every `DataScope` column and facet attribute |
| `ProvenanceFacet.attributes` holds column keys of the served feed; `useProvenance(…, { dictionary })` names them from the dictionary and adds `ResolvedProvenance.sources` (the sources line) | replace free-text attributes with column keys; pass the feed's `meta` as `dictionary`; delete the repeated sentence in `sci/features/provenance.ts:25` |
| new `DataViewerRoute` (`./provenance`): the `/data`, `/data/:dataset` and `/data/:dataset/inputs/:file` view over glass `DataTable`, with props `datasets: DataViewerDataset[]` (`{ id, label, periodColumn?, load(): Promise<{ rows, columns, meta, sha? }> }`), `dataset`, `file`, `basePath`. A query key naming a served column filters to that value; CSV and JSON download through `serializeRows` (now exported, taking `{ key, label, value }` columns) | register the three routes with `props` mapping the params (sci `dashboards/router.ts`); list the datasets in `data-sources.ts`; usf-integrity is not listed |
| `SourceLink`'s served tier reads "Data file (view)" and links to `<basePath>/<source id>` (default `/data`); "served here" is gone. It now needs the app router | a text match on "served here" moves to "Data file (view)" |
| one key map for figure keyboard input: `KeyInput.shift` is `KeyInput.multi` (`isMultiSelect`: Shift, Cmd or Ctrl); Enter or Space with it adds to the selection. `SelectionRegion` reads the same `keyStep` map: arrows stop at the ends instead of wrapping, Escape clears | a caller of `keyStep` passes `multi: isMultiSelect(e)` |

## 6 · glass-ui 10.1.0

Peer `@mkbabb/glass-ui` is `^10.1.0`. Each row names the atlas surface, what changed, and the edit.

| Surface | Change | Consumer edit |
|---|---|---|
| `HandMark` | glass 9 one-pen re-cut | keep `shape` (`underline`, `strike`, `circle`, `highlight`), `color`, `weight`, `clock`, `seed`; delete `variant`, `drawMs`, `boil`, `progress`; a `shape="path"` mark becomes `<InkStroke kind="path" :points>` |
| `InkStroke` | new (`@mkbabb/atlas/charts`) | free rules, rings and paths: `kind`, `points`, `color`, `weight`, `seed`, `clock` (`static` or `scroll`) |
| `useMarkMorphology`, `MarkVariant`, `BOIL_BUDGET`, `HIGHLIGHT_WEIGHT_VB`, `ENGINE_HAS_AMPLITUDE` | removed | delete the import; the pen has one register |
| `clockAppear`, `clockAnimation`, `MarkAppear` | removed | `clockDraws(clock)` returns the boolean glass's `draw` prop takes |
| `CompletionSeal` | atlas-owned (glass 8 deleted `@mkbabb/glass-ui/completion-seal`) | `import { CompletionSeal } from "@mkbabb/atlas/editorial"` |
| `AtmospherePreset.dockOpacity` | removed (glass 8 stopped reading `--glass-opacity-dock`) | delete the field from custom presets |
| `@mkbabb/glass-ui/drawer` in your own templates | removed by glass 8 | `<Dialog>` + `<SheetContent side :detents v-model:detent>` from `/dialog` and `/sheet`; a live-behind drawer is `<Dialog :modal="false">` |

# Migrating to Atlas 7.0.0

Every row below is drawn from the real `v6.0.1..HEAD` diff (the export map, the type/barrel
changes, the peer bumps in `package.json`, and the published `dist/style.css`), not from
intent. Four classes: dropped package subpaths, dropped exports, peer majors, published CSS
token de-collisions — plus the additive new seams a consumer may now opt into.

## 1 · Dropped package subpaths (`exports` map)

`package.json` `exports` lost three keys against v6.0.1 (`c450b6b`, `d86dbaf`). Each dropped
subpath had a live re-export home already, so the cure is a specifier rewrite, never a lost
facility.

| Subpath that died | Where the facilities live now | Consumer edit |
|---|---|---|
| `@mkbabb/atlas/viz-set` | `@mkbabb/atlas/charts` — the charts barrel re-exports `./viz-set.js` (`resolveVizSurface`, `VizSetContract`, `viewsToOptionSpec`, `SceneSequenceContract`) | `from "@mkbabb/atlas/viz-set"` → `from "@mkbabb/atlas/charts"` |
| `@mkbabb/atlas/stage` | `@mkbabb/atlas/story` — re-exports `ChapterStage`, `SceneOption`, `StageAnatomy`, `StageEvents`, `StageExport`, `SceneSequenceContract`, `stageEventsFromHub`, `ChapterStageView`; `stage-morph` rides `@mkbabb/atlas/charts` | `from "@mkbabb/atlas/stage"` → `from "@mkbabb/atlas/story"` |
| `@mkbabb/atlas/styles/tokens` | `@mkbabb/atlas/styles` — the token layer is already inside `dist/style.css`; the orphan `tokens.css` emit is retired | delete the `import "@mkbabb/atlas/styles/tokens"` line; `@mkbabb/atlas/styles` carries the tokens |

**`useStageDeck` note.** The dead `src/stage/index.ts` barrel is deleted (`37ad20e`); its two
genuine assertions rehomed to their real producers. `useStageDeck` (the live hook) survives as
an internal module but is **no longer a public export** — it was reachable only through the
withdrawn `/stage` subpath. A consumer that imported the hook directly consumes `StickyScene`
or `ChapterStage` instead (the 5.0.0 guidance already points there).

## 2 · Dropped exports (barrel deletions)

Symbols removed from public barrels in `v6.0.1..HEAD`. Every one was either the abrogated gate
apparatus or an unpopulated/inert facet — no live consumer within the constellation, but a
pinned type or a stray import will break at the tag.

| Export that died | Barrel | What replaces it — the consumer edit |
|---|---|---|
| `assertAtlasEventExhaustive` | `./events` (`bd088d5`) | none — the compile-time exhaustiveness helper is dead. Drop the call; switch on `AtlasEvent.type` directly with a local `const _: never = event` guard if exhaustiveness matters to the consumer. |
| `auditProvenanceCoverage`, `isSourced`, `CoverageItem`, `CoverageReport` | `./provenance` (`c71528e`, `coverage.ts` deleted) | none — the all-items coverage census was gate apparatus (abrogated). Drop the calls. |
| `auditAppendixLinks`, `assertAppendixLinks`, `AppendixCite`, `AppendixRoster`, `AppendixLinkIssue` | `./provenance` (`c71528e`, `appendix.ts` audit half deleted) | none — the appendix link audit was gate apparatus. Drop the calls. `ProvenanceAppendix`, the aggregation resolver, and the appendix render survive. |
| `checkBeatConstraints`, `BeatConstraintReport` | `./story` (`96e060e`, `beat-template.ts`) | none — the E2 constraint *evidence checker* is deleted. `resolveBeatTemplate`/`resolveBeatTemplates` guarantee the invariants structurally; drop the measured check. |
| `VizContract.glyphs` (+ `GlyphsFacet`, `GlyphGrain`) | `./charts` / `./contract` (`2d78d53`) | remove the `glyphs` facet from any `VizContract` literal — the J-GLYPH grain facet was never populated. |
| `VizContract.crossHighlight` | `./charts` / `./contract` (`2d78d53`) | remove `crossHighlight` from any `VizContract` literal — cross-highlight is now unconditional (the old `?? true` default is the only behavior). |
| `StoryCardFacet.numeral` | `./editorial` (`b8db2f6`) | drop the `numeral?: number` field from any `StoryCardFacet` literal — it was inert. |
| `GhostNumeral` (component) + `GhostNumeralScale`, `GhostNumeralSource` | `./editorial` (`d07b3e1`) | none — the ghost-numeral watermark apparatus is retired (OF-22); the eyebrow is the sole reading numeral. Drop the mount and the type imports. |
| `RuleVariant` member `"numeral"` | `./editorial` (`d596879`/`d07b3e1`, `RULE_VARIANTS` = `["rule","draw"]`) | any `rule: "numeral"` authoring → `"rule"` (render-identical) or drop the rule. |

## 3 · Peer majors

| Peer | v6.0.1 range | 7.0.0 range | Consumer action |
|---|---|---|---|
| `@mkbabb/keyframes.js` | `^5.3.5` | `^6.0.0` | install keyframes 6. Easing/timing types re-home by capability owner — a consumer importing `TimingFunction` takes it from keyframes' engine surface. |
| `@mkbabb/value.js` | `^3.1.0` | `^4.0.0` | install value 4. Root helpers moved to capability subpaths: `clamp` → `@mkbabb/value.js/math`, `smoothStep3` → `@mkbabb/value.js/easing`. A consumer importing value.js root helpers chases them to the subpaths (atlas already did, `c7ac089`/`092df4f`). |
| `@mkbabb/glass-ui` | `^6.0.0` | `^7.0.0` | install glass 7 **without `--legacy-peer-deps`** — the trio (glass `^7.0.0` / keyframes `^6.0.0` / value `^4.0.0`) resolves natively; no `--force`, no consumer override. Glass 7's own removed subpaths (`/controls`, `/metric-badge`, …) and their successors are covered by glass-ui's `MIGRATION.md` §7.0.0. |

`@mkbabb/pencil-boil` holds at `^0.9.2`; `pinia`/`vite`/`vue`/`vue-router` ranges are unchanged.
Node ≥24 / npm ≥11 boundary is unchanged.

## 4 · Published CSS token de-collisions (breaks)

Semantic tokens Atlas stopped SHADOWING. Atlas had overridden a Glass-OWNED `--radius-*` name in
`dist/style.css`; the override is withdrawn so Glass's own canon wins. Atlas's own surfaces are
byte-identical (they read a new atlas-private role token); the visible change is to GLASS's own
controls rendered inside an Atlas app.

| Published token | v6.0.1 behavior | 7.0.0 behavior | Consumer action |
|---|---|---|---|
| `--radius-control` | Atlas OVERRODE Glass's semantic `--radius-control` (Glass's control canon = the stadium `--radius-pill`) to `var(--radius-md)` = 6px, re-skinning EVERY Glass control (Checkbox, TagsInput, disclosure, base Tabs) to the flat 6px corner across an Atlas app (CHALLENGE-2 — a canon violation) | Atlas no longer shadows it: Glass's `--radius-control` resolves to its canonical pill again. Atlas's OWN plate-register controls keep 6px via the new atlas-PRIVATE `--radius-plate-control` | none for Atlas's own surfaces (byte-identical via `--radius-plate-control`). A consumer that DEPENDED on the 6px re-skin of Glass controls sets `--radius-control` itself (its own value wins); a consumer that read `--radius-control` expecting a 6px corner reads `--radius-plate-control` |

## 5 · New seams (additive — opt-in, not breaks)

Not migration obligations, but the consumer-visible surface that 7.0.0 adds. Listed so a
consumer knows what is now available.

| Seam | Barrel / surface | What it is |
|---|---|---|
| `LegendSpec.dock: "foot"` | `./charts` / `./contract` (`dd1b096`) | a third legend dock that seats the legend BENEATH the plate body (between the figure and the provenance foot), leaving the header KEY column free for a tall identity-glyph lockup. `legendDock` gains `"foot"` in parallel. Opt-in via `legend: { …, dock: "foot" }`; the home is the two USF maps. |
| `ExportFilterContext` | `./charts` (`67806fe`/`5856d6a`, `lib/vizExport.ts`) | the interface a plate threads into the CSV export preamble — `filterContext?: () => ExportFilterContext \| null` carries the live filter query, drawn-of-total, and as-of into the download. |
| `resolveAsOf(meta)` | `./chrome` (`e2fdb52`, `freshness.ts`) | resolves a feed's as-of vintage stamp (`FY####` for frozen feeds, the live extract date otherwise) — the freshness stamp the export preamble and chrome read. |
| `--shell-head-reserve` | `./styles` (`0fa6e2e`, PlatformShell) | CSS custom property naming the phone head reserve (default `5rem`); a consumer may override the scroll-margin/padding reservation. |
| `--source-lead-col` | `./styles` (`ea1c821`, source browser) | CSS custom property on the source-data browser lead column (default `16rem`); a consumer sets it to widen/narrow its own lead column. |
| `--radius-button` | `./styles` (`radius.css`, OF-24) | CSS custom property Glass's `.rounded-button` utility reads. Atlas defines it on the flat control-radius register (`var(--radius-plate-control)` = 6px), so every `.rounded-button` consumer (the ExpandableContainer fullscreen restore control, notifications, toasts) renders ROUNDED. Corrective, not a break: a consumer that already set `--radius-button` is unaffected (its own value wins). |
| `HeroFacet` / `DashboardHero` prop `reserveBanner` | `./editorial` (R7 CLS-02, `DashboardHero.vue`/`editorial-contract.ts`) | optional `reserveBanner?: boolean`. A ranked-4 banner cover whose `figures` build from a live feed starts EMPTY, so the series reserves the ONE-row flat floor and JUMPS to the two-row banner floor when the feed attaches (+130px desktop, the lead-beat shove). Declaring `reserveBanner: true` on the hero facet holds the two-row reserve from first paint. **The empty-first banner cover is `demand`** — set `reserveBanner: true` on its hero facet (`DEMAND_HERO_COPY` / the `createDemandStory` hero). Omit (the default) ⇒ the cardinality-derived reserve — every one-row flat/ranked cover (`sci`, `ecf`) is byte-identical and needs no change. |
| `GeoChoropleth` props `sourceGridId` + `sourceGridOpen` | `./charts` (CD-09/PA-9, `GeoChoropleth.vue`) | optional `sourceGridId?: string` + `sourceGridOpen?: boolean`. When the hosting plate wires a reachable, windowed `role="grid"` data affordance (the SourceDataBrowser class), passing its region id as `sourceGridId` SUPPRESSES GeoChoropleth's passive off-screen table (the grid is the per-datum read then). The figure's `aria-details` binds to the grid (SC 1.1.1) ONLY while `sourceGridOpen` is true — the host raises it only while the grid region is mounted, so the IDREF never dangles at an unmounted region at rest (CHALLENGE-3 A1); the table stays suppressed by the capability regardless (no resurrection). Omit both (the default) ⇒ the passive table stays (the small / no-grid a11y path). VizPlate mirrors this on its own `sourceData` — the suppression is capability-keyed and the figure `aria-details` is open-gated automatically there, no new prop. |

**`--radius-button` disposition (CHALLENGE-3 A2, lead-adjudicated KEEP-as-temporary).** The atlas
`:root` definition of `--radius-button` (above, OF-24) is the DELIBERATE consumer theming surface,
NOT a canon violation of the `--radius-control` class: Glass delivers this token only inside a
Tailwind `@theme` block that does not land at consumer runtime here, so absent the atlas definition
`.rounded-button` resolves to a square corner (the empirical OF-24 control). It is however
TEMPORARY — the queued Glass `@theme`-delivery question governs its fate: the definition either
STAYS (recorded theming, Glass still not emitting `:root` tokens) or is REMOVED (if Glass begins
emitting the token at `:root`). Recorded here so the tension is of record — treated neither as a
canon violation nor silently forgotten.

---

# Migrating to Atlas 5.0.0

## Keep selection keys canonical

Every selection and URL-store ingress now accepts only the `{kind}:{id}` wire form. `parseSelKey` returns a `SelectionKey` or throws; it no longer returns `null` for a bare or malformed string. Validate external input before handing it to Atlas, and mint producer keys with `encodeSelKey`.

The unused story wrappers `markKeyFor` and `parseMarkKey` are removed. Use `encodeSelKey` and `parseSelKey` directly when mark identity shares selection identity.

## Use one visualization-set contract

Delete imports from the removed story alternate registry (`VIZ_ALTERNATES`, `alternatesFor`, `vizMenuOptions`, and `useVizAlternates`). Move same-instance alternatives into one `VizSetContract`, resolve them with `resolveVizSurface`, and derive controls with `viewsToOptionSpec`. Cross-instance alternatives are no longer registered or selected by Atlas; retire them or re-home the explicit component choice in the owning consumer. `resolveFromAlternates` is removed.

Replace the removed `VizPlacement` alias with `VizAnnotationPlacement`.

## Move to the surviving owners

- Remove `DockTOC` and `useDockViewMode` consumers. The narrative dock has one stepper surface.
- Remove standalone `FilterContinuum` mounts. `FilterPanel` owns the Glass Drawer continuum and is present only when a dashboard supplies a filter body.
- Replace `useDeckDetent` with `useStageDeck`; use `StickyScene` or `ChapterStage` for persistent narrative stages.
- Replace `CATEGORY_SKINS` and `resolveCategorySkin` with `SKINS` and `resolveSkin`.

## Follow the shared palette clock

Call `useVizPalette()` without a mode argument. `useSharedColorMode` is removed; Glass's post-settle dark-mode signal is the sole canvas-palette invalidation clock.

## Satisfy the strict feed identity law

Only v2 feeds are accepted. Remove the v1 compatibility field `meta.year`; declare `years` and `latestYear`. Row and columnar feeds must include a non-empty key at `meta.keyField`, an integer `year`, every declared measure as a finite number or `null`, no duplicate normalized `(keyField, year)` pair, and an exact sorted row-year spine matching `meta.years`. `aggregable` must contain exactly one valid rule for every declared measure. Columnar envelopes accept only `meta`, `columnar`, `rowCount`, `fields`, and `columns`.

`encodeColumnar` is removed from the runtime package. Encode snapshots in the producer pipeline; Atlas retains only strict transport validation and `decodeColumnar`.

## Update reveal placement and filter facets

Remove the `unfold` reveal shape; use `lift` or `settle`. `reveal.aside` now controls only inset and scrub-host behavior. It no longer places the title on the right; set `reveal.layout.title` explicitly.

Replace `useVizRegistry().updateDims(vizId, token, dims)` with `updateFilterFacet(vizId, token, { dims, filterResponse })` so the two filter facets change as one value. Every `register()` call must now provide its normalized `filterResponse`.

## Pass the live canvas font

Pass the resolved mono family from `useVizPalette().value.fontMono` to `directEndLabel(series, fontMono)`. Labeled `markPointRivet` declarations and every `dropRule` declaration likewise require `fontMono`; unlabeled rivets need neither `label` nor `fontMono`.

---

# Migrating to Atlas 2.0.0

## Remove row parameters from visualization contracts

`VizContract` no longer carries an unused row type or `_row` inference field. Keep row typing at the option builder or data projection that consumes it.

```ts
// Before
const contract: VizContract<DistrictRow> = { /* … */, _row: undefined };

// After
const contract: VizContract = { /* … */ };
```

Apply the same change to `WatchersVizContract<Row>` consumers.

## Declare complete skins

`CategorySkin` now includes the brand-skin contract. Add `id`, `category`, `surfaceKind`, `backgroundFamily`, `atmosphere`, and `chrome` to custom category skins, or use `SkinContract` when the category-home presentation fields are not needed. `defineSkin()` preserves literal types and freezes the declaration.

```ts
const skin = defineSkin({
    id: "connectivity",
    category: "connectivity",
    surfaceKind: "brand",
    backgroundFamily: "aurora",
    atmosphere: {},
    chrome: { accent: "var(--rainbow-signature-1)" },
});
```

## Classify visualization alternates

Every custom `VizAlternate` now requires `morph: "same-instance" | "cross-instance"`. Use `same-instance` only when the alternate is a `VizView` in the base chart's `VizSetContract`; use `cross-instance` for an explicit component swap.

The dedicated public entry points introduced here are `@mkbabb/atlas/events` and `/skin`. The `/viz-set` and `/stage` subpaths introduced in this release were later withdrawn (in 7.0.0); their facilities re-home to the `@mkbabb/atlas/charts` and `/story` barrels, which re-export them. Existing chart and story barrels continue to re-export their corresponding facilities.

## Update peers

Install versions satisfying `@mkbabb/glass-ui ^6.0.0`, `@mkbabb/keyframes.js ^5.3.5`, `@mkbabb/pencil-boil ^0.9.2`, and `@mkbabb/value.js ^3.1.0`. These published peers compose directly; do not use `--force`, `--legacy-peer-deps`, or a consumer override to assemble the dependency tree.

Atlas 2.0.0 requires Node.js 24 or newer and npm 11 or newer, matching pencil-boil 0.9.2's published runtime boundary.

---

# Migrating to Atlas 1.1.0

## Declare route identity

Every `DashboardMeta` now owns its URL slug. Add the folder-matching value instead of relying on registry inference:

```ts
export const meta = {
    slug: "sci",
    // ...
} satisfies DashboardMeta;
```

`DashboardContext.algebraBody` and `HeroFacet.eyebrow` are optional new contract fields.

## Let the story derive order

Remove `figure` from chapter literals. `DashboardEssay` derives Roman ordinals from masthead-bearing chapter order; hero and colophon sentinels do not consume a number.

`expandStory()` now returns `{ chapters }`. Read an arrival edge from `chapter.transition` rather than `StoryDefinition.transitions` or `chapterTransition()`, and test `chapter.transition?.kind === "shared-element"` rather than calling `declaresSharedElement()`.

`figureLabelFor(chapter, figure)` now requires the already-derived ordinal. The unused `SceneContextV2` type is gone; stepped scenes continue to use `SceneContext`.

## Use typed chart selection keys

Every chart producer must declare its selection kind:

```ts
const { selectedKeys, onSelect, encodeKey } = useChartSelection("district");
```

Replace `useChartSelection()` with a kind, and replace `useChartSelection(mapKey)` with `useChartSelection(kind, mapKey)`. Do not pass empty IDs to `encodeSelKey`.

## Use `HandMark`

Replace `HandUnderline` imports and templates with `HandMark`, choosing the appropriate clock and seed. There is no compatibility alias.

## Use the filter query engine

`@mkbabb/atlas/data` no longer exports `useFilteredRows` or its associated option/result types. Declare dimensions through `@mkbabb/atlas/filter`, build them with `dimsToPredicate`, and apply them with `compile`. `fromDimSpecs` and `DimPredicateSpec` are also removed; the normalized predicate tree is the sole query representation.

## Adopt caller-owned motion state

- Remove `useGoldOneShot`; use the settled data ink or an existing Glass treatment.
- Pass document progress into `useDockStepper(context, documentProgress)` and keep reading that caller-owned ref; `scrollProgress` is no longer returned.

## Update peers

Install versions satisfying `@mkbabb/glass-ui ^5.0.0`, `@mkbabb/keyframes.js ^5.3.1`, and `@mkbabb/value.js ^3.1.0` before upgrading Atlas.
