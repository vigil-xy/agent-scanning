#!/usr/bin/env bash
set -euo pipefail

API_BASE="${API_BASE:-http://localhost:4000/api}"

echo "== Seeding demo data to ${API_BASE} =="

TEAM_RESPONSE="$(curl -sS -X POST "${API_BASE}/teams" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Customer Support Squad",
    "agents": [
      { "provider": "openai", "model": "gpt-4", "role": "triage" },
      { "provider": "anthropic", "model": "claude-3", "role": "escalation" }
    ],
    "goals": [
      { "metric": "response_time", "target": "< 2 min" },
      { "metric": "resolution_rate", "target": "> 80%" }
    ]
  }')"

TEAM_ID="$(printf '%s' "$TEAM_RESPONSE" | node -e 'const fs=require("fs");const j=JSON.parse(fs.readFileSync(0,"utf8"));if(!j.id){process.exit(1)};process.stdout.write(j.id)')"

echo "Created team: ${TEAM_ID}"

TASK_RESPONSE="$(curl -sS -X POST "${API_BASE}/tasks" \
  -H "Content-Type: application/json" \
  -d "{
    \"team_id\": \"${TEAM_ID}\",
    \"description\": \"Handle refund requests\",
    \"priority\": \"high\",
    \"budget\": { \"tokens\": 10000, \"usd\": 5.00 },
    \"policies\": [\"no_pii_exposure\", \"enforce_budget_limits\", \"approved_tools_only\"]
  }")"

TASK_ID="$(printf '%s' "$TASK_RESPONSE" | node -e 'const fs=require("fs");const j=JSON.parse(fs.readFileSync(0,"utf8"));if(!j.id){process.exit(1)};process.stdout.write(j.id)')"

echo "Created task: ${TASK_ID}"

echo "Triggering one policy violation to validate alerts + audit..."
curl -sS -X POST "${API_BASE}/policy/check" \
  -H "Content-Type: application/json" \
  -d "{
    \"task_id\": \"${TASK_ID}\",
    \"approved_tools\": [\"crm.lookup\", \"knowledge-base\"],
    \"agent_action\": {
      \"output\": \"Customer email test@example.com and card 4111 1111 1111 1111\",
      \"costUsd\": 0.3,
      \"costTokens\": 700,
      \"tool\": \"unapproved.export\"
    }
  }" >/dev/null

echo "Seed complete."
