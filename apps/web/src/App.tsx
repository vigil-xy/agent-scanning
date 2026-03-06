import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { useAgentOpsData } from "./hooks/useAgentOpsData";
import { AgentManagementScreen } from "./screens/AgentManagementScreen";
import { AlertsScreen } from "./screens/AlertsScreen";
import { CostCenterScreen } from "./screens/CostCenterScreen";
import { DashboardScreen } from "./screens/DashboardScreen";
import { GoalsScreen } from "./screens/GoalsScreen";
import { GovernanceScreen } from "./screens/GovernanceScreen";
import { TasksScreen } from "./screens/TasksScreen";

export default function App(): JSX.Element {
  const { teams, tasks, alerts, dashboard, costSummary, compliance, error, loadData } =
    useAgentOpsData();

  return (
    <Routes>
      <Route path="/" element={<AppShell />}>
        <Route index element={<DashboardScreen dashboard={dashboard} alerts={alerts} error={error} />} />
        <Route path="agents" element={<AgentManagementScreen teams={teams} loadData={loadData} />} />
        <Route path="goals" element={<GoalsScreen teams={teams} />} />
        <Route path="tasks" element={<TasksScreen teams={teams} tasks={tasks} loadData={loadData} />} />
        <Route path="cost" element={<CostCenterScreen costSummary={costSummary} />} />
        <Route
          path="governance"
          element={<GovernanceScreen tasks={tasks} compliance={compliance} loadData={loadData} />}
        />
        <Route path="alerts" element={<AlertsScreen alerts={alerts} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
