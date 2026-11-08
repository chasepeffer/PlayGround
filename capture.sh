#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"
: "${RUNTIME_DIR:?}"
: "${CAPTURE_URL:?Set CAPTURE_URL to the exact preview URL.}"
: "${CAPTURE_DIR:?Set CAPTURE_DIR to the evidence directory.}"

/usr/bin/time -p mkdir -p "$CAPTURE_DIR"
# Avoid the flaky pointer-lock click path; the visible start screen is rendered app content.
# Callers can explicitly opt into gameplay capture by setting CAPTURE_AUTO_START=true.
export CAPTURE_AUTO_START="${CAPTURE_AUTO_START:-false}"
export CAPTURE_STRICT=1
/usr/bin/time -p node "$RUNTIME_DIR/scripts/default-capture.mjs"
