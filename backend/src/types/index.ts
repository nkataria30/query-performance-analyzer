// Shape of a row returned from pg_stat_statements
export interface SlowQueryStat {
  queryid: string;
  query: string;
  calls: number;
  total_exec_time: number; // ms
  mean_exec_time: number; // ms
  rows: number;
}

// Minimal shape of a node inside Postgres's EXPLAIN (FORMAT JSON) plan tree.
// Postgres returns many more fields than this — we only type what we read.
export interface PlanNode {
  "Node Type": string;
  "Relation Name"?: string;
  "Alias"?: string;
  "Actual Total Time"?: number;
  "Actual Rows"?: number;
  "Plan Rows"?: number;
  "Actual Loops"?: number;
  "Total Cost"?: number;
  "Filter"?: string;
  "Index Cond"?: string;
  "Sort Key"?: string[];
  "Sort Method"?: string;
  "Plans"?: PlanNode[];
}

export interface ExplainResult {
  Plan: PlanNode;
  "Planning Time"?: number;
  "Execution Time"?: number;
}

// A problem the rule engine found in a plan
export interface PlanIssue {
  type: "SEQ_SCAN" | "EXPENSIVE_SORT" | "ROW_ESTIMATE_MISMATCH";
  severity: "low" | "medium" | "high";
  nodeType: string;
  relation?: string;
  message: string;
  suggestion?: string; // e.g. a CREATE INDEX statement
}

export interface AnalyzeResponse {
  query: string;
  planningTimeMs: number;
  executionTimeMs: number;
  issues: PlanIssue[];
  rawPlan: PlanNode;
}
