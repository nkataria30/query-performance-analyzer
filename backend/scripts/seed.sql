-- ============================================================================
-- Seed script for the Query Performance Analyzer demo.
-- Creates a small e-commerce schema and loads synthetic data using
-- generate_series (fast, runs entirely inside Postgres — no app round trips).
--
-- Deliberately NO indexes are created beyond primary keys, so the queries in
-- scripts/slow-queries.sql will produce real sequential scans you can fix.
-- ============================================================================

DROP TABLE IF EXISTS order_items, orders, products, users CASCADE;

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  country TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL
);

CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL
);

CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  status TEXT NOT NULL,
  order_date DATE NOT NULL,
  total NUMERIC(10, 2) NOT NULL
);

CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL
);

-- 50,000 users
INSERT INTO users (name, email, country, created_at)
SELECT
  'User ' || g,
  'user' || g || '@example.com',
  (ARRAY['US', 'IN', 'UK', 'DE', 'BR', 'CA', 'AU'])[1 + floor(random() * 7)],
  NOW() - (random() * INTERVAL '730 days')
FROM generate_series(1, 50000) AS g;

-- 2,000 products
INSERT INTO products (name, category, price)
SELECT
  'Product ' || g,
  (ARRAY['electronics', 'home', 'clothing', 'books', 'toys', 'sports'])[1 + floor(random() * 6)],
  round((random() * 490 + 10)::numeric, 2)
FROM generate_series(1, 2000) AS g;

-- 300,000 orders, skewed status distribution (most queries will filter on
-- status = 'pending' or a date range, which is what makes them slow without
-- an index on those columns)
INSERT INTO orders (user_id, status, order_date, total)
SELECT
  1 + floor(random() * 50000)::int,
  (ARRAY['pending', 'pending', 'shipped', 'shipped', 'shipped', 'delivered', 'delivered', 'delivered', 'delivered', 'cancelled'])[1 + floor(random() * 10)],
  (CURRENT_DATE - (random() * 365)::int),
  round((random() * 480 + 20)::numeric, 2)
FROM generate_series(1, 300000) AS g;

-- ~900,000 order items (avg 3 items per order)
INSERT INTO order_items (order_id, product_id, quantity, unit_price)
SELECT
  1 + floor(random() * 300000)::int,
  1 + floor(random() * 2000)::int,
  1 + floor(random() * 5)::int,
  round((random() * 490 + 10)::numeric, 2)
FROM generate_series(1, 900000) AS g;

-- Make sure the planner's statistics are fresh before you start analyzing.
ANALYZE users;
ANALYZE products;
ANALYZE orders;
ANALYZE order_items;
