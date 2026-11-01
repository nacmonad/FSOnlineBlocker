#!/usr/bin/env bash
# Package the extension for store upload / manual distribution.
set -euo pipefail

cd "$(dirname "$0")/.."

name="fsonline-popunder-blocker"
version="$(python3 -c "import json;print(json.load(open('manifest.json'))['version'])")"
out="$name-v$version.zip"

rm -f "$out"
zip -qr "$out" \
  manifest.json \
  LICENSE \
  icons \
  src \
  -x '*.map' '*/.DS_Store'

echo "wrote $out"
