import type { AlertItem } from "../types";

interface AlertsScreenProps {
  alerts: AlertItem[];
}

export function AlertsScreen({ alerts }: AlertsScreenProps): JSX.Element {
  return (
    <section className="panel">
      <h2>Real-Time Notifications</h2>
      <ul className="feed">
        {alerts.map((alert) => (
          <li key={alert.id}>
            <b>{alert.type}</b>
            <p>{alert.message}</p>
            <small>{alert.createdAt ?? alert.created_at}</small>
          </li>
        ))}
      </ul>
    </section>
  );
}
