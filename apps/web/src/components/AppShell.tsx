import { NavLink, Outlet } from "react-router-dom";

const links = [
  { to: "/", label: "Dashboard", subtitle: "Overview and burn" },
  { to: "/agents", label: "Agent Management", subtitle: "Providers and capabilities" },
  { to: "/goals", label: "Goal Setting", subtitle: "KPIs and targets" },
  { to: "/tasks", label: "Task Queue", subtitle: "Assignment and intervention" },
  { to: "/cost", label: "Cost Center", subtitle: "Budgets and forecasts" },
  { to: "/governance", label: "Governance", subtitle: "Policy and compliance" },
  { to: "/alerts", label: "Alerts", subtitle: "Escalation history" },
];

export function AppShell(): JSX.Element {
  return (
    <div className="page-shell">
      <header className="hero">
        <p className="eyebrow">AgentOps Control Plane</p>
        <h1>Software-Enforced Governance for AI Agent Teams</h1>
        <p>
          Assign goals, monitor spend, enforce policy invariants, and produce audit-grade evidence with no hardware dependencies.
        </p>
      </header>

      <nav className="tabs" aria-label="Main">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === "/"}
            className={({ isActive }) => (isActive ? "tab active" : "tab")}
          >
            <span>{link.label}</span>
            <small>{link.subtitle}</small>
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  );
}
