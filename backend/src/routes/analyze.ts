import { Router } from "express";
import { pool } from "../db";
import { runRuleEngine } from "../services/ruleEngine";
import { AnalyzeResponse, ExplainResult } from "../types";

export const analyzeRouter = Router();

/**
 * POST /api/analyze
 * Body: { query: string }
 *
 * Runs EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) on the submitted query and
 * returns the parsed plan plus any issues the rule engine found.
 *
 * IMPORTANT: EXPLAIN ANALYZE actually *executes* the query. Only SELECT
 * statements are allowed here — this is a read-only analysis tool, not a
 * general SQL runner.
 */
analyzeRouter.post("/", async (req, res) => {
  const { query } = req.body as { query?: string };

  if (!query || typeof query !== "string") {
    return res.status(400).json({ error: "Missing 'query' in request body." });
  }

  const trimmed = query.trim().replace(/;+\s*$/, "");
  if (!/^select/i.test(trimmed)) {
    return res
      .status(400)
      .json({ error: "Only SELECT queries can be analyzed by this tool." });
  }

  try {
    const { rows } = await pool.query(
      `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${trimmed}`
    );

    const explainResult: ExplainResult = rows[0]["QUERY PLAN"][0];
    const issues = runRuleEngine(explainResult.Plan);

    const response: AnalyzeResponse = {
      query: trimmed,
      planningTimeMs: explainResult["Planning Time"] ?? 0,
      executionTimeMs: explainResult["Execution Time"] ?? 0,
      issues,
      rawPlan: explainResult.Plan,
    };

    res.json(response);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message ?? "Failed to analyze query." });
  }
});
