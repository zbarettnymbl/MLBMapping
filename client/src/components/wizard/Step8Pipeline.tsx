export function Step8Pipeline() {
  return (
    <div className="max-w-2xl mx-auto text-center py-12 space-y-4">
      <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
        <span className="text-2xl text-muted-foreground">&#9881;</span>
      </div>
      <h2 className="text-xl font-semibold text-foreground">Pipeline Configuration</h2>
      <p className="text-muted-foreground">
        Pipeline configuration is optional. You can set up automated data pipelines after publishing this exercise.
      </p>
      <p className="text-sm text-muted-foreground">
        Pipelines allow you to automate the flow of data from BigQuery through enrichment, validation, and back to BigQuery.
      </p>
    </div>
  );
}
