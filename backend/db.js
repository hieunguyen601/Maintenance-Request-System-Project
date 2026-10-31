import pg from "pg";
import dotenv from "dotenv";

dotenv.config({ path: new URL("./.env", import.meta.url) });

const { Pool } = pg;
const schema = process.env.DB_SCHEMA;
if (schema && !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schema))
  throw new Error("Invalid DB_SCHEMA");

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 1000,
  ...(schema ? { options: `-c search_path=${schema}` } : {}),
});

pool.on("error", (error) =>
  console.error("Unexpected database connection error:", error.message),
);

export default pool;
