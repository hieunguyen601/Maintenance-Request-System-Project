import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import bcrypt from "bcrypt";
import pg from "pg";
import { databaseConfig } from "../database-config.js";
const pool = new pg.Pool(databaseConfig(process.env, { direct: true }));
let muted = false;
const output = new Writable({
  write(chunk, encoding, callback) {
    if (!muted) process.stdout.write(chunk, encoding);
    callback();
  },
});
const prompt = createInterface({
  input: process.stdin,
  output,
  terminal: Boolean(process.stdin.isTTY),
});
try {
  const first = (await prompt.question("First name: ")).trim();
  const last = (await prompt.question("Last name: ")).trim();
  const email = (await prompt.question("Email: ")).trim().toLowerCase();
  process.stdout.write("Password (at least 8 characters, hidden): ");
  muted = true;
  const password = await prompt.question("");
  muted = false;
  process.stdout.write("\n");
  if (
    !first ||
    !last ||
    first.length > 200 ||
    last.length > 200 ||
    email.length > 200 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    password.length < 8 ||
    Buffer.byteLength(password) > 72
  )
    throw new Error(
      "Enter valid names, email, and a password of at least 8 characters and at most 72 bytes.",
    );
  await pool.query(
    "INSERT INTO users (first_name, last_name, email, password, role) VALUES ($1,$2,$3,$4,'manager')",
    [first, last, email, await bcrypt.hash(password, 10)],
  );
  console.log("Manager account created. You can now sign in.");
} catch (error) {
  console.error(
    "Could not create manager:",
    error.code === "23505"
      ? "An account with this email already exists."
      : error.message,
  );
  process.exitCode = 1;
} finally {
  prompt.close();
  await pool.end();
}
