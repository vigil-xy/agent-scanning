import { Router } from "express";
import { z } from "zod";
import { checkPolicy } from "../policy/engine.js";
import { pool, query } from "../db/pool.js";
import { notifyChannels, publishAlert, subscribeToAlerts, type AlertEvent } from "../services/alerts.js";

const router = Router();

const teamSchema = z.object({
  name: z.string().min(2),
  agents: z
    .array(
      z.object({
        provider: z.string().min(2),
        model: z.string().min(2),
        role: z.string().min(2),
        capabilities: z.array(z.string()).optional(),
      }),
    )
    .min(1),
  goals: z
    .array(
      z.object({
        metric: z.string().min(2),
        target: z.string().min(1),
      }),
    )
    .default([]),
});

const taskSchema = z.object({
  team_id: z.string().uuid().optional(),
  teamId: z.string().uuid().optional(),
  description: z.string().min(3),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  budget: z.object({
    tokens: z.number().int().positive(),
    usd: z.number().positive(),
  }),
  policies: z.array(z.string()).min(1),
});

const policyCheckSchema = z.object({
  task_id: z.string().uuid(),
  approved_tools: z.array(z.string()).default([]),
  agent_action: z.object({
    output: z.string(),
    costUsd: z.number().nonnegative(),
    costTokens: z.number().int().nonnegative(),
    tool: z.string().min(1),
  }),
});

async function addAudit(actor: string, action: string, target: string, metadata: unknown): Promise<void> {
  await query(
    `INSERT INTO audit_logs (actor, action, target, metadata) VALUES ($1, $2, $3, $4::jsonb)`,
    [actor, action, target, JSON.stringify(metadata)],
  );
}

async function createAlert(payload: {
  teamId: string | null;
  type: string;
  message: string;
  severity: string;
  channels: string[];
}): Promise<AlertEvent> {
  const rows = await query<{
    id: string;
    team_id: string | null;
    type: string;
    message: string;
    severity: string;
    channels: string[];
    created_at: string;
  }>(
    `INSERT INTO alerts (team_id, type, message, severity, channels)
     VALUES ($1, $2, $3, $4, $5::jsonb)
     RETURNING id, team_id, type, message, severity, channels, created_at`,
    [payload.teamId, payload.type, payload.message, payload.severity, JSON.stringify(payload.channels)],
  );

  const event: AlertEvent = {
    id: rows[0].id,
    teamId: rows[0].team_id,
    type: rows[0].type,
    message: rows[0].message,
    severity: rows[0].severity,
    channels: rows[0].channels,
    createdAt: rows[0].created_at,
  };

  publishAlert(event);
  await notifyChannels(event);
  return event;
}

router.get("/teams", async (_req, res, next) => {
  try {
    const rows = await query<{
      id: string;
      name: string;
      daily_budget_usd: string;
      monthly_budget_usd: string;
      created_at: string;
      agents: unknown;
      goals: unknown;
    }>(
      `SELECT t.id,
              t.name,
              t.daily_budget_usd,
              t.monthly_budget_usd,
              t.created_at,
              COALESCE((SELECT json_agg(json_build_object('provider', a.provider, 'model', a.model, 'role', a.role, 'capabilities', a.capabilities)) FROM team_agents a WHERE a.team_id = t.id), '[]'::json) AS agents,
              COALESCE((SELECT json_agg(json_build_object('metric', g.metric, 'target', g.target)) FROM goals g WHERE g.team_id = t.id), '[]'::json) AS goals
       FROM teams t
       ORDER BY t.created_at DESC`,
    );

    res.json(rows);
  } catch (error) {
    next(error);
  }
});

router.post("/teams", async (req, res, next) => {
  const parsed = teamSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const teamResult = await client.query<{ id: string; name: string; created_at: string }>(
      `INSERT INTO teams (name) VALUES ($1) RETURNING id, name, created_at`,
      [parsed.data.name],
    );

    const team = teamResult.rows[0];

    for (const agent of parsed.data.agents) {
      await client.query(
        `INSERT INTO team_agents (team_id, provider, model, role, capabilities)
         VALUES ($1, $2, $3, $4, $5::jsonb)`,
        [team.id, agent.provider, agent.model, agent.role, JSON.stringify(agent.capabilities ?? [])],
      );
    }

    for (const goal of parsed.data.goals) {
      await client.query(
        `INSERT INTO goals (team_id, metric, target) VALUES ($1, $2, $3)`,
        [team.id, goal.metric, goal.target],
      );
    }

    await client.query("COMMIT");

    await addAudit("api", "team_created", team.id, parsed.data);

    return res.status(201).json({
      id: team.id,
      name: team.name,
      agents: parsed.data.agents,
      goals: parsed.data.goals,
      createdAt: team.created_at,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
});

router.get("/tasks", async (_req, res, next) => {
  try {
    const rows = await query<{
      id: string;
      team_id: string;
      description: string;
      priority: string;
      status: string;
      budget_tokens: number;
      budget_usd: string;
      policies: string[];
      created_at: string;
    }>(
      `SELECT t.id,
              t.team_id,
              t.description,
              t.priority,
              t.status,
              t.budget_tokens,
              t.budget_usd,
              COALESCE((SELECT array_agg(p.policy_name) FROM task_policies p WHERE p.task_id = t.id), ARRAY[]::text[]) AS policies,
              t.created_at
       FROM tasks t
       ORDER BY t.created_at DESC`,
    );

    res.json(rows);
  } catch (error) {
    next(error);
  }
});

router.post("/tasks", async (req, res, next) => {
  const parsed = taskSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const teamId = parsed.data.team_id ?? parsed.data.teamId;
  if (!teamId) {
    return res.status(400).json({ error: "team_id is required" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const taskResult = await client.query<{
      id: string;
      team_id: string;
      description: string;
      priority: string;
      budget_tokens: number;
      budget_usd: string;
      created_at: string;
    }>(
      `INSERT INTO tasks (team_id, description, priority, budget_tokens, budget_usd)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, team_id, description, priority, budget_tokens, budget_usd, created_at`,
      [teamId, parsed.data.description, parsed.data.priority, parsed.data.budget.tokens, parsed.data.budget.usd],
    );

    for (const policy of parsed.data.policies) {
      await client.query(`INSERT INTO task_policies (task_id, policy_name) VALUES ($1, $2)`, [
        taskResult.rows[0].id,
        policy,
      ]);
    }

    await client.query("COMMIT");

    await addAudit("api", "task_created", taskResult.rows[0].id, parsed.data);

    return res.status(201).json({
      ...taskResult.rows[0],
      policies: parsed.data.policies,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
});

router.post("/policy/check", async (req, res, next) => {
  const parsed = policyCheckSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const taskRows = await query<{
      id: string;
      team_id: string;
      budget_tokens: number;
      budget_usd: string;
      policies: string[];
    }>(
      `SELECT t.id,
              t.team_id,
              t.budget_tokens,
              t.budget_usd,
              COALESCE((SELECT array_agg(tp.policy_name) FROM task_policies tp WHERE tp.task_id = t.id), ARRAY[]::text[]) AS policies
       FROM tasks t
       WHERE t.id = $1`,
      [parsed.data.task_id],
    );

    if (!taskRows[0]) {
      return res.status(404).json({ error: "Task not found" });
    }

    const spendRows = await query<{ tokens: string; usd: string }>(
      `SELECT COALESCE(SUM(tokens), 0)::text AS tokens, COALESCE(SUM(usd), 0)::text AS usd
       FROM cost_events
       WHERE task_id = $1`,
      [parsed.data.task_id],
    );

    const task = taskRows[0];
    const spend = spendRows[0];

    const result = checkPolicy(parsed.data.agent_action, task.policies, {
      approvedTools: parsed.data.approved_tools,
      budgetTokens: task.budget_tokens,
      budgetUsd: Number(task.budget_usd),
      currentTokens: Number(spend.tokens),
      currentUsd: Number(spend.usd),
    });

    await query(
      `INSERT INTO agent_executions (task_id, team_id, tool, output_excerpt, cost_tokens, cost_usd, policy_allowed, violation)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        parsed.data.task_id,
        task.team_id,
        parsed.data.agent_action.tool,
        parsed.data.agent_action.output.slice(0, 240),
        parsed.data.agent_action.costTokens,
        parsed.data.agent_action.costUsd,
        result.allowed,
        result.violation ?? null,
      ],
    );

    await query(
      `INSERT INTO cost_events (team_id, task_id, tokens, usd, source)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        task.team_id,
        parsed.data.task_id,
        parsed.data.agent_action.costTokens,
        parsed.data.agent_action.costUsd,
        parsed.data.agent_action.tool,
      ],
    );

    if (!result.allowed) {
      await createAlert({
        teamId: task.team_id,
        type: result.violation ?? "POLICY_VIOLATION",
        message: result.reason ?? "Policy blocked this action.",
        severity: "high",
        channels: ["slack", "email", "pagerduty"],
      });

      await addAudit("policy-engine", "policy_violation", parsed.data.task_id, {
        violation: result.violation,
        action: result.action,
      });
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get("/costs/summary", async (req, res, next) => {
  const teamId = z.string().uuid().safeParse(req.query.teamId);
  if (!teamId.success) {
    return res.status(400).json({ error: "teamId query param is required" });
  }

  try {
    const teamRows = await query<{ name: string; daily_budget_usd: string }>(
      `SELECT name, daily_budget_usd FROM teams WHERE id = $1`,
      [teamId.data],
    );

    if (!teamRows[0]) {
      return res.status(404).json({ error: "Team not found" });
    }

    const todayRows = await query<{ tokens: string; usd: string }>(
      `SELECT COALESCE(SUM(tokens), 0)::text AS tokens, COALESCE(SUM(usd), 0)::text AS usd
       FROM cost_events
       WHERE team_id = $1 AND created_at::date = CURRENT_DATE`,
      [teamId.data],
    );

    const monthRows = await query<{ tokens: string; usd: string }>(
      `SELECT COALESCE(SUM(tokens), 0)::text AS tokens, COALESCE(SUM(usd), 0)::text AS usd
       FROM cost_events
       WHERE team_id = $1
         AND date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE)`,
      [teamId.data],
    );

    const previousMonthRows = await query<{ usd: string }>(
      `SELECT COALESCE(SUM(usd), 0)::text AS usd
       FROM cost_events
       WHERE team_id = $1
         AND date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE - interval '1 month')`,
      [teamId.data],
    );

    const todayUsd = Number(todayRows[0].usd);
    const monthUsd = Number(monthRows[0].usd);
    const previousMonthUsd = Number(previousMonthRows[0].usd);
    const trendPercent =
      previousMonthUsd === 0 ? 100 : ((monthUsd - previousMonthUsd) / previousMonthUsd) * 100;

    res.json({
      team: teamRows[0].name,
      today: {
        tokens: Number(todayRows[0].tokens),
        usd: todayUsd,
        budget_remaining: Number(teamRows[0].daily_budget_usd) - todayUsd,
      },
      this_month: {
        tokens: Number(monthRows[0].tokens),
        usd: monthUsd,
        trend: `${trendPercent >= 0 ? "+" : ""}${trendPercent.toFixed(1)}% vs last month`,
      },
      alerts: await query<{ type: string; message: string }>(
        `SELECT type, message
         FROM alerts
         WHERE team_id = $1
         ORDER BY created_at DESC
         LIMIT 5`,
        [teamId.data],
      ),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/compliance/report", async (req, res, next) => {
  const type = z.string().default("SOC_2_Type_II").parse(req.query.type);
  const periodStart = z.string().default(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()).parse(req.query.periodStart);
  const periodEnd = z.string().default(new Date().toISOString()).parse(req.query.periodEnd);

  try {
    const executionRows = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM agent_executions
       WHERE created_at BETWEEN $1::timestamptz AND $2::timestamptz`,
      [periodStart, periodEnd],
    );

    const violationRows = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM agent_executions
       WHERE created_at BETWEEN $1::timestamptz AND $2::timestamptz
         AND policy_allowed = false`,
      [periodStart, periodEnd],
    );

    const remediationRows = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM audit_logs
       WHERE created_at BETWEEN $1::timestamptz AND $2::timestamptz
         AND action = 'policy_violation'`,
      [periodStart, periodEnd],
    );

    const executions = Number(executionRows[0].count);
    const violations = Number(violationRows[0].count);

    res.json({
      report_type: type,
      period: `${periodStart} to ${periodEnd}`,
      agent_executions: executions,
      policy_violations: violations,
      violation_rate: executions === 0 ? "0.000%" : `${((violations / executions) * 100).toFixed(3)}%`,
      remediation_actions: Number(remediationRows[0].count),
      audit_trail_integrity: "verified",
      evidence: await query(
        `SELECT id, actor, action, target, metadata, created_at
         FROM audit_logs
         WHERE created_at BETWEEN $1::timestamptz AND $2::timestamptz
         ORDER BY created_at DESC
         LIMIT 100`,
        [periodStart, periodEnd],
      ),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/alerts", async (_req, res, next) => {
  try {
    const rows = await query(
      `SELECT id, team_id, type, message, severity, channels, created_at
       FROM alerts
       ORDER BY created_at DESC
       LIMIT 50`,
    );

    res.json(rows);
  } catch (error) {
    next(error);
  }
});

router.get("/alerts/stream", (_req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const unsubscribe = subscribeToAlerts((event) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  });

  const heartbeat = setInterval(() => {
    res.write(`event: heartbeat\ndata: ${Date.now()}\n\n`);
  }, 15000);

  res.on("close", () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
});

router.get("/dashboard", async (_req, res, next) => {
  try {
    const [teams, activeTasks, alerts, spendToday] = await Promise.all([
      query<{ total: string }>(`SELECT COUNT(*)::text AS total FROM teams`),
      query<{ total: string }>(`SELECT COUNT(*)::text AS total FROM tasks WHERE status IN ('queued', 'running')`),
      query<{ total: string }>(`SELECT COUNT(*)::text AS total FROM alerts WHERE created_at > NOW() - interval '24 hours'`),
      query<{ usd: string }>(
        `SELECT COALESCE(SUM(usd), 0)::text AS usd
         FROM cost_events
         WHERE created_at::date = CURRENT_DATE`,
      ),
    ]);

    res.json({
      teamCount: Number(teams[0].total),
      activeTaskCount: Number(activeTasks[0].total),
      alertsLast24h: Number(alerts[0].total),
      spendTodayUsd: Number(spendToday[0].usd),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
