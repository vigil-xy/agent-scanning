*Control your AI agents. Track costs. Stay compliant. open-souce*

---

## What It Does

**One dashboard to manage your AI team.**

| Feature | How It Helps |
|---------|--------------|
| **Connect your agents** | Plug in OpenAI, Anthropic, or custom agents |
| **Set goals & budgets** | Assign work, cap costs, define success |
| **Watch in real-time** | See what every agent is doing right now |
| **Get alerts** | Slack, email, or PagerDuty when something's off |
| **Prove compliance** | Export audit trails for SOC 2, ISO 42001 |

---

## Quick Start (5 Minutes)

**1. Start the database**
```bash
docker compose up -d postgres
```

**2. Install & configure**
```bash
npm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

Or run one command:
```bash
npm run setup:local
```

**3. Run it**
```bash
# Terminal 1: API
npm run dev:api

# Terminal 2: Dashboard
npm run dev:web
```

Or run both in one terminal:

```bash
npm run dev:all
```

**4. Open** http://localhost:5173

### Verify Everything Is Connected

```bash
npm run check:stack
```

If API + web are running, seed demo data:

```bash
npm run seed:demo
```

---

## Troubleshooting (macOS)

### 1) `cp .env.example ...` fails

Use the correct paths from repo root:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

### 2) `Cannot connect to the Docker daemon`

- Start Docker Desktop
- Wait until Docker says it is running
- Retry:

```bash
docker compose up -d postgres
```

### 3) API error `ECONNREFUSED ... :5432`

PostgreSQL is not reachable. Confirm:

```bash
docker compose ps
```

Then restart API:

```bash
npm run dev:api
```

---

## Example: Customer Support Team

**Create a team**
```bash
POST /api/teams
{
  "name": "Support Squad",
  "agents": [
    { "provider": "openai", "model": "gpt-4", "role": "triage" },
    { "provider": "anthropic", "model": "claude-3", "role": "escalation" }
  ],
  "goals": [
    { "metric": "response_time", "target": "< 2 min" }
  ]
}
```

**Assign work**
```bash
POST /api/tasks
{
  "team_id": "<your-team-id>",
  "description": "Handle refund requests",
  "budget": { "usd": 5.00, "tokens": 10000 },
  "policies": ["no_pii_exposure", "enforce_budget_limits"]
}
```

**Get alerts when agents go off-script**
- Budget exceeded -> Slack notification
- Unauthorized tool -> Email alert + auto-stop
- PII detected -> PagerDuty escalation

**Export compliance reports**
```bash
GET /api/compliance/report?type=SOC_2_Type_II
```

---

## Dashboard

| Screen | What You See |
|--------|--------------|
| **Overview** | All teams, active agents, cost burn today |
| **Agents** | Add/edit teams, connect providers |
| **Tasks** | Queue, assign work, monitor progress |
| **Costs** | Budgets, spend trends, forecasts |
| **Governance** | Policy violations, audit logs |
| **Alerts** | Real-time feed, escalation history |

---

## Built With

- **Backend:** Node.js + Express + PostgreSQL
- **Frontend:** React + Vite
- **Integrations:** OpenAI, Anthropic, Slack, PagerDuty, email

---

**Ready to control your AI team?**
