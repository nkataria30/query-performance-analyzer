import dns from "dns";
import dotenv from "dotenv";
import net from "net";
import { Pool } from "pg";

dotenv.config();

// WSL2 (and some other environments) advertise IPv6 connectivity that isn't
// actually routable, causing Node's "happy eyeballs" dual-stack resolution
// to try IPv6 first, hang/fail, then fall back to IPv4 — showing up as
// intermittent ETIMEDOUT / ENETUNREACH errors even though the network is
// otherwise fine. Forcing IPv4-first resolution + disabling the dual-stack
// race entirely avoids that.
dns.setDefaultResultOrder("ipv4first");
if (typeof net.setDefaultAutoSelectFamily === "function") {
  net.setDefaultAutoSelectFamily(false);
}

if (!process.env.DATABASE_URL) {
  console.warn(
    "⚠️  DATABASE_URL is not set. Copy .env.example to .env and fill it in."
  );
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Neon and most managed Postgres providers require SSL
  ssl: process.env.DATABASE_URL?.includes("sslmode=require")
    ? { rejectUnauthorized: false }
    : undefined,
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle Postgres client", err);
});