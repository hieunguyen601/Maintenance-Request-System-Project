import { readFile } from "node:fs/promises";
import pg from "pg";
import { databaseConfig } from "../database-config.js";
const pool = new pg.Pool(databaseConfig(process.env, { direct: true }));
const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query(
    await readFile(new URL("../sql/schema.sql", import.meta.url), "utf8"),
  );
  await client.query("COMMIT");
  console.log(
    "Database tables, indexes, and categories are ready. Existing records were preserved.",
  );
} catch (error) {
  await client.query("ROLLBACK");
  console.error("Database setup failed:", error.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
