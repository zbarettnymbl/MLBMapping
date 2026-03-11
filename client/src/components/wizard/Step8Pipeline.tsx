export function Step8Pipeline() {
  return (
    <div className="max-w-2xl mx-auto text-center py-12 space-y-4">
      <div className="w-16 h-16 mx-auto bg-forge-800 rounded-full flex items-center justify-center">
        <span className="text-2xl text-forge-400">&#9881;</span>
      </div>
      <h2 className="text-xl font-semibold text-forge-100">Pipeline Configuration</h2>
      <p className="text-forge-400">
        Pipeline configuration is optional. You can set up automated data pipelines after publishing this exercise.
      </p>
      <p className="text-sm text-forge-500">
        Pipelines allow you to automate the flow of data from BigQuery through enrichment, validation, and back to BigQuery.
      </p>
    </div>
  );
}
