
export default function AnalyzeBox({ value, onChange, onAnalyze, loading, hint }) {
  return (
    <div className="analyze-box">
      <div className="detail-label">Run analysis</div>
      <textarea
        className="analyze-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
      />
      {hint && <div className="analyze-hint">{hint}</div>}
      <button
        className="btn"
        disabled={loading || !value.trim()}
        onClick={() => onAnalyze(value)}
      >
        {loading ? "Analyzing..." : "Run EXPLAIN ANALYZE"}
      </button>
    </div>
  );
}
