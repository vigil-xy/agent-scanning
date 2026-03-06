export type AgentProvider = "openai" | "anthropic" | "azure-openai" | "other";

export interface AgentDefinition {
  provider: AgentProvider;
  model: string;
  role: string;
  capabilities?: string[];
}

export interface GoalDefinition {
  metric: string;
  target: string;
}

export interface Budget {
  tokens: number;
  usd: number;
}

export interface TeamInput {
  name: string;
  agents: AgentDefinition[];
  goals: GoalDefinition[];
}

export interface TaskInput {
  teamId: string;
  description: string;
  priority: "low" | "medium" | "high" | "critical";
  budget: Budget;
  policies: string[];
}

export interface AgentAction {
  output: string;
  costUsd: number;
  costTokens: number;
  tool: string;
}

export interface PolicyResult {
  allowed: boolean;
  violation?: "PII_DETECTED" | "BUDGET_EXCEEDED" | "UNAUTHORIZED_TOOL";
  action?: "block_and_alert" | "pause_and_notify" | "block_and_escalate";
  reason?: string;
}

export interface CostSummary {
  team: string;
  today: {
    tokens: number;
    usd: number;
    budgetRemainingUsd: number;
  };
  thisMonth: {
    tokens: number;
    usd: number;
    trend: string;
  };
}
