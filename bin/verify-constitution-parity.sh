#!/usr/bin/env bash
set -euo pipefail

REPO=$(CDPATH='' cd -- "$(dirname -- "$0")/.." && pwd)
node "$REPO/bin/render-global-constitution.mjs" --check --root "$REPO"
