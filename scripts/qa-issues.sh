#!/usr/bin/env bash
# Open GitHub issues for failing QA / pentest. Usage: ./scripts/qa-issues.sh <title> <body-file>
set -euo pipefail
TITLE=${1:-"jobs2 QA finding"}
BODY=${2:-}
if [[ -n "$BODY" && -f "$BODY" ]]; then
  gh issue create --title "$TITLE" --body-file "$BODY" --label "qa" || true
else
  gh issue create --title "$TITLE" --body "${BODY:-See CI logs.}" --label "qa" || true
fi
