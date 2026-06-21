-- ============================================================================
-- Run these manually (psql, TablePlus, or paste into the dashboard's
-- "Analyze a query" box) AFTER running seed.sql.
--
-- Running them populates pg_stat_statements with real stats, and gives you
-- real before/after numbers for your README case study.
-- ============================================================================

-- 1) Filter on an unindexed column — should produce a Seq Scan
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT * FROM orders WHERE status = 'pending';

-- 2) Date range filter — also a Seq Scan over 300k rows
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT * FROM orders
WHERE order_date BETWEEN '2025-01-01' AND '2025-06-01';

-- 3) Join across three tables with a status filter — Nested Loop + Seq Scans
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT u.name, o.id, o.total, o.status
FROM orders o
JOIN users u ON u.id = o.user_id
WHERE o.status = 'shipped'
ORDER BY o.total DESC
LIMIT 100;

-- 4) Aggregation that needs a Sort — costly with no supporting index
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT product_id, SUM(quantity) AS total_sold
FROM order_items
GROUP BY product_id
ORDER BY total_sold DESC
LIMIT 20;

-- 5) Filtering order_items by order_id — common N+1-style query, unindexed FK
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT * FROM order_items WHERE order_id = 12345;


-- ============================================================================
-- AFTER you've recorded the "before" numbers above, apply these indexes one
-- at a time and re-run the matching query to capture "after" numbers.
-- This before/after pair is the most important artifact for your README —
-- screenshot or copy the "Execution Time" line from each EXPLAIN output.
-- ============================================================================

CREATE INDEX idx_orders_status ON orders (status);
CREATE INDEX idx_orders_order_date ON orders (order_date);
CREATE INDEX idx_orders_user_id ON orders (user_id);
CREATE INDEX idx_order_items_order_id ON order_items (order_id);
CREATE INDEX idx_order_items_product_id_quantity ON order_items (product_id, quantity);

-- Re-run query 1 and 5 in particular — those show the clearest before/after
-- improvement (seq scan over 300k/900k rows vs. an index scan).
