export default function SlowQueryTable({ queries, loading, error, selectedId, onSelect }) {
  if (loading) {
    return <div className="loading-state">$ fetching pg_stat_statements...</div>;
  }

  if (error) {
    return <div className="error-state">⨯ {error}</div>;
  }

  if (!queries || queries.length === 0) {
    return (
      <div className="empty-state">
        No query stats yet — run scripts/slow-queries.sql against your
        seeded database, then refresh.
      </div>
    );
  }

  return (
    <div>
      {queries.map((q) => (
        <div
          key={q.queryid}
          className={`query-row ${selectedId === q.queryid ? "selected" : ""}`}
          onClick={() => onSelect(q)}
        >
          <div className="query-text" title={q.query}>
            {q.query}
          </div>
          <div className="query-meta">
            <span className="label">Calls</span>
            {q.calls.toLocaleString()}
          </div>
          <div className="query-meta">
            <span className="label">Mean</span>
            {q.mean_exec_time}ms
          </div>
          <div className="query-meta">
            <span className="label">Total</span>
            {q.total_exec_time}ms
          </div>
        </div>
      ))}
    </div>
  );
}
