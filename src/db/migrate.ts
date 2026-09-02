import "dotenv/config";
import fs from "fs";
import path from "path";
import { Pool } from "pg";

// Run with: npm run migrate
// Applies 001_init.sql against DATABASE_URL. This is meant to run once
// against a fresh database, it is NOT safe to re-run as-is (CREATE TYPE and
// CREATE TABLE will error the second time). When you need schema changes
// later, add a new 002_*.sql file with just the new statements and list it
// below, rather than editing 001 or re-running it.

const MIGRATION_FILES = ["001_init.sql"];

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    for (const file of MIGRATION_FILES) {
      const fullPath = path.join(__dirname, "migrations", file);
      const sql = fs.readFileSync(fullPath, "utf-8");
      console.log(`Applying ${file}...`);
      await pool.query(sql);
      console.log(`Applied ${file}`);
    }
    console.log("Migrations complete.");
  } catch (err) {
    console.error("Migration failed:", err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
