import type { Team } from "../types";

interface GoalsScreenProps {
  teams: Team[];
}

export function GoalsScreen({ teams }: GoalsScreenProps): JSX.Element {
  return (
    <section className="panel">
      <h2>Goal Registry</h2>
      <table>
        <thead>
          <tr>
            <th>Team</th>
            <th>Metric</th>
            <th>Target</th>
          </tr>
        </thead>
        <tbody>
          {teams.flatMap((team) =>
            team.goals.map((goal, idx) => (
              <tr key={`${team.id}-${idx}`}>
                <td>{team.name}</td>
                <td>{goal.metric}</td>
                <td>{goal.target}</td>
              </tr>
            )),
          )}
          {teams.flatMap((team) => team.goals).length === 0 && (
            <tr>
              <td colSpan={3}>No goals yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}
