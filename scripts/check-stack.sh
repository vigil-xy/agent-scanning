#!/usr/bin/env bash
set -euo pipefail

API_BASE="${API_BASE:-http://localhost:4000}"
WEB_BASE="${WEB_BASE:-http://localhost:5173}"

echo "== AgentOps stack check =="

if [ ! -f "apps/api/.env" ]; then
  echo "[FAIL] apps/api/.env missing"
  exit 1
fi
if [ ! -f "apps/web/.env" ]; then
  echo "[FAIL] apps/web/.env missing"
  exit 1
fi

echo "[OK] env files present"

if curl -fsS "${API_BASE}/health" >/dev/null; then
  echo "[OK] API health endpoint reachable"
else
  echo "[FAIL] API not reachable at ${API_BASE}. Start with: npm run dev:api"
  exit 1
fi

if curl -fsS "${API_BASE}/api/dashboard" >/dev/null; then
  echo "[OK] API dashboard endpoint reachable"
else
  echo "[FAIL] API routes unavailable at ${API_BASE}/api"
  exit 1
fi

if curl -fsS "${WEB_BASE}" >/dev/null; then
  echo "[OK] Web app reachable"
else
  echo "[WARN] Web app not reachable at ${WEB_BASE}. Start with: npm run dev:web"
fi

echo "[OK] Core stack connectivity verified"
