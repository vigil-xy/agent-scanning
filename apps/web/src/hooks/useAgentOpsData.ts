import { useEffect, useMemo, useState } from "react";
import { apiGet, openAlertsStream } from "../lib/api";
import type { AlertItem, DashboardStats, Task, Team } from "../types";

export function useAgentOpsData() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [dashboard, setDashboard] = useState<DashboardStats>({
    teamCount: 0,
    activeTaskCount: 0,
    alertsLast24h: 0,
    spendTodayUsd: 0,
  });
  const [costSummary, setCostSummary] = useState<unknown>(null);
  const [compliance, setCompliance] = useState<unknown>(null);
  const [error, setError] = useState("");

  const selectedTeamId = useMemo(() => teams[0]?.id, [teams]);

  async function loadData(): Promise<void> {
    try {
      setError("");
      const [dashboardData, teamData, taskData, alertData] = await Promise.all([
        apiGet<DashboardStats>("/dashboard"),
        apiGet<Team[]>("/teams"),
        apiGet<Task[]>("/tasks"),
        apiGet<AlertItem[]>("/alerts"),
      ]);
      setDashboard(dashboardData);
      setTeams(teamData);
      setTasks(taskData);
      setAlerts(alertData);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load dashboard");
    }
  }

  useEffect(() => {
    loadData().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!selectedTeamId) {
      return;
    }

    apiGet(`/costs/summary?teamId=${selectedTeamId}`)
      .then(setCostSummary)
      .catch(() => undefined);
  }, [selectedTeamId, teams.length]);

  useEffect(() => {
    apiGet("/compliance/report").then(setCompliance).catch(() => undefined);

    const stream = openAlertsStream((event: unknown) => {
      setAlerts((previous) => [event as AlertItem, ...previous].slice(0, 100));
    });

    return () => stream.close();
  }, []);

  return {
    teams,
    tasks,
    alerts,
    dashboard,
    costSummary,
    compliance,
    error,
    selectedTeamId,
    loadData,
  };
}
