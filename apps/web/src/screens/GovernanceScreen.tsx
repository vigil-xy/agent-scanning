import { apiPost } from "../lib/api";
import type { Task } from "../types";

interface GovernanceScreenProps {
  tasks: Task[];
  compliance: unknown;
  loadData: () => Promise<void>;
}

export function GovernanceScreen({ tasks, compliance, loadData }: GovernanceScreenProps): JSX.Element {
  async function simulatePolicyCheck(): Promise<void> {
    if (!tasks[0]) {
      return;
    }

    await apiPost("/policy/check", {
      task_id: tasks[0].id,
      approved_tools: ["knowledge-base", "crm.lookup"],
      agent_action: {
        output: "Customer email: test@example.com and card 4111 1111 1111 1111",
        costUsd: 0.22,
        costTokens: 780,
        tool: "unapproved.export",
      },
    });

    await loadData();
  }

  return (
    <section className="grid two">
      <article className="panel">
        <h2>Policy Engine</h2>
        <p>Run a simulated action to validate no-PII, budget, and approved-tool policies.</p>
        <button type="button" onClick={simulatePolicyCheck}>
          Simulate Violation
        </button>
      </article>
      <article className="panel">
        <h2>Compliance Snapshot</h2>
        <pre>{JSON.stringify(compliance, null, 2)}</pre>
      </article>
    </section>
  );
}
