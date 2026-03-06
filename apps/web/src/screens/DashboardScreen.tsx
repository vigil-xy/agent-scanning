import type { AlertItem, DashboardStats } from "../types";

interface DashboardScreenProps {
  dashboard: DashboardStats;
  alerts: AlertItem[];
  error: string;
}

export function DashboardScreen({ dashboard, alerts, error }: DashboardScreenProps): JSX.Element {
  return (
    <>
      {error && <section className="panel error">{error}</section>}
      <section className="grid two">
        <article className="panel metric">
          <h2>Team Overview</h2>
          <div className="metrics">
            <div>
              <label>Teams</label>
              <strong>{dashboard.teamCount}</strong>
            </div>
            <div>
              <label>Active Tasks</label>
              <strong>{dashboard.activeTaskCount}</strong>
            </div>
            <div>
              <label>Alerts (24h)</label>
              <strong>{dashboard.alertsLast24h}</strong>
            </div>
            <div>
              <label>Spend Today</label>
              <strong>${dashboard.spendTodayUsd.toFixed(2)}</strong>
            </div>
          </div>
        </article>

        <article className="panel">
          <h2>Recent Alerts</h2>
          <ul className="feed">
            {alerts.slice(0, 6).map((alert) => (
              <li key={alert.id}>
                <b>{alert.type}</b>
                <p>{alert.message}</p>
              </li>
            ))}
            {alerts.length === 0 && <li>No alerts yet.</li>}
          </ul>
        </article>
      </section>
    </>
  );
}
