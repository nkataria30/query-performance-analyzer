# Query Performance Analyzer

Finds slow Postgres queries, explains why they're slow using real
`EXPLAIN ANALYZE` plan data, and suggests indexes to fix them — with a
dashboard that tracks actual measured run times, not hardcoded numbers.

## What it does

1. Reads live query stats from Postgres's `pg_stat_statements` extension
   (calls, total time, mean time).
2. Runs `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` on a selected query.
3. Walks the plan tree and flags known bad patterns: sequential scans on
   large tables, expensive/disk-spilling sorts, and row-estimate mismatches
   (stale stats).
4. Generates a `CREATE INDEX` suggestion from the filter/sort columns
   Postgres reports in the plan.
5. Dashboard tracks every run of a query in a "run history" chart — run
   once, add an index, run again, and the chart shows your real before/after.

## Architecture
┌─────────────┐      ┌──────────────────┐      ┌─────────────────────┐

│   React UI  │ ───▶ │  Express API      │ ───▶ │   PostgreSQL         │

│  (dashboard)│      │  - /slow-queries  │      │  - pg_stat_statements│

│             │ ◀─── │  - /analyze       │ ◀─── │  - EXPLAIN ANALYZE   │

└─────────────┘      └──────────────────┘      └─────────────────────┘

│

▼

┌──────────────────┐

│  Rule engine      │

│  - seq scan check │

│  - sort check     │

│  - row mismatch   │

│  - index suggester│

└──────────────────┘

## Tech stack

- **Backend**: Node.js, Express, TypeScript, `pg`
- **Frontend**: React (Vite), Recharts
- **Database**: PostgreSQL — chosen specifically for `pg_stat_statements`
  and `EXPLAIN (FORMAT JSON)`, which MySQL doesn't match in depth

## Key decisions

- **No ORM in the analysis path** — the point is reading real execution
  plans, so queries aren't hidden behind an abstraction layer.
- **Rule-based detection, not ML** — every flag traces back to a specific
  field in Postgres's own plan output, so it's explainable and extendable.
- **`EXPLAIN ANALYZE` only accepts `SELECT`** — it actually executes the
  query, so writes are rejected outright.
- **No hardcoded before/after numbers** — the chart only shows what's been
  measured by actually running a query through the tool.

## Setup

```bash
# 1. Get a free Postgres DB at neon.tech, then:
cd backend
cp .env.example .env          # add your DATABASE_URL
psql "$DATABASE_URL" -f scripts/setup.sql   # enables pg_stat_statements
psql "$DATABASE_URL" -f scripts/seed.sql    # ~1.25M rows of synthetic data
psql "$DATABASE_URL" -f scripts/slow-queries.sql  # populates stats

npm install && npm run dev    # backend, port 4000

# new terminal
cd frontend
npm install && npm run dev    # frontend, port 5173
```

Open `http://localhost:5173`.

## Case study

Real measurements from this project's database — run, indexed, re-run.

**1. `SELECT * FROM orders WHERE status = 'pending';`** (300K rows, no index)
- Before: `206.25ms` — `Seq Scan on orders`
- Fix: `CREATE INDEX idx_orders_status ON orders (status);`
- After: `12.33ms` — `Bitmap Heap Scan` + `Bitmap Index Scan`
- **~16.7x faster**

**2. `SELECT * FROM order_items WHERE order_id = 12345;`** (900K rows, no index)
- Before: `294.16ms` — `Seq Scan on order_items`
- Fix: `CREATE INDEX idx_order_items_order_id ON order_items (order_id);`
- After: `0.15ms` — `Bitmap Index Scan`
- **~1,961x faster** (point lookups benefit most from indexing)