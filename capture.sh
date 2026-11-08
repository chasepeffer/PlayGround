#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${CAPTURE_URL:-}" || -z "${CAPTURE_DIR:-}" ]]; then
  echo 'Set CAPTURE_URL and CAPTURE_DIR.' >&2
  exit 1
fi
RUNTIME_DIR="${RUNTIME_DIR:?RUNTIME_DIR must point to the runtime scripts}"

/usr/bin/time -p mkdir -p "$CAPTURE_DIR"
# Use the app's actual PLAY control rather than the runtime's generic button
# index heuristic. Runtime capture handles transient browser/navigation errors
# as exit 75 and closes the browser in its finally block.
export CAPTURE_READY_SELECTOR='#app'
export CAPTURE_START_SELECTOR='#startBtn'
export CAPTURE_AUTO_START=true
export CAPTURE_STRICT=1
/usr/bin/time -p node "$RUNTIME_DIR/scripts/default-capture.mjs"
