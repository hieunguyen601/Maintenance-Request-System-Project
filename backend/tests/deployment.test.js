import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

process.env.NODE_ENV = "production";
process.env.SERVE_FRONTEND = "false";
process.env.FRONTEND_ORIGIN =
  "https://maintenance-request-system-project.vercel.app";
process.env.TRUST_PROXY = "1";
const { default: app } = await import("../app.js");
const { default: pool } = await import("../db.js");

test("API-only production root does not depend on frontend build files", async () => {
  const response = await request(app).get("/");
  assert.equal(response.status, 200);
  assert.match(response.headers["content-type"], /application\/json/);
  assert.equal(response.body.health, "/api/health");
});
test("Vercel origin can preflight authorized API requests", async () => {
  const response = await request(app)
    .options("/api/requests")
    .set("Origin", process.env.FRONTEND_ORIGIN)
    .set("Access-Control-Request-Method", "GET")
    .set("Access-Control-Request-Headers", "authorization");
  assert.equal(response.status, 204);
  assert.equal(
    response.headers["access-control-allow-origin"],
    process.env.FRONTEND_ORIGIN,
  );
  assert.match(
    response.headers["access-control-allow-headers"],
    /authorization/i,
  );
});
test("An unrelated browser origin does not receive CORS permission", async () => {
  const response = await request(app)
    .options("/api/requests")
    .set("Origin", "https://unrelated.example")
    .set("Access-Control-Request-Method", "GET");
  assert.equal(response.headers["access-control-allow-origin"], undefined);
});
test("Render health checks reach the database without authentication", async (t) => {
  t.mock.method(pool, "query", async () => ({ rows: [{ "?column?": 1 }] }));
  const response = await request(app).get("/api/health");
  assert.equal(response.status, 200);
  assert.equal(response.body.status, "ok");
});
