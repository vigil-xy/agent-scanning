import type { AgentAction, PolicyResult } from "@agent-ops/shared";

interface PolicyContext {
  approvedTools: string[];
  budgetTokens: number;
  budgetUsd: number;
  currentTokens: number;
  currentUsd: number;
}

const piiPatterns = [
  /\b\d{3}-\d{2}-\d{4}\b/, // US SSN-like pattern
  /\b(?:\d[ -]*?){13,16}\b/, // Credit card-like pattern
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
];

function containsPII(output: string): boolean {
  return piiPatterns.some((pattern) => pattern.test(output));
}

export function checkPolicy(
  agentAction: AgentAction,
  policies: string[],
  context: PolicyContext,
): PolicyResult {
  if (policies.includes("no_pii_exposure") && containsPII(agentAction.output)) {
    return {
      allowed: false,
      violation: "PII_DETECTED",
      action: "block_and_alert",
      reason: "Policy no_pii_exposure blocked sensitive data in output.",
    };
  }

  if (
    policies.includes("enforce_budget_limits") &&
    (context.currentTokens + agentAction.costTokens > context.budgetTokens ||
      context.currentUsd + agentAction.costUsd > context.budgetUsd)
  ) {
    return {
      allowed: false,
      violation: "BUDGET_EXCEEDED",
      action: "pause_and_notify",
      reason: "Task budget cap reached.",
    };
  }

  if (
    policies.includes("approved_tools_only") &&
    !context.approvedTools.includes(agentAction.tool)
  ) {
    return {
      allowed: false,
      violation: "UNAUTHORIZED_TOOL",
      action: "block_and_escalate",
      reason: `Tool ${agentAction.tool} is not approved for this task.`,
    };
  }

  return { allowed: true };
}
