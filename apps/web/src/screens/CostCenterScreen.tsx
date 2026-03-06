interface CostCenterScreenProps {
  costSummary: unknown;
}

export function CostCenterScreen({ costSummary }: CostCenterScreenProps): JSX.Element {
  return (
    <section className="panel">
      <h2>Cost Center</h2>
      <pre>{JSON.stringify(costSummary, null, 2)}</pre>
    </section>
  );
}
