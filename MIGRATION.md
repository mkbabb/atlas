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

`CATEGORY_SKINS` remains as the compatibility name for the built-in `SKINS` registry.

## Classify visualization alternates

Every custom `VizAlternate` now requires `morph: "same-instance" | "cross-instance"`. Use `same-instance` only when the alternate is a `VizView` in the base chart's `VizSetContract`; use `cross-instance` for an explicit component swap.

The new public entry points are available at `@mkbabb/atlas/viz-set`, `/events`, `/skin`, and `/stage`. Existing chart and story barrels continue to re-export their corresponding facilities.

## Update peers

Atlas 2.0.0 targets keyframes.js 5.3.3, pencil-boil 0.8.1, and value.js 3.1.0. Publication is held until Glass publishes a peer manifest that admits pencil-boil 0.8.1; do not use `--force`, `--legacy-peer-deps`, or a consumer override to assemble the dependency tree.

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
