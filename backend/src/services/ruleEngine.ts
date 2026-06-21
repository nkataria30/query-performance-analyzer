import { PlanNode, PlanIssue } from "../types";
import { flattenPlan } from "./planParser";
import { suggestIndexFromNode, suggestIndexFromSortKey } from "./indexSuggester";

// Tunable thresholds — kept simple and explicit on purpose so they're easy
// to explain in an interview ("why 1000 rows?") rather than buried in config.
const SEQ_SCAN_ROW_THRESHOLD = 1000; // flag seq scans touching more than this many rows
const EXPENSIVE_SORT_TIME_MS = 50; // flag sorts taking longer than this
const ROW_ESTIMATE_RATIO_THRESHOLD = 10; // flag when actual rows is 10x+ off from estimate

export function runRuleEngine(rootNode: PlanNode): PlanIssue[] {
  const nodes = flattenPlan(rootNode);
  const issues: PlanIssue[] = [];

  for (const node of nodes) {
    issues.push(...checkSeqScan(node));
    issues.push(...checkExpensiveSort(node));
    issues.push(...checkRowEstimateMismatch(node));
  }

  return issues;
}

function checkSeqScan(node: PlanNode): PlanIssue[] {
  if (node["Node Type"] !== "Seq Scan") return [];

  const actualRows = node["Actual Rows"] ?? 0;
  if (actualRows < SEQ_SCAN_ROW_THRESHOLD) return [];

  const relation = node["Relation Name"] ?? "unknown_table";
  const suggestion = suggestIndexFromNode(node);

  return [
    {
      type: "SEQ_SCAN",
      severity: actualRows > SEQ_SCAN_ROW_THRESHOLD * 10 ? "high" : "medium",
      nodeType: node["Node Type"],
      relation,
      message: `Sequential scan on "${relation}" examined ${actualRows.toLocaleString()} rows. ${
        node["Filter"]
          ? `Filter: ${node["Filter"]}`
          : "No filter — this may need to scan the whole table by design."
      }`,
      suggestion: suggestion ?? undefined,
    },
  ];
}

function checkExpensiveSort(node: PlanNode): PlanIssue[] {
  if (node["Node Type"] !== "Sort") return [];

  const timeMs = node["Actual Total Time"] ?? 0;
  if (timeMs < EXPENSIVE_SORT_TIME_MS) return [];

  const diskSort = node["Sort Method"]?.toLowerCase().includes("disk");
  const sortKeys = node["Sort Key"] ?? [];

  // The relation isn't directly on the Sort node — it sorts the output of
  // its child, so we don't have a clean table name here without walking up.
  // For the suggestion we just show the columns being sorted on.
  const suggestion =
    sortKeys.length > 0
      ? `Consider an index covering: (${sortKeys
          .map((k) => k.split(".").pop())
          .join(", ")}) to let Postgres use an index scan instead of sorting.`
      : undefined;

  return [
    {
      type: "EXPENSIVE_SORT",
      severity: diskSort ? "high" : "medium",
      nodeType: node["Node Type"],
      message: `Sort took ${timeMs.toFixed(1)}ms${
        diskSort ? " and spilled to disk (Sort Method: " + node["Sort Method"] + ")" : ""
      }.${sortKeys.length ? ` Sorting on: ${sortKeys.join(", ")}.` : ""}`,
      suggestion,
    },
  ];
}

function checkRowEstimateMismatch(node: PlanNode): PlanIssue[] {
  const actual = node["Actual Rows"];
  const estimated = node["Plan Rows"];

  if (actual === undefined || estimated === undefined || estimated === 0)
    return [];

  const ratio = actual / estimated;
  if (ratio < ROW_ESTIMATE_RATIO_THRESHOLD && ratio > 1 / ROW_ESTIMATE_RATIO_THRESHOLD)
    return [];

  return [
    {
      type: "ROW_ESTIMATE_MISMATCH",
      severity: "low",
      nodeType: node["Node Type"],
      relation: node["Relation Name"],
      message: `Planner estimated ${estimated.toLocaleString()} rows but actually got ${actual.toLocaleString()} for ${node["Node Type"]}${
        node["Relation Name"] ? ` on "${node["Relation Name"]}"` : ""
      }. Stale statistics can cause Postgres to pick a bad plan — try running ANALYZE on this table.`,
    },
  ];
}
