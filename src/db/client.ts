import { Pool } from "pg";
import { config } from "../config";

export const pool = new Pool({
  connectionString: config.databaseUrl,
  // Supabase's pooled connections sit behind a proxy with a certificate that
  // node-postgres won't validate against a standard CA bundle by default.
  ssl: { rejectUnauthorized: false },
});

pool.on("error", (err) => {
  // A background, idle client failing shouldn't crash the whole process.
  console.error("Unexpected Postgres pool error:", err);
});
