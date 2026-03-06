export interface Team {
  id: string;
  name: string;
  agents: Array<{ provider: string; model: string; role: string; capabilities?: string[] }>;
  goals: Array<{ metric: string; target: string }>;
}

export interface Task {
  id: string;
  team_id: string;
  description: string;
  priority: string;
  status: string;
  budget_tokens: number;
  budget_usd: string;
  policies: string[];
}

export interface AlertItem {
  id: string;
  team_id: string | null;
  type: string;
  message: string;
  severity: string;
  created_at?: string;
  createdAt?: string;
}

export interface DashboardStats {
  teamCount: number;
  activeTaskCount: number;
  alertsLast24h: number;
  spendTodayUsd: number;
}
