import test from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import { databaseConfig } from "../database-config.js";

const pooled =
  "postgresql://app:fake-password@ep-example-pooler.us-east-2.aws.neon.tech/app?sslmode=verify-full&channel_binding=require";
const direct = pooled.replace("-pooler.", ".");

test("Neon DATABASE_URL takes precedence over local DB settings and enables verified TLS", () => {
  const config = databaseConfig({
    DATABASE_URL: pooled,
    DB_HOST: "localhost",
    DB_NAME: "local",
  });
  assert.equal(config.connectionString, pooled);
  assert.equal(config.host, undefined);
  assert.equal(config.enableChannelBinding, true);
  const client = new pg.Client(config);
  assert.equal(
    client.connectionParameters.host,
    "ep-example-pooler.us-east-2.aws.neon.tech",
  );
  assert.ok(client.connectionParameters.ssl);
  assert.notEqual(client.connectionParameters.ssl.rejectUnauthorized, false);
});
test("Administrative scripts can use the direct URL without changing the app pool URL", () => {
  const env = { DATABASE_URL: pooled, DIRECT_DATABASE_URL: direct };
  assert.equal(databaseConfig(env).connectionString, pooled);
  assert.equal(databaseConfig(env, { direct: true }).connectionString, direct);
});
test("Local PostgreSQL settings remain supported", () => {
  const env = {
    DB_HOST: "localhost",
    DB_PORT: "5432",
    DB_USER: "postgres",
    DB_PASSWORD: "local-test-password",
    DB_NAME: "maintenance",
  };
  assert.equal(databaseConfig(env).connectionString, undefined);
  assert.equal(databaseConfig(env).host, "localhost");
  assert.equal(databaseConfig(env).database, "maintenance");
});
test("Invalid connection URLs are rejected without exposing credentials", () => {
  assert.throws(
    () => databaseConfig({ DATABASE_URL: "not a URL with fake-secret" }),
    (error) =>
      !error.message.includes("fake-secret") &&
      error.message.includes("PostgreSQL"),
  );
  assert.throws(() => databaseConfig({ DATABASE_URL: "https://example.com" }));
});
test("Test schemas cannot inject database options", () => {
  assert.throws(() =>
    databaseConfig({ DB_SCHEMA: "public; DROP SCHEMA public" }),
  );
  assert.equal(
    databaseConfig({ DB_SCHEMA: "maintenance_test_123" }).options,
    "-c search_path=maintenance_test_123",
  );
});
