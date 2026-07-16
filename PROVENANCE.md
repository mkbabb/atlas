# PROVENANCE — @mkbabb/atlas

This repository was **fresh-init extracted** from the `mkbabb/sci-report` monorepo at the
O-arc reformation (repo-split ruling [ANSWERS Q65]: fresh-init, NOT `git filter-repo`). A
total frontend restructure moves/splits nearly every file across O-B2–B9, which voids
`git blame` continuity anyway; a fresh packfile also dodges the origin's 752 MB binary
bloat. The "why" archaeology stays in the monorepo's `docs/tranches/**`; this file is the
durable back-reference.

## Origin

- **Extracted-From:** `mkbabb/sci-report@9f36a556e44538afdd0eb55f612309f3c3159173`
- **Origin remote:** `git@github.com:mkbabb/sci-report.git`
- **Genesis wave:** O-B0 (repo genesis) of the O-arc reformation tranche.

The origin SHA locates any pre-split file: `git -C <sci-report clone> show <sha>:<path>`.
The monorepo history is retained in full (no history purge — [ANSWERS Q64]), so every
`Extracted-From` reference stays valid.

## The L18 move-tables (origin path → new-repo path)

The library trees this repo will be filled from across O-B2–B9 (repo-split §A.1). At O-B0
these targets exist as **empty-of-source barrel skeletons**; the module-move waves import
the real source and delete the monorepo originals at the O-B11 consumer flip.

| Origin (in `mkbabb/sci-report`) | New-repo home | Filled by |
|---|---|---|
| `atlas/src/contract/**` | `src/contract/**` | O-B (contract move) |
| `atlas/src/platform/**` (charts, chrome, editorial, composables, data, stores, motion, filter, story, interaction, design, context, provenance) | `src/platform/**` | O-B (per-family moves) |
| `atlas/src/vite/**` (preset; former seal compositor retired) | `src/vite/**` | O-B (vite move) |
| `atlas/src/lib/**` (framework-free helpers) | `src/lib/**` | O-B (lib move) |
| `atlas/src/views/**` (partial: GalleryView, DashboardView, NotFound, RouteError) | `src/views/**` | O-B (views move) |
| `packages/atlas-core/**` (the former build vehicle, including a declaration rewrite) | repo root (`vite.lib.config.mts`, `tsconfig.dts.json`, `scripts/*`) | **O-B0 (this wave — copied + adapted)** |
| `atlas/tests/gates/**` (former altitude, cream-law, and topology checks) | — | Retired after extraction; not carried by the current package |

**Explicitly NOT extracted:** `atlas/src/dashboards/**` — the 7 narrative dashboards stay
in `sci-report` (the consumer side), each consuming `@mkbabb/atlas` after the flip. The
python backbone (`tools/atlas_data/**`) and the reports (`reports/**`) never move to the
library.

## The subpath exports map (born clean)

The de-godding lands **with** the physical move so the exports map is born clean
(src-rearchitecture §D). The 14 named JS subpaths + the `.` root:

`./contract` · `./chrome` · `./charts` · `./provenance` · `./filter` · `./story` ·
`./motion` · `./editorial` · `./interaction` · `./data` · `./stores` · `./composables` ·
`./lib` · `./vite`, plus the CSS aggregate `./styles` + `./styles/tokens`.

Atlas 2.0.0 adds the public `./viz-set`, `./events`, `./skin`, and `./stage` subpaths to
that extracted package surface. Its registry dependency boundary is Glass UI 6, keyframes.js
5.3.5, pencil-boil 0.9.2, and value.js 3.1.0; consumers install those immutable artifacts
instead of linking this worktree. The package and its release workflow move to Node.js 24 and
npm 11 because pencil-boil is a required Atlas peer with that published engine floor.

## Publish posture

- **Name:** `@mkbabb/atlas`; the package is public on npm with
  `publishConfig.access: "public"`.
- **Current published release:** `5.0.0`. Immutable tarball inspection shows that it already publishes
  `RowsProjection`/`project`, `SourcePanelProps`, the worker-infrastructure recovery, and the
  gesture-bound dismissal fix. Those bytes disagree with the older tracked source at the artifact's
  recorded gitHead; retain that discrepancy as provenance rather than inferring a breaking successor.
  Against the current producer pack, the immutable tarball differs in the bounded narrative
  re-anchor runtime; package dependency metadata for the public Vite preset and declaration
  carriers; the topology export's equivalent named-module emission and portable `Topology`
  declaration; and title-alignment's move from a declaration-side CSS import into the compiled
  stylesheet aggregate. The export map is unchanged, and these packaging, declaration, and CSS
  aggregation corrections preserve the public semantics. The same cut also removes the publicly
  exported but otherwise dead `INSTRUMENT_SPRING`, `InstrumentSpringStyle`,
  `instrumentSpringStyle`, and `DOCK_COLLAPSE_SPRING` symbols. That clean break changes the public
  symbol set, so the successor is
  correctly a `6.0.0` major rather than the previously planned patch.
  Packed `skipLibCheck: false` acceptance is deliberately scoped to the changed `./data` and `./vite`
  carriers under bundler resolution, plus their native runtime and Vite-build paths. It is not a
  whole-package strict-declaration claim: importing every component-bearing subpath also traverses
  unchanged declaration faults in Glass UI 6, keyframes.js 5.3.5, Reka UI, and VueUse. Those upstream
  faults are held for the coherent W33 successor tuple rather than masked here.
  Published data carriers are source-folded through `?raw` into native-ESM-safe JavaScript modules.
  The two county-registry consumers share one typed module, while lazy registries remain split
  chunks; no runtime JSON import, output rewrite, duplicate private asset, or attribute-mismatch
  warning remains.
  The former Glass completion-seal CSS rewrite is likewise retired; dependency CSS is consumed
  without Atlas-owned postprocessing.
  The in-flight `6.0.0` is not immutable until package, lock, tag, and registry agree. The
  private `1.0.0` git-dependency posture was genesis history, superseded when the package moved to
  the public registry.
- **License:** the repository ships its `LICENSE`; the genesis deferral ended at O-B10.
- **Publish pipeline:** `scripts/release.sh` performs the local clean-tree preflight. A matching
  `v*.*.*` tag invokes `.github/workflows/release.yml`, which verifies the tag/package version and
  publishes to npm with provenance. Pull requests run the ordinary type, build, package, and test
  checks in `.github/workflows/ci.yml`.
