#!/usr/bin/env bash
# release.sh — the @mkbabb/atlas local-publish flow. MIRRORS the glass-ui precedent
# (~/Programming/glass-ui/scripts/release.sh): the owner publishes locally; CI never
# publishes; the tag and the dist artefact are always coherent.
#
# Usage:
#   bash scripts/release.sh v1.0.0
#
# What it does:
#   1. Reads the version arg (must match the form `vX.Y.Z`).
#   2. Verifies `package.json.version` matches (sans the `v` prefix).
#   3. Ensures the working tree is clean (no uncommitted changes).
#   4. Runs the full publish gate matrix (the prepublishOnly battery):
#        a) typecheck   — vue-tsc --noEmit, fail-fast on type errors
#        b) build       — js + dts + css, produces dist/ + types/
#        c) lint:pub    — attw --pack . + publint . (the subpath publication gate)
#        d) test        — vitest unit
#        e) gates       — the library gate corpus (tests/gates)
#   5. Performs a post-build smoke check on dist/contract.js (the . root entry).
#   6. Tags the release with an annotated tag.
#
# NOTE (O-B0 · Q59-private): while the repo is PRIVATE, the library is consumed as a
# git-dependency, NOT published to npm. `npm publish` is DEFERRED to the owner-gated
# public-flip successor (O-B17) where `publishConfig.access` is set. This script gates +
# tags today; the `npm publish` line stays commented until the flip.
#
# Aborts on any failure.

set -euo pipefail

VERSION="${1:-}"
if [[ -z "$VERSION" ]]; then
    echo "Usage: $0 v<X.Y.Z>" >&2
    echo "  e.g.: $0 v1.0.0" >&2
    exit 1
fi

if [[ ! "$VERSION" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "ERROR: version must match v<major>.<minor>.<patch> (got '$VERSION')" >&2
    exit 1
fi

PKG_VERSION=$(node -p "require('./package.json').version")
EXPECTED="${VERSION#v}"

if [[ "$PKG_VERSION" != "$EXPECTED" ]]; then
    echo "ERROR: package.json reports version '$PKG_VERSION' but tag arg is '$VERSION' ($EXPECTED expected)" >&2
    echo "       Update package.json or pass the matching tag." >&2
    exit 1
fi

# The ATLAS_DEV_LINK dev-alias flag MUST be unset for a release (never leak the self-alias
# into a shipped artefact — the O-B0 hard gate, ANSWERS Q72).
if [[ -n "${ATLAS_DEV_LINK:-}" ]]; then
    echo "ERROR: ATLAS_DEV_LINK is set — refusing to release with the dev-alias active" >&2
    exit 1
fi

echo "[release] Verifying clean working tree..."
if [[ -n "$(git status --porcelain)" ]]; then
    echo "ERROR: working tree dirty; commit changes before release" >&2
    git status --short >&2
    exit 1
fi

echo "[release] Running the publish gate matrix (typecheck · build · lint:pub · test · gates)..."
npm run typecheck
npm run build
npm run lint:pub
npm run test
npm run gates

echo "[release] Smoke check on dist/contract.js..."
if [[ ! -f dist/contract.js ]]; then
    echo "ERROR: dist/contract.js missing after build" >&2
    exit 1
fi

echo "[release] Tagging $VERSION..."
git tag -a "$VERSION" -m "@mkbabb/atlas $VERSION"

echo "[release] Done. Tag $VERSION created."
echo "  Push tag:    git push origin $VERSION"
echo "  Push branch: git push origin master"
echo "  Publish:     DEFERRED to the O-B17 public-flip (private repo → git-dependency consumption)."
echo "               At the flip: set publishConfig.access + run 'npm publish'."
