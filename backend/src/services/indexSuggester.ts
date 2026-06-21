import { PlanNode } from "../types";

/**
 * Very deliberately simple: this is a rule-based heuristic, not a query
 * optimizer. It looks at the Filter / Index Cond / Sort Key text Postgres
 * already gives us in the plan and turns it into a CREATE INDEX suggestion.
 *
 * Examples of what Postgres puts in "Filter":
 *   "(status = 'pending'::text)"
 *   "((order_date >= '2024-01-01'::date) AND (order_date <= '2024-06-01'::date))"
 */
export function suggestIndexFromFilter(
  relation: string,
  filter: string
): string | null {
  // Pull out the column name(s) referenced before a comparison operator.
  // Matches things like "status =", "order_date >=", "user_id IN"
  const columnMatches = [
    ...filter.matchAll(/\(?([a-zA-Z_][a-zA-Z0-9_]*)\s*(=|>=|<=|>|<|IN|ANY)/g),
  ];

  const columns = [...new Set(columnMatches.map((m) => m[1]))].filter(
    (c) => !["AND", "OR", "NOT"].includes(c.toUpperCase())
  );

  if (columns.length === 0) return null;

  const indexName = `idx_${relation}_${columns.join("_")}`;
  return `CREATE INDEX ${indexName} ON ${relation} (${columns.join(", ")});`;
}

export function suggestIndexFromSortKey(
  relation: string,
  sortKeys: string[]
): string | null {
  if (!sortKeys || sortKeys.length === 0) return null;

  // Sort keys can come through as "table.column" or just "column"
  const columns = sortKeys.map((k) => k.split(".").pop() as string);
  const indexName = `idx_${relation}_${columns.join("_")}_sort`;
  return `CREATE INDEX ${indexName} ON ${relation} (${columns.join(", ")});`;
}

export function suggestIndexFromNode(node: PlanNode): string | null {
  const relation = node["Relation Name"];
  if (!relation) return null;

  if (node["Filter"]) {
    const fromFilter = suggestIndexFromFilter(relation, node["Filter"]);
    if (fromFilter) return fromFilter;
  }

  if (node["Sort Key"]) {
    return suggestIndexFromSortKey(relation, node["Sort Key"]);
  }

  return null;
}
