#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUNTIME_DIR="${RUNTIME_DIR:?}"
export PROJECT_DIR RUNTIME_DIR
cd "$PROJECT_DIR"

# This project is a static site: it has no package manifest or build step.
# If a package manifest is added later, install its dependencies before serving.
if [[ -f package.json ]]; then
  if [[ -f package-lock.json ]]; then
    /usr/bin/time -p npm ci --no-audit --no-fund
  else
    /usr/bin/time -p npm install --no-audit --no-fund
  fi
  if /usr/bin/time -p node -e 'process.exit(require("./package.json").scripts?.build ? 0 : 1)'; then
    /usr/bin/time -p npm run build
  fi
fi

STATIC_DIR="$PROJECT_DIR"
if [[ -f dist/index.html ]]; then
  STATIC_DIR="$PROJECT_DIR/dist"
fi
[[ -f "$STATIC_DIR/index.html" ]] || { echo "No built static index.html in $STATIC_DIR" >&2; exit 1; }

export OPENCODE_WEB_DIR="${OPENCODE_WEB_DIR:-/home/runner/work/_temp/omgithub-web}"
export PORT="${PORT:-3000}"
/usr/bin/time -p mkdir -p "$OPENCODE_WEB_DIR"
/usr/bin/time -p env PROJECT_DIR="$PROJECT_DIR" STATIC_DIR="$STATIC_DIR" node -e 'const fs=require("node:fs"); const path=require("node:path"); fs.writeFileSync(path.join(process.env.OPENCODE_WEB_DIR,"deployment-output.json"), JSON.stringify({project:process.env.PROJECT_DIR,directory:path.resolve(process.env.STATIC_DIR)}));'

# The runtime's static server provides the live-preview endpoint and remains in the foreground.
/usr/bin/time -p node "$RUNTIME_DIR/scripts/default-start.mjs"
