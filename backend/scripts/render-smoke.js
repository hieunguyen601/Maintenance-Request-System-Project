import "../database-config.js";
import { mkdtemp, cp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "node:net";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import { setTimeout as delay } from "node:timers/promises";
import assert from "node:assert/strict";

// Install and start only backend files, without .env files, dev dependencies,
// or a frontend build. Credentials remain in the child process environment.
const directory = await mkdtemp(join(tmpdir(), "maintenance-render-check-"));
let child;
let exited;
let logs = "";
try {
  await cp(fileURLToPath(new URL("../", import.meta.url)), directory, {
    recursive: true,
    filter: (source) => {
      const name = source.split(/[\\/]/).at(-1);
      return (
        name !== "node_modules" && name !== "tests" && !name.startsWith(".env")
      );
    },
  });
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  const install = await promisify(execFile)(npm, ["ci", "--omit=dev"], {
    cwd: directory,
    env: process.env,
    timeout: 60000,
    maxBuffer: 4 * 1024 * 1024,
  });
  console.log(install.stdout.trim());
  const reservation = createServer();
  await new Promise((resolve) => reservation.listen(0, "127.0.0.1", resolve));
  const port = reservation.address().port;
  await new Promise((resolve) => reservation.close(resolve));
  const origin = "https://maintenance-request-system-project.vercel.app";
  child = spawn(process.execPath, ["server.js"], {
    cwd: directory,
    env: {
      ...process.env,
      NODE_ENV: "production",
      SERVE_FRONTEND: "false",
      TRUST_PROXY: "1",
      FRONTEND_ORIGIN: origin,
      PORT: String(port),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  exited = new Promise((resolve) => child.once("exit", resolve));
  child.stdout.on("data", (data) => {
    logs += data;
  });
  child.stderr.on("data", (data) => {
    logs += data;
  });
  const base = `http://127.0.0.1:${port}`;
  let ready = false;
  for (let attempt = 0; attempt < 50; attempt++) {
    if (child.exitCode !== null) throw new Error(logs);
    try {
      ready = (await fetch(base, { signal: AbortSignal.timeout(1000) })).ok;
    } catch {}
    if (ready) break;
    await delay(100);
  }
  assert.ok(ready, "API-only server did not start.");
  const root = await fetch(base);
  assert.equal((await root.json()).name, "Luxury Apartment API");
  const health = await fetch(`${base}/api/health`, {
    signal: AbortSignal.timeout(12000),
  });
  assert.equal(health.status, 200);
  assert.equal((await health.json()).status, "ok");
  const cors = await fetch(`${base}/api/requests`, {
    method: "OPTIONS",
    headers: {
      Origin: origin,
      "Access-Control-Request-Method": "GET",
      "Access-Control-Request-Headers": "authorization",
    },
  });
  assert.equal(cors.status, 204);
  assert.equal(cors.headers.get("access-control-allow-origin"), origin);
  assert.equal((await fetch(`${base}/api/requests`)).status, 401);
  child.kill("SIGTERM");
  assert.equal(await exited, 0);
  console.log(
    `Render checks passed on ${process.version}: clean production install, API-only startup, database health, Vercel CORS, protected endpoints, and graceful shutdown.`,
  );
} catch (error) {
  console.error("Render check failed:", error.message);
  if (logs) console.error(logs);
  process.exitCode = 1;
} finally {
  if (child && child.exitCode === null && child.signalCode === null) {
    child.kill("SIGTERM");
    const timeout = setTimeout(() => child.kill("SIGKILL"), 6000);
    await exited;
    clearTimeout(timeout);
  }
  await rm(directory, { recursive: true, force: true });
}
