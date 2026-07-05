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
| `atlas/src/vite/**` (preset + seal-compositor) | `src/vite/**` | O-B (vite move) |
| `atlas/src/lib/**` (framework-free helpers) | `src/lib/**` | O-B (lib move) |
| `atlas/src/views/**` (partial: GalleryView, DashboardView, NotFound, RouteError) | `src/views/**` | O-B (views move) |
| `packages/atlas-core/**` (the build vehicle: `vite.lib.config.mts`, `tsconfig.dts.json`, `scripts/build-styles.mjs`, `scripts/repoint-dts.mjs`) | repo root (`vite.lib.config.mts`, `tsconfig.dts.json`, `scripts/*`) | **O-B0 (this wave — copied + adapted)** |
| `atlas/tests/gates/**` (library gates: altitude, cream-law, chrome/dock/filter topology) | `tests/gates/**` | O-B (gate re-home) |

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

## Publish posture

- **Name:** `@mkbabb/atlas` (ROUND-RULED; `@atlas/core` was a dev-local vite alias, never a
  publishable name — `~/.npmrc` carries only `@mkbabb` auth).
- **Version:** `1.0.0` from the first cut (§5.5 owner override of the 0.x recommendation).
- **Private at genesis** ([ANSWERS Q59]): consumed as a **git-dependency** off the private
  remote, NOT published to npm. No `publishConfig` at genesis; `npm publish` (and the
  `publishConfig.access` flip) is deferred to the owner-gated public-flip successor O-B17.
- **LICENSE deferred** to the O-B10 cut (mirrors `@mkbabb/glass-ui`; Q59-private does not
  force a LICENSE into genesis) [ANSWERS Q60].
- **Publish pipeline** mirrors glass-ui: local `scripts/release.sh` + a `prepublishOnly`
  gate; CI is PR-gate-only with no `npm publish` and no `NPM_TOKEN` [ANSWERS Q71].
