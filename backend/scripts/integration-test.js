import "dotenv/config";
import pg from "pg";
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import bcrypt from "bcrypt";
import request from "supertest";

const schema = `maintenance_test_${randomBytes(8).toString("hex")}`;
const admin = new pg.Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionTimeoutMillis: 5000,
});
let pool;
let created = false;
let checks = 0;
const expect = (response, status) => {
  assert.equal(
    response.status,
    status,
    `${response.req.method} ${response.req.path}: ${response.text}`,
  );
  checks++;
  return response.body;
};
try {
  await admin.connect();
  await admin.query(`CREATE SCHEMA ${schema}`);
  created = true;
  await admin.query(`SET search_path TO ${schema}`);
  await admin.query(
    await readFile(new URL("../sql/schema.sql", import.meta.url), "utf8"),
  );
  // Verify setup can safely run twice.
  await admin.query(
    await readFile(new URL("../sql/schema.sql", import.meta.url), "utf8"),
  );
  process.env.DB_SCHEMA = schema;
  process.env.JWT_SECRET = randomBytes(32).toString("hex");
  const password = "Integration-password-123";
  const manager = (
    await admin.query(
      "INSERT INTO users (first_name,last_name,email,password,role) VALUES ('Test','Manager','manager@example.test',$1,'manager') RETURNING id",
      [await bcrypt.hash(password, 4)],
    )
  ).rows[0];
  const app = (await import("../app.js")).default;
  pool = (await import("../db.js")).default;
  const api = request(app);
  expect(await api.get("/api/health"), 200);
  const managerSession = expect(
    await api
      .post("/api/login")
      .send({ email: "MANAGER@example.test", password }),
    200,
  );
  assert.equal(managerSession.user.id, manager.id);
  const auth = (token) => ({ Authorization: `Bearer ${token}` });
  const managerAuth = auth(managerSession.token);
  const tenantData = {
    first_name: "Test",
    last_name: "Tenant",
    email: "tenant@example.test",
    password,
  };
  const tenant = expect(await api.post("/api/user").send(tenantData), 201).data;
  assert.ok(!("password" in tenant));
  expect(
    await api
      .post("/api/user")
      .send({ ...tenantData, email: "TENANT@example.test" }),
    409,
  );
  expect(
    await api
      .post("/api/user")
      .send({ ...tenantData, email: "admin@example.test", role: "manager" }),
    403,
  );
  const tenantAuth = auth(
    expect(
      await api.post("/api/login").send({ email: tenantData.email, password }),
      200,
    ).token,
  );
  const outsider = expect(
    await api
      .post("/api/user")
      .send({ ...tenantData, email: "outsider@example.test" }),
    201,
  ).data;
  const outsiderAuth = auth(
    expect(
      await api.post("/api/login").send({ email: outsider.email, password }),
      200,
    ).token,
  );
  const worker = expect(
    await api
      .post("/api/manager/users")
      .set(managerAuth)
      .send({
        first_name: "Test",
        last_name: "Worker",
        email: "worker@example.test",
        password,
        role: "maintenance",
      }),
    201,
  );
  const workerAuth = auth(
    expect(
      await api.post("/api/login").send({ email: worker.email, password }),
      200,
    ).token,
  );
  const worker2 = expect(
    await api
      .post("/api/manager/users")
      .set(managerAuth)
      .send({
        first_name: "Other",
        last_name: "Worker",
        email: "otherworker@example.test",
        password,
        role: "maintenance",
      }),
    201,
  );
  const worker2Auth = auth(
    expect(
      await api.post("/api/login").send({ email: worker2.email, password }),
      200,
    ).token,
  );
  expect(await api.get("/api/manager/users").set(tenantAuth), 403);
  expect(await api.post("/api/manager/users").set(tenantAuth).send({}), 403);
  const categories = expect(
    await api.get("/api/category").set(tenantAuth),
    200,
  );
  const data = {
    category_id: categories[0].id,
    title: "Kitchen leak",
    description: "Water under the sink",
    priority: "high",
    tenant_id: outsider.id,
    status: "completed",
  };
  expect(await api.post("/api/request").set(tenantAuth).send(data), 409);
  const apartment = expect(
    await api
      .post("/api/apartment")
      .set(managerAuth)
      .send({
        building: "Test Building",
        unit_number: "101",
        floor: "1",
        tenant_id: tenant.id,
      }),
    201,
  );
  expect(await api.post("/api/apartment").set(tenantAuth).send({}), 403);
  assert.equal(
    expect(await api.get("/api/apartment").set(tenantAuth), 200).id,
    apartment.id,
  );
  expect(
    await api
      .post("/api/request")
      .set(tenantAuth)
      .send({ ...data, title: " " }),
    400,
  );
  expect(
    await api
      .post("/api/request")
      .set(tenantAuth)
      .send({ ...data, category_id: 999999 }),
    400,
  );
  const work = expect(
    await api.post("/api/request").set(tenantAuth).send(data),
    201,
  ).data;
  assert.equal(work.tenant_id, tenant.id);
  assert.equal(work.status, "pending");
  assert.equal(
    expect(await api.get("/api/requests").set(outsiderAuth), 200).length,
    0,
  );
  expect(await api.get(`/api/requests/${work.id}`).set(outsiderAuth), 404);
  expect(
    await api
      .post("/api/comment")
      .set(outsiderAuth)
      .send({ request_id: work.id, message: "unauthorized" }),
    404,
  );
  expect(
    await api
      .patch(`/api/manager/requests/${work.id}/assign`)
      .set(managerAuth)
      .send({ assigned_to: tenant.id }),
    400,
  );
  expect(
    await api
      .patch(`/api/manager/requests/${work.id}/assign`)
      .set(managerAuth)
      .send({ assigned_to: worker.id }),
    200,
  );
  assert.equal(
    expect(await api.get("/api/maintenance/assigned").set(workerAuth), 200)
      .length,
    1,
  );
  expect(
    await api
      .patch(`/api/maintenance/requests/${work.id}/status`)
      .set(worker2Auth)
      .send({ status: "in_progress" }),
    404,
  );
  expect(
    await api
      .patch(`/api/maintenance/requests/${work.id}/status`)
      .set(workerAuth)
      .send({ status: "completed" }),
    409,
  );
  expect(
    await api
      .patch(`/api/maintenance/requests/${work.id}/status`)
      .set(workerAuth)
      .send({ status: "in_progress" }),
    200,
  );
  const comment = expect(
    await api
      .post("/api/comment")
      .set(workerAuth)
      .send({
        request_id: work.id,
        user_id: outsider.id,
        message: "Repair in progress",
      }),
    201,
  );
  assert.equal(comment.user_id, worker.id);
  expect(
    await api
      .patch(`/api/maintenance/requests/${work.id}/status`)
      .set(workerAuth)
      .send({ status: "completed" }),
    200,
  );
  expect(
    await api
      .patch(`/api/manager/requests/${work.id}/assign`)
      .set(managerAuth)
      .send({ assigned_to: worker2.id }),
    409,
  );
  expect(
    await api
      .patch(`/api/maintenance/requests/${work.id}/status`)
      .set(workerAuth)
      .send({ status: "in_progress" }),
    409,
  );
  const detail = expect(
    await api.get(`/api/requests/${work.id}`).set(tenantAuth),
    200,
  );
  assert.equal(detail.history.length, 4);
  assert.equal(detail.comments.length, 1);
  assert.ok(detail.completed_at);
  expect(
    await api
      .patch("/api/me")
      .set(tenantAuth)
      .send({ first_name: "Updated", last_name: "Tenant", role: "manager" }),
    200,
  );
  assert.equal(
    expect(await api.get("/api/me").set(tenantAuth), 200).role,
    "tenant",
  );
  expect(
    await api
      .patch("/api/me/password")
      .set(tenantAuth)
      .send({ current_password: "wrong", new_password: "another-password" }),
    401,
  );
  expect(
    await api
      .patch("/api/me/password")
      .set(tenantAuth)
      .send({ current_password: password, new_password: "another-password" }),
    200,
  );
  expect(
    await api.post("/api/login").send({ email: tenantData.email, password }),
    401,
  );
  expect(
    await api
      .post("/api/login")
      .send({ email: tenantData.email, password: "another-password" }),
    200,
  );
  console.log(
    `Passed ${checks} API workflow checks against an isolated PostgreSQL schema.`,
  );
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  if (pool) await pool.end();
  if (created) await admin.query(`DROP SCHEMA ${schema} CASCADE`);
  await admin.end();
  console.log(
    "Temporary test schema removed. Existing application data was not changed.",
  );
}
