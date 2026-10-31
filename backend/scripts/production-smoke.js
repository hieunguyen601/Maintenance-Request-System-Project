import "../db.js";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import assert from "node:assert/strict";
import pool from "../db.js";
const reservation = createServer();
await new Promise((resolve) => reservation.listen(0, "127.0.0.1", resolve));
const port = reservation.address().port;
await new Promise((resolve) => reservation.close(resolve));
const root = fileURLToPath(new URL("../../", import.meta.url));
const child = spawn(process.execPath, ["scripts/start.mjs"], {
  cwd: root,
  env: { ...process.env, PORT: String(port) },
  stdio: ["ignore", "pipe", "pipe"],
});
let logs = "";
child.stdout.on("data", (data) => {
  logs += data;
});
child.stderr.on("data", (data) => {
  logs += data;
});
const exited = new Promise((resolve) => child.once("exit", resolve));
try {
  let ready = false;
  for (let attempt = 0; attempt < 40; attempt++) {
    if (child.exitCode !== null) throw new Error(logs);
    try {
      ready = (
        await fetch(`http://127.0.0.1:${port}/api/health`, {
          signal: AbortSignal.timeout(1000),
        })
      ).ok;
    } catch {}
    if (ready) break;
    await delay(100);
  }
  assert.ok(ready, `Server did not become healthy: ${logs}`);
  for (const route of [
    "/",
    "/login",
    "/tenant/requests",
    "/manager/apartments",
  ]) {
    const response = await fetch(`http://127.0.0.1:${port}${route}`);
    assert.equal(response.status, 200);
    assert.match(await response.text(), /Maintenance Services/);
  }
  assert.equal(
    (await fetch(`http://127.0.0.1:${port}/favicon.svg`)).status,
    200,
  );
  assert.equal(
    (await fetch(`http://127.0.0.1:${port}/api/requests`)).status,
    401,
  );
  console.log(
    "Production checks passed: healthy API, frontend assets, route refreshes, and protected endpoints.",
  );
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  child.kill("SIGTERM");
  await exited;
  await pool.end();
}
