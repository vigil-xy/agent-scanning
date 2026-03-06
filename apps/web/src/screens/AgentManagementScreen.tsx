import { FormEvent } from "react";
import { apiPost } from "../lib/api";
import type { Team } from "../types";

interface AgentManagementScreenProps {
  teams: Team[];
  loadData: () => Promise<void>;
}

export function AgentManagementScreen({ teams, loadData }: AgentManagementScreenProps): JSX.Element {
  async function onCreateTeam(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    await apiPost("/teams", {
      name: form.get("name"),
      agents: [
        {
          provider: form.get("provider"),
          model: form.get("model"),
          role: form.get("role"),
          capabilities: ["triage", "reasoning"],
        },
      ],
      goals: [
        {
          metric: form.get("metric"),
          target: form.get("target"),
        },
      ],
    });

    event.currentTarget.reset();
    await loadData();
  }

  return (
    <section className="grid two">
      <article className="panel">
        <h2>Add Team + Lead Agent</h2>
        <form onSubmit={onCreateTeam} className="form-grid">
          <input name="name" placeholder="Customer Support Squad" required />
          <input name="provider" placeholder="openai" required />
          <input name="model" placeholder="gpt-4.1" required />
          <input name="role" placeholder="triage" required />
          <input name="metric" placeholder="response_time" required />
          <input name="target" placeholder="< 2 min" required />
          <button type="submit">Create Team</button>
        </form>
      </article>

      <article className="panel">
        <h2>Active Agent Teams</h2>
        <ul className="feed">
          {teams.map((team) => (
            <li key={team.id}>
              <b>{team.name}</b>
              <p>{team.agents.map((a) => `${a.provider}:${a.model}:${a.role}`).join(" | ")}</p>
            </li>
          ))}
          {teams.length === 0 && <li>Create your first team.</li>}
        </ul>
      </article>
    </section>
  );
}
