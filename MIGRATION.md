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
