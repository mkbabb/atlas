# Migrating to Atlas 7.0.0 — DRAFT

*Working surface for the #226 tag. This file is NOT the shipped migration note: at the tag
its rows fold into `MIGRATION.md` as the top `# Migrating to Atlas 7.0.0` section and this
draft is deleted. It exists so the consumer edits are authored and reviewed before the tag,
not scrambled after it.*

Every row below is drawn from the real `v6.0.1..HEAD` diff (the export map, the type/barrel
changes, and the peer bumps in `package.json`), not from intent. Three classes: dropped
package subpaths, dropped exports, peer majors — plus the additive new seams a consumer may
now opt into.

---

## 1 · Dropped package subpaths (`exports` map)

`package.json` `exports` lost three keys against v6.0.1 (`c450b6b`, `d86dbaf`). Each dropped
subpath had a live re-export home already, so the cure is a specifier rewrite, never a lost
facility.

| Subpath that died | Where the facilities live now | Consumer edit |
|---|---|---|
| `@mkbabb/atlas/viz-set` | `@mkbabb/atlas/charts` — the charts barrel re-exports `./viz-set.js` (`resolveVizSurface`, `VizSetContract`, `viewsToOptionSpec`, `resolveFromViews`, `SceneSequenceContract`) | `from "@mkbabb/atlas/viz-set"` → `from "@mkbabb/atlas/charts"` |
| `@mkbabb/atlas/stage` | `@mkbabb/atlas/story` — re-exports `ChapterStage`, `SceneOption`, `StageAnatomy`, `StageEvents`, `StageExport`, `SceneSequenceContract`, `stageEventsFromHub`, `ChapterStageView`; `stage-morph` rides `@mkbabb/atlas/charts` | `from "@mkbabb/atlas/stage"` → `from "@mkbabb/atlas/story"` |
| `@mkbabb/atlas/styles/tokens` | `@mkbabb/atlas/styles` — the token layer is already inside `dist/style.css`; the orphan `tokens.css` emit is retired | delete the `import "@mkbabb/atlas/styles/tokens"` line; `@mkbabb/atlas/styles` carries the tokens |

**`useStageDeck` note.** The dead `src/stage/index.ts` barrel is deleted (`37ad20e`); its two
genuine assertions rehomed to their real producers. `useStageDeck` (the live hook) survives as
an internal module but is **no longer a public export** — it was reachable only through the
withdrawn `/stage` subpath. A consumer that imported the hook directly consumes `StickyScene`
or `ChapterStage` instead (the 5.0.0 guidance already points there).

---

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
| `RuleVariant` member `"numeral"` | `./editorial` (`d596879`/`d07b3e1`, `RULE_VARIANTS` = `["rule","draw"]`) | any `rule: "numeral"` authoring → `"rule"` (render-identical) or drop the rule. **This is the fleet chase: 8 authorings across 6 dashboards** — see the tag-day runbook §c-numeral. |

---

## 3 · Peer majors

| Peer | v6.0.1 range | 7.0.0 range | Consumer action |
|---|---|---|---|
| `@mkbabb/keyframes.js` | `^5.3.5` | `^6.0.0` (landed at HEAD, `b066b2b`) | install keyframes 6. Easing/timing types re-home by capability owner — a consumer importing `TimingFunction` takes it from keyframes' engine surface. |
| `@mkbabb/value.js` | `^3.1.0` | `^4.0.0` (landed at HEAD, `b066b2b`) | install value 4. Root helpers moved to capability subpaths: `clamp` → `@mkbabb/value.js/math`, `smoothStep3` → `@mkbabb/value.js/easing`. A consumer importing value.js root helpers chases them to the subpaths (atlas already did, `c7ac089`/`092df4f`). |
| `@mkbabb/glass-ui` | `^6.0.0` | `^7.0.0` (**at the cut — not yet committed at HEAD**) | the glass peer bump is the first #226 step; install glass 7 **without `--legacy-peer-deps`**. Until the glass 7 tag, the tree assembles only with `--legacy-peer-deps` and the boundary suite `tests/component/story-card-stats.spec.ts` fails to *load* (glass 6's dist imports the removed value-3 root) — this is the known-boundary RED, honest, and clears at the glass 7 tag. |

`@mkbabb/pencil-boil` holds at `^0.9.2`; `pinia`/`vite`/`vue`/`vue-router` ranges are unchanged.
Node ≥24 / npm ≥11 boundary is unchanged.

---

## 4 · Published CSS token de-collisions (breaks)

Semantic tokens Atlas stopped SHADOWING. Atlas had overridden a Glass-OWNED `--radius-*` name in
`dist/style.css`; the override is withdrawn so Glass's own canon wins. Atlas's own surfaces are
byte-identical (they read a new atlas-private role token); the visible change is to GLASS's own
controls rendered inside an Atlas app.

| Published token | v6.0.1 behavior | 7.0.0 behavior | Consumer action |
|---|---|---|---|
| `--radius-control` | Atlas OVERRODE Glass's semantic `--radius-control` (Glass's control canon = the stadium `--radius-pill`) to `var(--radius-md)` = 6px, re-skinning EVERY Glass control (Checkbox, TagsInput, disclosure, base Tabs) to the flat 6px corner across an Atlas app (CHALLENGE-2 — a canon violation) | Atlas no longer shadows it: Glass's `--radius-control` resolves to its canonical pill again. Atlas's OWN plate-register controls keep 6px via the new atlas-PRIVATE `--radius-plate-control` | none for Atlas's own surfaces (byte-identical via `--radius-plate-control`). A consumer that DEPENDED on the 6px re-skin of Glass controls sets `--radius-control` itself (its own value wins); a consumer that read `--radius-control` expecting a 6px corner reads `--radius-plate-control` |

---

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

---

## 6 · Fold checklist (at #226, before deleting this draft)

- [ ] Prepend a `# Migrating to Atlas 7.0.0` section to `MIGRATION.md` from §§1–5 above.
- [ ] Update the 2.0.0 note's peer line (`MIGRATION.md` §"Update peers") if it still cites the
      pre-7 peer ranges in a way that reads as current.
- [ ] The 2.0.0 entry-point sentence (`MIGRATION.md`, "Classify visualization alternates") is
      already corrected in this branch to drop the withdrawn `/viz-set` and `/stage` — verify
      the fold does not reintroduce them.
- [ ] Delete `MIGRATION-7-DRAFT.md`.
