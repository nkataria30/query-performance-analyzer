import { useEffect, useState } from "react";
import { analyzeQuery, fetchSlowQueries } from "./api";
import AnalyzeBox from "./components/AnalyzeBox";
import BeforeAfterChart from "./components/BeforeAfterChart";
import QueryDetail from "./components/QueryDetail";
import SlowQueryTable from "./components/SlowQueryTable";

const HAS_PLACEHOLDERS = /\$\d+/;
const HISTORY_STORAGE_KEY = "qpa_run_history";

// Two queries count as "the same query" for history-tracking purposes if
// they're identical once whitespace and a trailing semicolon are ignored.
// This is what lets "run it, add an index, run it again" line up as
// before/after entries for the same chart.
function normalizeQuery(q) {
  return q.trim().replace(/;+\s*$/, "").replace(/\s+/g, " ");
}

function loadHistory() {
  try {
    const saved = localStorage.getItem(HISTORY_STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

export default function App() {
  const [queries, setQueries] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState(null);

  const [selectedId, setSelectedId] = useState(null);
  const [result, setResult] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);

  const [analyzeValue, setAnalyzeValue] = useState(
    "SELECT * FROM orders WHERE status = 'pending';"
  );

  // runHistory: { [normalizedQueryText]: { displayQuery, runs: [{ ms, timestamp }] } }
  const [runHistory, setRunHistory] = useState(loadHistory);
  const [currentKey, setCurrentKey] = useState(null);

  useEffect(() => {
    loadQueries();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(runHistory));
    } catch {
      // storage full or unavailable — history just won't persist across reloads
    }
  }, [runHistory]);

  async function loadQueries() {
    setListLoading(true);
    setListError(null);
    try {
      const data = await fetchSlowQueries(20);
      setQueries(data.queries);
    } catch (err) {
      setListError(err.message);
    } finally {
      setListLoading(false);
    }
  }

  // Clicking a row from pg_stat_statements: Postgres normalizes literal
  // values into $1/$2 placeholders, so we can't safely auto-run it. Load it
  // into the editable box instead and let the person fill in real values.
  function handleRowSelect(q) {
    setSelectedId(q.queryid);
    setAnalyzeValue(q.query);
    setResult(null);
    setDetailError(null);
  }

  async function runAnalysis(queryText) {
    setDetailLoading(true);
    setDetailError(null);
    setResult(null);
    try {
      const data = await analyzeQuery(queryText);
      setResult(data);

      const key = normalizeQuery(queryText);
      setRunHistory((prev) => {
        const existing = prev[key] || {
          displayQuery: queryText.trim(),
          runs: [],
        };
        return {
          ...prev,
          [key]: {
            displayQuery: existing.displayQuery,
            runs: [
              ...existing.runs,
              { ms: data.executionTimeMs, timestamp: Date.now() },
            ],
          },
        };
      });
      setCurrentKey(key);
    } catch (err) {
      setDetailError(err.message);
    } finally {
      setDetailLoading(false);
    }
  }

  function clearCurrentHistory() {
    if (!currentKey) return;
    setRunHistory((prev) => {
      const updated = { ...prev };
      delete updated[currentKey];
      return updated;
    });
  }

  const hint = HAS_PLACEHOLDERS.test(analyzeValue)
    ? "This query was normalized by Postgres ($1, $2... in place of literal values). Replace the placeholders with real values before running."
    : null;

  const currentHistory = currentKey ? runHistory[currentKey] : null;

  return (
    <div className="app">
      <div className="header">
        <div>
          <div className="header-title">Query Performance Analyzer</div>
          <div className="header-prompt">
            $ tracking pg_stat_statements<span className="caret" />
          </div>
        </div>
        <div className="live-dot">live · postgres</div>
      </div>

      <div className="layout">
        <div className="panel">
          <div className="panel-header">
            <span>Top slow queries</span>
            <span>{queries.length} tracked</span>
          </div>
          <SlowQueryTable
            queries={queries}
            loading={listLoading}
            error={listError}
            selectedId={selectedId}
            onSelect={handleRowSelect}
          />
        </div>

        <div>
          <div className="panel" style={{ marginBottom: 20 }}>
            <div className="panel-header">
              <span>Execution plan</span>
            </div>
            <QueryDetail loading={detailLoading} error={detailError} result={result} />
            <div style={{ borderTop: "1px solid var(--border)" }}>
              <AnalyzeBox
                value={analyzeValue}
                onChange={setAnalyzeValue}
                onAnalyze={runAnalysis}
                loading={detailLoading}
                hint={hint}
              />
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <span>Run history</span>
              {currentHistory && <span>{currentHistory.runs.length} runs</span>}
            </div>
            <BeforeAfterChart
              runs={currentHistory?.runs}
              queryLabel={currentHistory?.displayQuery}
              onClear={currentHistory ? clearCurrentHistory : null}
            />
          </div>
        </div>
      </div>
    </div>
  );
}