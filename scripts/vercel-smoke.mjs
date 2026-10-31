import { mkdtemp, cp, rm, readFile, readdir, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import assert from "node:assert/strict";

const directory = await mkdtemp(join(tmpdir(), "maintenance-vercel-check-"));
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const run = promisify(execFile);
const apiUrl = "https://deployment-check.example/api";
const privateMarker = "DO_NOT_BUNDLE_PRIVATE_SETTINGS_382";
const buildEnv = {
  ...process.env,
  VERCEL: "1",
  VITE_API_BASE_URL: apiUrl,
  VITE_GOOGLE_CLIENT_ID: "",
  DATABASE_URL: privateMarker,
  JWT_SECRET: privateMarker,
};
try {
  await cp(fileURLToPath(new URL("../frontend/", import.meta.url)), directory, {
    recursive: true,
    filter: (source) => {
      const name = source.split(/[\\/]/).at(-1);
      return (
        name !== "node_modules" &&
        name !== "dist" &&
        name !== ".vercel" &&
        !name.startsWith(".env")
      );
    },
  });
  const install = await run(npm, ["ci", "--include=dev"], {
    cwd: directory,
    env: buildEnv,
    timeout: 60000,
    maxBuffer: 4 * 1024 * 1024,
  });
  console.log(install.stdout.trim());
  const build = await run(npm, ["run", "build"], {
    cwd: directory,
    env: buildEnv,
    timeout: 60000,
    maxBuffer: 4 * 1024 * 1024,
  });
  console.log(build.stdout.trim());
  const html = await readFile(join(directory, "dist/index.html"), "utf8");
  assert.match(html, /Luxury Apartment/);
  for (const [, url] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    if (url.startsWith("/"))
      await access(join(directory, "dist", url.slice(1)));
  }
  const scripts = (await readdir(join(directory, "dist/assets"))).filter(
    (name) => name.endsWith(".js"),
  );
  const bundle = (
    await Promise.all(
      scripts.map((name) =>
        readFile(join(directory, "dist/assets", name), "utf8"),
      ),
    )
  ).join("\n");
  assert.ok(
    bundle.includes(apiUrl),
    "The API URL was not embedded in the production bundle.",
  );
  assert.ok(
    !bundle.includes(privateMarker),
    "A private environment setting was bundled.",
  );
  for (const invalid of [
    "",
    "http://deployment-check.example/api",
    "https://deployment-check.example",
  ]) {
    let rejected = false;
    try {
      await run(npm, ["run", "build"], {
        cwd: directory,
        env: { ...buildEnv, VITE_API_BASE_URL: invalid },
        timeout: 60000,
        maxBuffer: 4 * 1024 * 1024,
      });
    } catch (error) {
      rejected = /VITE_API_BASE_URL/.test(
        `${error.stdout || ""}\n${error.stderr || ""}`,
      );
    }
    assert.ok(
      rejected,
      "A Vercel build accepted a missing or invalid API URL.",
    );
  }
  const config = JSON.parse(
    await readFile(join(directory, "vercel.json"), "utf8"),
  );
  assert.ok(
    config.rewrites.some(
      (rule) => rule.source === "/(.*)" && rule.destination === "/index.html",
    ),
  );
  console.log(
    `Vercel checks passed on ${process.version}: clean frontend-only build, bundled API URL, static assets, SPA configuration, no bundled backend secrets, and invalid-configuration errors.`,
  );
} catch (error) {
  console.error("Vercel check failed:", error.message);
  if (error.stdout) console.error(error.stdout);
  if (error.stderr) console.error(error.stderr);
  process.exitCode = 1;
} finally {
  await rm(directory, { recursive: true, force: true });
}
