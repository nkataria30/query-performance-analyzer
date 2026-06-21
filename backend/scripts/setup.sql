-- Enables the extension that tracks execution statistics for every query
-- run against this database. On Neon/Supabase/most managed Postgres this
-- is allowed by default. On a self-hosted Postgres you may also need to add
-- `shared_preload_libraries = 'pg_stat_statements'` to postgresql.conf and
-- restart the server before this CREATE EXTENSION will work.

CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Optional: reset stats so your dashboard starts clean
-- SELECT pg_stat_statements_reset();
