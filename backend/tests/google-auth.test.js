import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import app from "../app.js";
import pool from "../db.js";

const payload = {
  sub: "google-test-subject",
  email: "google-test@example.com",
  email_verified: true,
  given_name: "Test",
  family_name: "Tenant",
};

function configure(t) {
  const previousClientId = process.env.GOOGLE_CLIENT_ID;
  const previousSecret = process.env.JWT_SECRET;
  process.env.GOOGLE_CLIENT_ID = "test-client-id";
  process.env.JWT_SECRET = "test-jwt-secret";
  t.after(() => {
    for (const [key, value] of [
      ["GOOGLE_CLIENT_ID", previousClientId],
      ["JWT_SECRET", previousSecret],
    ]) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  t.mock.method(OAuth2Client.prototype, "verifyIdToken", async (options) => {
    assert.equal(options.audience, "test-client-id");
    assert.equal(options.idToken, "test-credential");
    return { getPayload: () => payload };
  });
}

test("Google signup creates a tenant from verified Google details and issues a session", async (t) => {
  configure(t);
  const user = { id: 123, email: payload.email, role: "tenant" };
  const query = t.mock.method(pool, "query", async (sql, values) => {
    if (sql.includes("INSERT INTO")) {
      assert.match(sql, /'tenant'/);
      assert.deepEqual(values, ["Test", "Tenant", payload.email, payload.sub]);
      return { rows: [user] };
    }
    return { rows: [] };
  });
  const response = await request(app).post("/api/auth/google").send({
    credential: "test-credential",
    role: "manager",
    email: "spoofed@example.com",
  });
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.user, user);
  assert.equal(jwt.verify(response.body.token, "test-jwt-secret").id, user.id);
  assert.equal(query.mock.callCount(), 3);
  assert.equal(response.body.user.password, undefined);
});

test("Existing Google account signs in without creating another user", async (t) => {
  configure(t);
  const user = { id: 123, email: payload.email, role: "maintenance" };
  const query = t.mock.method(pool, "query", async () => ({ rows: [user] }));
  const response = await request(app)
    .post("/api/auth/google")
    .send({ credential: "test-credential" });
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.user, user);
  assert.equal(query.mock.callCount(), 1);
});

test("Google signup does not silently link an existing password account", async (t) => {
  configure(t);
  let calls = 0;
  t.mock.method(pool, "query", async () => ({
    rows: ++calls === 1 ? [] : [{ id: 123 }],
  }));
  const response = await request(app)
    .post("/api/auth/google")
    .send({ credential: "test-credential" });
  assert.equal(response.status, 409);
  assert.equal(calls, 2);
  assert.equal(response.body.token, undefined);
});

test("Invalid Google credential is rejected before querying the database", async (t) => {
  configure(t);
  t.mock.method(OAuth2Client.prototype, "verifyIdToken", async () => {
    throw new Error("Invalid token");
  });
  const query = t.mock.method(pool, "query", async () => {
    throw new Error("Unexpected database query");
  });
  const response = await request(app)
    .post("/api/auth/google")
    .send({ credential: "invalid" });
  assert.equal(response.status, 401);
  assert.equal(query.mock.callCount(), 0);
});

test("Google signup rejects unverified email addresses", async (t) => {
  configure(t);
  t.mock.method(OAuth2Client.prototype, "verifyIdToken", async () => ({
    getPayload: () => ({ ...payload, email_verified: false }),
  }));
  const query = t.mock.method(pool, "query", async () => {
    throw new Error("Unexpected database query");
  });
  const response = await request(app)
    .post("/api/auth/google")
    .send({ credential: "test-credential" });
  assert.equal(response.status, 401);
  assert.equal(query.mock.callCount(), 0);
});

test("Google authentication requires a configured client ID", async (t) => {
  configure(t);
  delete process.env.GOOGLE_CLIENT_ID;
  const response = await request(app)
    .post("/api/auth/google")
    .send({ credential: "test-credential" });
  assert.equal(response.status, 503);
});

test("Password login rejects Google-only accounts without a server error", async (t) => {
  t.mock.method(pool, "query", async () => ({
    rows: [{ id: 123, email: payload.email, password: null, role: "tenant" }],
  }));
  const response = await request(app).post("/api/login").send({
    email: payload.email,
    password: "any-password",
  });
  assert.equal(response.status, 401);
  assert.equal(response.body.token, undefined);
});
