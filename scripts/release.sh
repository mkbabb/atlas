#!/usr/bin/env bash
# Local preflight only. Publishing is owned by .github/workflows/release.yml on a matching tag.

set -euo pipefail

TAG="${1:-}"
if [[ ! "$TAG" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "Usage: $0 v<X.Y.Z>" >&2
    exit 1
fi

VERSION=$(node -p 'require("./package.json").version')
if [[ "$TAG" != "v$VERSION" ]]; then
    echo "ERROR: tag $TAG does not match package version v$VERSION" >&2
    exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
    echo "ERROR: working tree must be clean" >&2
    git status --short >&2
    exit 1
fi

npm run prepublishOnly
test -f dist/contract.js
npm pack --dry-run

echo "Release preflight passed for $TAG. Push that tag to invoke npm publication."
