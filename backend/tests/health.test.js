import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import bcrypt from "bcrypt";
import app from "../app.js";
import pool from "../db.js";

test("Login rejects missing credentials", async () => {
  assert.equal((await request(app).post("/api/login").send({})).status, 400);
});
test("Login rejects a request without a JSON body", async () => {
  assert.equal((await request(app).post("/api/login")).status, 400);
});
test("API rejects a JSON array instead of an object", async () => {
  assert.equal((await request(app).post("/api/user").send([])).status, 400);
});
test("Login rejects an incorrect password", async (t) => {
  t.mock.method(pool, "query", async () => ({
    rows: [
      {
        id: 1,
        email: "test@example.com",
        password: await bcrypt.hash("correct-password", 4),
        role: "tenant",
      },
    ],
  }));
  assert.equal(
    (
      await request(app)
        .post("/api/login")
        .send({ email: "test@example.com", password: "wrong-password" })
    ).status,
    401,
  );
});
test("Signup rejects empty fields", async () => {
  assert.equal((await request(app).post("/api/user").send({})).status, 400);
});
test("Public signup cannot create privileged accounts", async () => {
  assert.equal(
    (
      await request(app)
        .post("/api/user")
        .send({
          first_name: "Test",
          last_name: "User",
          email: "test@example.com",
          password: "password123",
          role: "manager",
        })
    ).status,
    403,
  );
});
test("Protected routes reject anonymous access", async () => {
  for (const endpoint of [
    "/api/me",
    "/api/requests",
    "/api/manager/users",
    "/api/manager/apartments",
  ])
    assert.equal((await request(app).get(endpoint)).status, 401);
});
test("Unconfigured health check reports failure without leaking connection details", async (t) => {
  t.mock.method(pool, "query", async () => {
    throw new Error("private connection details");
  });
  const response = await request(app).get("/api/health");
  assert.equal(response.status, 500);
  assert.ok(!response.text.includes("private connection details"));
});
