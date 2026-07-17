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
