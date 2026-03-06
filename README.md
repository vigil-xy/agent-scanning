# AgentOps Platform

Node.js + React control plane for software-only AI agent governance.

## Architecture

```text
┌─────────────────────────────────────────┐
│           React Dashboard               │
│  - Agent team overview                 │
│  - Goal assignment & tracking          │
│  - Cost monitoring & budgets           │
│  - Compliance reports & audit logs     │
│  - Real-time alerts & notifications    │
└─────────────────────────────────────────┘
                    │
┌─────────────────────────────────────────┐
│           Node.js API Server            │
│  - Agent orchestration logic            │
│  - Policy engine (software-enforced)    │
│  - Cost tracking & billing              │
│  - Audit logging & reporting            │
│  - Alert system (Slack, email, PagerDuty)│
│  - Integrations (OpenAI, Anthropic, etc)│
└─────────────────────────────────────────┘
                    │
┌─────────────────────────────────────────┐
│         Database (PostgreSQL)           │
│  - Agent configurations                 │
│  - Execution logs & audit trails        │
│  - Cost data & budgets                  │
│  - User & team data                     │
└─────────────────────────────────────────┘
```

## Repository Layout

```text
.
├── apps/
│   ├── api/                # Express + PostgreSQL API
│   └── web/                # React (Vite) dashboard
├── packages/
│   └── shared/             # Shared TypeScript types
├── docker-compose.yml      # Local PostgreSQL service
├── package.json            # npm workspaces root
└── tsconfig.base.json
```

## Quick Start

### 1) Start PostgreSQL

```bash
docker compose up -d postgres
```

### 2) Install dependencies

```bash
npm install
```

### 3) Configure environment

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

### 4) Run API and dashboard

In terminal 1:
```bash
npm run dev:api
```

In terminal 2:
```bash
npm run dev:web
```

Open `http://localhost:5173`.

## Key API Endpoints

### Agent Team Management

```http
POST /api/teams
Content-Type: application/json

{
  "name": "Customer Support Squad",
  "agents": [
    { "provider": "openai", "model": "gpt-4", "role": "triage" },
    { "provider": "anthropic", "model": "claude-3", "role": "escalation" }
  ],
  "goals": [
    { "metric": "response_time", "target": "< 2 min" },
    { "metric": "resolution_rate", "target": "> 80%" }
  ]
}
```

### Goal Assignment & Task Tracking

```http
POST /api/tasks
Content-Type: application/json

{
  "team_id": "<uuid>",
  "description": "Handle refund requests",
  "priority": "high",
  "budget": { "tokens": 10000, "usd": 5.00 },
  "policies": ["no_pii_exposure", "enforce_budget_limits", "approved_tools_only"]
}
```

### Real-Time Governance (Software-Only)

```http
POST /api/policy/check
Content-Type: application/json

{
  "task_id": "<uuid>",
  "approved_tools": ["crm.lookup", "knowledge-base"],
  "agent_action": {
    "output": "customer@example.com",
    "costUsd": 0.22,
    "costTokens": 780,
    "tool": "unapproved.export"
  }
}
```

### Cost Tracking & Alerts

- `GET /api/costs/summary?teamId=<uuid>`
- `GET /api/alerts`
- `GET /api/alerts/stream` (Server-Sent Events)

### Compliance Reporting

- `GET /api/compliance/report?type=SOC_2_Type_II&periodStart=...&periodEnd=...`

## Dashboard Screens

- Dashboard: Team overview, active agents, cost burn, recent alerts
- Agent Management: Add/edit teams and provider models
- Goal Setting: KPI and success target visibility
- Task Queue: Work assignment and queue monitoring
- Cost Center: Budget usage and trend snapshot
- Governance: Policy checks and compliance summary
- Alerts: Real-time notification feed and escalation history

## Build

```bash
npm run build
```

## Notes

- The API automatically bootstraps tables from `apps/api/src/db/schema.sql`.
- Slack and PagerDuty are delivered over HTTP APIs, and email is delivered over SMTP (`nodemailer`).
- Legacy scanner source (`src/`, `build/`) remains in this repository but is not used by the new workspace scripts.
