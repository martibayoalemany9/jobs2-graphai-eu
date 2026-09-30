#!/usr/bin/env bash
# Sentry Incident Helper: Sync unresolved Sentry issues to GitHub Issues
set -euo pipefail

SENTRY_AUTH_TOKEN=${SENTRY_AUTH_TOKEN:-$(grep -E '^SENTRY_AUTH_TOKEN=' .env.local 2>/dev/null | cut -d= -f2 || true)}
if [[ -z "$SENTRY_AUTH_TOKEN" ]]; then
  echo "Error: SENTRY_AUTH_TOKEN not found in environment or .env.local"
  exit 1
fi

ORG="graphai-ou"
PROJECT="jobs2-graphai-eu"
ENDPOINT="https://de.sentry.io/api/0/projects/${ORG}/${PROJECT}/issues/?query=is:unresolved"

echo "Fetching unresolved Sentry issues for ${ORG}/${PROJECT}..."
ISSUES_JSON=$(curl -s -H "Authorization: Bearer ${SENTRY_AUTH_TOKEN}" "$ENDPOINT")

COUNT=$(echo "$ISSUES_JSON" | jq 'length')
echo "Found ${COUNT} unresolved issue(s)."

for row in $(echo "$ISSUES_JSON" | jq -r '.[] | @base64'); do
  _jq() {
    echo ${row} | base64 --decode | jq -r "${1}"
  }
  
  SHORT_ID=$(_jq '.shortId')
  TITLE=$(_jq '.title')
  CULPRIT=$(_jq '.culprit')
  EVENT_COUNT=$(_jq '.count')
  USER_COUNT=$(_jq '.userCount')
  LAST_SEEN=$(_jq '.lastSeen')
  ISSUE_ID=$(_jq '.id')
  
  GH_TITLE="sentry: ${TITLE} (${SHORT_ID})"
  
  # Check if issue already exists on GitHub
  EXISTING=$(gh issue list --search "${SHORT_ID} in:title state:open" --json number --jq '.[0].number' 2>/dev/null || true)
  if [[ -n "$EXISTING" ]]; then
    echo "GitHub Issue #${EXISTING} already tracks ${SHORT_ID}. Skipping creation."
    continue
  fi

  BODY="## Sentry Incident ${SHORT_ID}
- **Title**: ${TITLE}
- **Culprit**: ${CULPRIT}
- **Events**: ${EVENT_COUNT}
- **Affected Users**: ${USER_COUNT}
- **Last Seen**: ${LAST_SEEN}
- **Sentry URL**: https://graphai-ou.sentry.io/issues/${ISSUE_ID}/

### Notes on Seer Fix
Seer coding agent is ready on this project, pending organization GenAI consent in Sentry settings and GitHub repo link."

  echo "Creating GitHub issue for ${SHORT_ID}..."
  gh issue create --title "$GH_TITLE" --body "$BODY" --label "bug" || true
done

echo "Sentry issue sync complete."
