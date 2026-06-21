import { PlanNode } from "../types";

/**
 * Recursively flattens a Postgres EXPLAIN plan tree into a flat array of nodes.
 * The plan tree nests child operations inside "Plans", which makes it
 * inconvenient to scan directly — flattening it lets the rule engine check
 * every node with simple array methods.
 */
export function flattenPlan(node: PlanNode): PlanNode[] {
  const nodes: PlanNode[] = [node];
  if (node.Plans && node.Plans.length > 0) {
    for (const child of node.Plans) {
      nodes.push(...flattenPlan(child));
    }
  }
  return nodes;
}

/**
 * Pulls out a short human-readable summary of a node, useful for displaying
 * the plan in the frontend without dumping the entire raw JSON.
 */
export function summarizeNode(node: PlanNode) {
  return {
    nodeType: node["Node Type"],
    relation: node["Relation Name"] ?? node["Alias"] ?? null,
    actualTimeMs: node["Actual Total Time"] ?? null,
    actualRows: node["Actual Rows"] ?? null,
    estimatedRows: node["Plan Rows"] ?? null,
    totalCost: node["Total Cost"] ?? null,
    filter: node["Filter"] ?? null,
    indexCond: node["Index Cond"] ?? null,
    sortKey: node["Sort Key"] ?? null,
    sortMethod: node["Sort Method"] ?? null,
  };
}
