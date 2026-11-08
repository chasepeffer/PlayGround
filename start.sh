#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-${BASH_SOURCE[0]%/*}}"
RUNTIME_DIR="${RUNTIME_DIR:?RUNTIME_DIR must point to the runtime scripts}"
OPENCODE_WEB_DIR="${OPENCODE_WEB_DIR:?OPENCODE_WEB_DIR must point to worker metadata}"
export PROJECT_DIR RUNTIME_DIR OPENCODE_WEB_DIR

cd "$PROJECT_DIR"
/usr/bin/time -p mkdir -p "$OPENCODE_WEB_DIR"
# This static project has no dependency manifest or separate build step. The
# runtime serves the project root and writes deployment-output.json there.
/usr/bin/time -p node "$RUNTIME_DIR/scripts/default-start.mjs"
