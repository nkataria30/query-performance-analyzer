function severityClass(sev) {
  if (sev === "high") return "severity-high";
  if (sev === "medium") return "severity-medium";
  return "severity-low";
}

export default function QueryDetail({ loading, error, result }) {
  if (loading) {
    return <div className="detail-empty">$ running EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)...</div>;
  }

  if (error) {
    return <div className="detail-empty" style={{ color: "var(--severity-high)" }}>⨯ {error}</div>;
  }

  if (!result) {
    return (
      <div className="detail-empty">
        Select a query on the left, or paste a SELECT query below, to see its
        execution plan and optimization suggestions.
      </div>
    );
  }

  return (
    <div>
      <div className="detail-section">
        <div className="detail-label">Query</div>
        <div className="detail-query">{result.query}</div>
      </div>

      <div className="detail-section">
        <div className="detail-label">Execution</div>
        <div className="stat-grid">
          <div className="stat-box">
            <div className="stat-value">{result.planningTimeMs.toFixed(2)}ms</div>
            <div className="stat-label">Planning time</div>
          </div>
          <div className="stat-box">
            <div className="stat-value">{result.executionTimeMs.toFixed(2)}ms</div>
            <div className="stat-label">Execution time</div>
          </div>
        </div>
      </div>

      <div className="detail-section">
        <div className="detail-label">
          Detected issues {result.issues.length > 0 ? `(${result.issues.length})` : ""}
        </div>
        {result.issues.length === 0 ? (
          <div className="no-issues">✓ No issues flagged by the rule engine.</div>
        ) : (
          result.issues.map((issue, i) => (
            <div className="issue-card" key={i}>
              <div className="issue-header">
                <span className={`severity-badge ${severityClass(issue.severity)}`}>
                  {issue.severity}
                </span>
                <span className="issue-node-type">
                  {issue.nodeType}
                  {issue.relation ? ` · ${issue.relation}` : ""}
                </span>
              </div>
              <div className="issue-message">{issue.message}</div>
              {issue.suggestion && (
                <div className="issue-suggestion">{issue.suggestion}</div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
