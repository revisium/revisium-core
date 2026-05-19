#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ -f .env.sonar ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.sonar
  set +a
fi

if [[ -z "${SONAR_TOKEN:-}" ]]; then
  echo "SONAR_TOKEN is required. Create .env.sonar from .env.sonar.example or export SONAR_TOKEN." >&2
  exit 1
fi

SONAR_HOST_URL="${SONAR_HOST_URL:-https://sonarcloud.io}"
SONAR_SCANNER_VERSION="${SONAR_SCANNER_VERSION:-12.1.0.3225_8.0.1}"
SONAR_QUALITYGATE_TIMEOUT="${SONAR_QUALITYGATE_TIMEOUT:-300}"

if [[ ! -f coverage/lcov.info ]] && ! compgen -G "coverage/shard-*/lcov.info" >/dev/null; then
  echo "Coverage was not found. Run npm run test:cov or npm run ci:local:sonar first." >&2
  exit 1
fi

scanner_args=(
  "-Dsonar.qualitygate.wait=true"
  "-Dsonar.qualitygate.timeout=${SONAR_QUALITYGATE_TIMEOUT}"
)

if pr_json="$(gh pr view --json number,headRefName,baseRefName 2>/dev/null)"; then
  pr_number="$(node -e "console.log(JSON.parse(process.argv[1]).number)" "$pr_json")"
  pr_branch="$(node -e "console.log(JSON.parse(process.argv[1]).headRefName)" "$pr_json")"
  pr_base="$(node -e "console.log(JSON.parse(process.argv[1]).baseRefName)" "$pr_json")"
  scanner_args+=(
    "-Dsonar.pullrequest.key=${pr_number}"
    "-Dsonar.pullrequest.branch=${pr_branch}"
    "-Dsonar.pullrequest.base=${pr_base}"
  )
else
  branch_name="$(git rev-parse --abbrev-ref HEAD)"
  scanner_args+=("-Dsonar.branch.name=${branch_name}")
fi

docker run --rm \
  -e SONAR_TOKEN \
  -e SONAR_HOST_URL="${SONAR_HOST_URL}" \
  -e SONAR_USER_HOME=/usr/src/.sonar \
  -v "$ROOT_DIR:/usr/src" \
  "sonarsource/sonar-scanner-cli:${SONAR_SCANNER_VERSION}" \
  "${scanner_args[@]}" \
  "$@"
