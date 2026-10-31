import pg from "pg";
import { databaseConfig } from "./database-config.js";

const { Pool } = pg;
const pool = new Pool(databaseConfig());

pool.on("error", (error) =>
  console.error("Unexpected database connection error:", error.message),
);

export default pool;
