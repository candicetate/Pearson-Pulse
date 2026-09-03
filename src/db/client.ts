import { Pool, types } from "pg";
import { config } from "../config";

// By default node-postgres parses SQL `date` columns into JS Date objects,
// which print with a full timestamp if they ever get shown as text. Tasks
// only need a plain YYYY-MM-DD, so keep dates as the raw string Postgres
// already sends instead of letting the driver convert them.
types.setTypeParser(1082, (value) => value);

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