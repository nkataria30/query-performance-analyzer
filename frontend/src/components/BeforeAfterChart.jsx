import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// `runs` is an array of { ms, timestamp } — one entry per time this exact
// query was run through "Run EXPLAIN ANALYZE". No hardcoded numbers: this
// renders whatever you've actually measured. Run a query, add an index,
// run the same query again — the second bar shows your real improvement.
export default function BeforeAfterChart({ runs, queryLabel, onClear }) {
  if (!runs || runs.length === 0) {
    return (
      <div className="chart-wrap">
        <div className="chart-empty">
          Run a query above with "Run EXPLAIN ANALYZE". Each run is tracked
          here — run it once, make a change (like adding an index), then run
          the exact same query again to see a real before/after comparison.
        </div>
      </div>
    );
  }

  const data = runs.map((r, i) => ({
    name:
      i === 0
        ? "Run 1"
        : i === runs.length - 1
        ? `Run ${i + 1} (latest)`
        : `Run ${i + 1}`,
    ms: r.ms,
  }));

  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#232a3b" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: "#8b92a8", fontSize: 12, fontFamily: "Inter" }}
            axisLine={{ stroke: "#232a3b" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#8b92a8", fontSize: 12, fontFamily: "JetBrains Mono" }}
            axisLine={false}
            tickLine={false}
            label={{
              value: "ms",
              angle: 0,
              position: "insideTopLeft",
              fill: "#565d72",
              fontSize: 11,
            }}
          />
          <Tooltip
            contentStyle={{
              background: "#11151f",
              border: "1px solid #232a3b",
              borderRadius: 6,
              fontFamily: "JetBrains Mono",
              fontSize: 12,
            }}
            labelStyle={{ color: "#e8eaf0" }}
            itemStyle={{ color: "#e8eaf0" }}
            cursor={{ fill: "#171c29" }}
          />
          <Bar dataKey="ms" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={
                  i === 0
                    ? "#fb7185"
                    : i === data.length - 1
                    ? "#5eead4"
                    : "#fbbf24"
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="chart-caption">{queryLabel}</div>
      {onClear && (
        <button className="btn-ghost" onClick={onClear}>
          Clear history for this query
        </button>
      )}
    </div>
  );
}