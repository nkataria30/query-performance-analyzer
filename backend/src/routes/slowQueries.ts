import { Router } from "express";
import { pool } from "../db";
import { SlowQueryStat } from "../types";

export const slowQueriesRouter = Router();

/**
 * GET /api/slow-queries
 * Pulls the worst-offending queries from pg_stat_statements, the Postgres
 * extension that tracks execution stats for every query run against the DB.
 * This is real data straight from Postgres — not something the app computed.
 */
slowQueriesRouter.get("/", async (req, res) => {
  const limit = Number(req.query.limit) || 20;

  try {
    const { rows } = await pool.query<SlowQueryStat>(
      `
      SELECT
      queryid::text,
      query,
      calls,
      round(total_exec_time::numeric, 2) AS total_exec_time,
      round(mean_exec_time::numeric, 2) AS mean_exec_time,
      rows
      FROM pg_stat_statements
      WHERE (
        query ILIKE '%orders%'
        OR query ILIKE '%order_items%'
        OR query ILIKE '%products%'
        OR query ILIKE '% users%'
        OR query ILIKE '%FROM users%'
      )
        AND query NOT ILIKE '%pg_stat_statements%'
        AND query NOT ILIKE 'COMMIT%'
        AND query NOT ILIKE 'BEGIN%'
      ORDER BY total_exec_time DESC
      LIMIT $1;
      `,
      [limit]
    );

    // pg_stat_statements tracks the exact top-level statement that ran —
    // since these demo queries were captured via EXPLAIN, the stored text
    // includes that wrapper. Strip it so the dashboard shows clean SELECTs.
    const cleaned = rows.map((r) => ({
      ...r,
      query: r.query.replace(/^EXPLAIN\s*\([^)]*\)\s*/i, "").trim(),
    }));

    res.json({ queries: cleaned });
  } catch (err: any) {
    console.error(err);
    if (err.code === "42P01") {
      // undefined_table — extension not enabled
      return res.status(500).json({
        error:
          "pg_stat_statements isn't enabled on this database. Run scripts/setup.sql first.",
      });
    }
    res.status(500).json({ error: "Failed to fetch slow queries." });
  }
});
