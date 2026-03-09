#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "== AgentOps local setup =="

if ! command -v node >/dev/null 2>&1; then
  echo "[ERROR] Node.js is required. Install Node 20+ and rerun."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "[ERROR] npm is required."
  exit 1
fi

echo "[1/5] Installing npm dependencies..."
npm install

if [ ! -f "apps/api/.env" ]; then
  cp "apps/api/.env.example" "apps/api/.env"
  echo "[2/5] Created apps/api/.env"
else
  echo "[2/5] apps/api/.env already exists"
fi

if [ ! -f "apps/web/.env" ]; then
  cp "apps/web/.env.example" "apps/web/.env"
  echo "[3/5] Created apps/web/.env"
else
  echo "[3/5] apps/web/.env already exists"
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "[WARN] Docker CLI not found. Install Docker Desktop or provide external PostgreSQL."
  echo "[INFO] If using external DB, set DATABASE_URL in apps/api/.env"
  exit 0
fi

if ! docker info >/dev/null 2>&1; then
  echo "[WARN] Docker daemon is not running. Start Docker Desktop and rerun this command."
  exit 0
fi

echo "[4/5] Starting PostgreSQL via docker compose..."
docker compose up -d postgres

echo "[5/5] Waiting for PostgreSQL on localhost:5432 ..."
for i in {1..30}; do
  if nc -z localhost 5432 >/dev/null 2>&1; then
    echo "[OK] PostgreSQL is reachable"
    break
  fi
  sleep 1
  if [ "$i" -eq 30 ]; then
    echo "[ERROR] PostgreSQL did not become reachable on port 5432"
    exit 1
  fi
done

echo ""
echo "Setup complete."
echo "Run API: npm run dev:api"
echo "Run Web: npm run dev:web"
