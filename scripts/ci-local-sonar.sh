#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

cleanup() {
  npm run docker:test-container-down || true
}

trap cleanup EXIT

rm -rf coverage
npm run docker:test-container-up
npm run test:cov
npm run sonar:local
