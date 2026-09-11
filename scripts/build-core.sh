#!/usr/bin/env sh
# Fallback core bundle build when the npm registry is unreachable: bun
# compiles src/index.ts into the same window.WayfareCore IIFE vite produces.
set -e
cd "$(dirname "$0")/.."
mkdir -p .bun-build
cat > .bun-build/entry.ts <<'TS'
import * as core from '../src/index';
(globalThis as any).WayfareCore = core;
TS
bun build .bun-build/entry.ts --format=iife --target=browser --minify --outfile=js/core.js
rm -rf .bun-build
