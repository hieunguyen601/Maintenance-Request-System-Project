import app from "./app.js";
import pool from "./db.js";
const port = Number(process.env.PORT || 5000);
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error("PORT must be an integer between 1 and 65535.");
if (!process.env.JWT_SECRET)
  throw new Error("JWT_SECRET is required in backend/.env.");

const server = app.listen(port, (error) => {
  if (error) {
    console.error(`Failed to start server on port ${port}:`, error.message);
    process.exitCode = 1;
    return;
  }
  console.log("Server running on port", port);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 5000).unref();
  });
}
