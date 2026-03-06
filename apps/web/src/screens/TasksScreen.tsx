import { FormEvent } from "react";
import { apiPost } from "../lib/api";
import type { Task, Team } from "../types";

interface TasksScreenProps {
  teams: Team[];
  tasks: Task[];
  loadData: () => Promise<void>;
}

export function TasksScreen({ teams, tasks, loadData }: TasksScreenProps): JSX.Element {
  async function onCreateTask(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const teamId = String(form.get("teamId"));

    await apiPost("/tasks", {
      team_id: teamId,
      description: form.get("description"),
      priority: form.get("priority"),
      budget: {
        tokens: Number(form.get("tokens")),
        usd: Number(form.get("usd")),
      },
      policies: ["no_pii_exposure", "enforce_budget_limits", "approved_tools_only"],
    });

    event.currentTarget.reset();
    await loadData();
  }

  return (
    <section className="grid two">
      <article className="panel">
        <h2>Assign Task</h2>
        <form onSubmit={onCreateTask} className="form-grid">
          <select name="teamId" required defaultValue="">
            <option value="" disabled>
              Select Team
            </option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
          <input name="description" placeholder="Handle refund requests" required />
          <select name="priority" defaultValue="high">
            <option>low</option>
            <option>medium</option>
            <option>high</option>
            <option>critical</option>
          </select>
          <input name="tokens" type="number" min={1} placeholder="10000" required />
          <input name="usd" type="number" min={0.01} step={0.01} placeholder="5.00" required />
          <button type="submit">Create Task</button>
        </form>
      </article>

      <article className="panel">
        <h2>Task Queue</h2>
        <ul className="feed">
          {tasks.map((task) => (
            <li key={task.id}>
              <b>{task.description}</b>
              <p>
                {task.priority.toUpperCase()} | ${task.budget_usd} | {task.policies.join(", ")}
              </p>
            </li>
          ))}
          {tasks.length === 0 && <li>No tasks in queue.</li>}
        </ul>
      </article>
    </section>
  );
}
