import express from "express";
import cors from "cors";
import pool from "./db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { fileURLToPath } from "node:url";

const app = express();
app.disable("x-powered-by");
app.use(
  cors({
    origin: (process.env.FRONTEND_ORIGIN || "http://localhost:5173")
      .split(",")
      .map((value) => value.trim()),
  }),
);
app.use(express.json({ limit: "32kb" }));
app.use((req, res, next) => {
  req.body ??= {};
  if (typeof req.body !== "object" || Array.isArray(req.body)) {
    return res.status(400).json({ message: "Send a JSON object." });
  }
  next();
});
const googleClient = new OAuth2Client();
const roles = ["tenant", "maintenance", "manager"];
const safeUserColumns = "id, first_name, last_name, email, role, created_at";
const fail = (status, message) => Object.assign(new Error(message), { status });
const id = (value) => {
  if (!["number", "string"].includes(typeof value))
    throw fail(400, "A valid ID is required.");
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1)
    throw fail(400, "A valid ID is required.");
  return number;
};
const text = (value, label, max = 200) => {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max)
    throw fail(
      400,
      `${label} is required and must be at most ${max} characters.`,
    );
  return value.trim();
};
const emailAddress = (value) => {
  const email = text(value, "Email").toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw fail(400, "Enter a valid email address.");
  return email;
};
const passwordValue = (value) => {
  if (
    typeof value !== "string" ||
    value.length < 8 ||
    Buffer.byteLength(value) > 72
  )
    throw fail(
      400,
      "Password must be at least 8 characters and at most 72 bytes.",
    );
  return value;
};
function session(user) {
  if (!process.env.JWT_SECRET)
    throw fail(503, "Authentication is not configured.");
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "1d", algorithm: "HS256" },
  );
}
const attempts = new Map();
const authLimit = (req, res, next) => {
  const now = Date.now();
  for (const [key, value] of attempts)
    if (value.until <= now) attempts.delete(key);
  const key = req.ip;
  const entry = attempts.get(key) || { count: 0, until: now + 15 * 60 * 1000 };
  attempts.set(key, entry);
  if (++entry.count > 60) {
    res.set("Retry-After", String(Math.ceil((entry.until - now) / 1000)));
    return res
      .status(429)
      .json({ message: "Too many sign-in attempts. Please try again later." });
  }
  next();
};
const authenticate = async (req, res, next) => {
  const match = /^Bearer (\S+)$/.exec(req.headers.authorization || "");
  if (!match) throw fail(401, "Please sign in to continue.");
  let decoded;
  try {
    decoded = jwt.verify(match[1], process.env.JWT_SECRET, {
      algorithms: ["HS256"],
    });
  } catch {
    throw fail(401, "Your session has expired. Please sign in again.");
  }
  const result = await pool.query(
    `SELECT ${safeUserColumns}, (password IS NOT NULL) AS has_password FROM users WHERE id = $1`,
    [decoded.id],
  );
  if (!result.rows[0]) throw fail(401, "Please sign in again.");
  req.user = result.rows[0];
  next();
};
const allow =
  (...allowed) =>
  (req, res, next) => {
    if (!allowed.includes(req.user.role))
      throw fail(403, "You do not have access to this action.");
    next();
  };
async function transaction(work) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
const requestSelect = `SELECT mr.*, c.name AS category, a.unit_number, a.building,
  t.first_name AS tenant_first_name, t.last_name AS tenant_last_name,
  w.first_name AS worker_first_name, w.last_name AS worker_last_name
  FROM maintenance_requests mr JOIN categories c ON c.id = mr.category_id
  JOIN apartments a ON a.id = mr.apartment_id JOIN users t ON t.id = mr.tenant_id
  LEFT JOIN users w ON w.id = mr.assigned_to`;
async function accessibleRequest(requestId, user) {
  const result = await pool.query(
    `${requestSelect} WHERE mr.id = $1 AND
    ($2 = 'manager' OR mr.tenant_id = $3 OR (mr.assigned_to = $3 AND $2 = 'maintenance'))`,
    [id(requestId), user.role, user.id],
  );
  if (!result.rows[0]) throw fail(404, "Request not found.");
  return result.rows[0];
}

app.get("/api/health", async (req, res) => {
  await pool.query("SELECT 1");
  res.json({ status: "ok" });
});
app.post("/api/user", authLimit, async (req, res) => {
  if (req.body.role && req.body.role !== "tenant")
    throw fail(403, "Staff accounts must be created by a manager.");
  const first = text(
    req.body.first_name || req.body["first-name"],
    "First name",
  );
  const last = text(req.body.last_name || req.body["last-name"], "Last name");
  const email = emailAddress(req.body.email);
  const hash = await bcrypt.hash(passwordValue(req.body.password), 10);
  const result = await pool.query(
    `INSERT INTO users (first_name, last_name, email, password, role)
    VALUES ($1, $2, $3, $4, 'tenant') RETURNING ${safeUserColumns}`,
    [first, last, email, hash],
  );
  res.status(201).json({
    message: "Account created. Please sign in.",
    data: result.rows[0],
  });
});
app.post("/api/login", authLimit, async (req, res) => {
  const email = emailAddress(req.body.email);
  if (typeof req.body.password !== "string" || !req.body.password)
    throw fail(400, "Email and password are required.");
  const result = await pool.query(
    "SELECT * FROM users WHERE LOWER(email) = $1",
    [email],
  );
  const user = result.rows[0];
  if (
    !user?.password ||
    !(await bcrypt.compare(req.body.password, user.password))
  )
    throw fail(401, "Invalid email or password");
  delete user.password;
  delete user.google_sub;
  res.json({ message: "Login successful", token: session(user), user });
});
app.post("/api/auth/google", authLimit, async (req, res) => {
  const { credential } = req.body;
  if (typeof credential !== "string" || !credential)
    throw fail(400, "Google credential is required");
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.JWT_SECRET)
    throw fail(503, "Google authentication is not configured.");
  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch {
    throw fail(401, "Invalid Google credential");
  }
  if (!payload?.sub || !payload.email || payload.email_verified !== true)
    throw fail(401, "Google account could not be verified");
  const existing = await pool.query(
    `SELECT ${safeUserColumns} FROM users WHERE google_sub = $1`,
    [payload.sub],
  );
  let user = existing.rows[0];
  if (!user) {
    const email = emailAddress(payload.email);
    const emailMatch = await pool.query(
      "SELECT id FROM users WHERE LOWER(email) = LOWER($1)",
      [email],
    );
    if (emailMatch.rows.length)
      throw fail(
        409,
        "An account with this email already exists. Please sign in with your password.",
      );
    const result = await pool.query(
      `INSERT INTO users (first_name, last_name, email, google_sub, role)
      VALUES ($1, $2, $3, $4, 'tenant') RETURNING ${safeUserColumns}`,
      [
        payload.given_name || "Google",
        payload.family_name || "User",
        email,
        payload.sub,
      ],
    );
    user = result.rows[0];
  }
  res.json({ message: "Google login successful", token: session(user), user });
});

app.use("/api", authenticate);
app.get("/api/me", (req, res) => res.json(req.user));
app.patch("/api/me", async (req, res) => {
  const first = text(req.body.first_name, "First name");
  const last = text(req.body.last_name, "Last name");
  const result = await pool.query(
    `UPDATE users SET first_name = $1, last_name = $2 WHERE id = $3 RETURNING ${safeUserColumns}, (password IS NOT NULL) AS has_password`,
    [first, last, req.user.id],
  );
  res.json(result.rows[0]);
});
app.patch("/api/me/password", async (req, res) => {
  const result = await pool.query("SELECT password FROM users WHERE id = $1", [
    req.user.id,
  ]);
  const hash = result.rows[0]?.password;
  if (!hash) throw fail(400, "This account uses Google sign-in.");
  if (
    typeof req.body.current_password !== "string" ||
    !(await bcrypt.compare(req.body.current_password, hash))
  )
    throw fail(401, "Current password is incorrect.");
  const password = await bcrypt.hash(passwordValue(req.body.new_password), 10);
  await pool.query("UPDATE users SET password = $1 WHERE id = $2", [
    password,
    req.user.id,
  ]);
  res.json({ message: "Password updated." });
});
app.get("/api/category", async (req, res) =>
  res.json((await pool.query("SELECT * FROM categories ORDER BY name")).rows),
);
app.get("/api/apartment", allow("tenant"), async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM apartments WHERE tenant_id = $1 ORDER BY id",
    [req.user.id],
  );
  res.json(result.rows[0] || null);
});
app.get("/api/requests", async (req, res) => {
  const condition =
    req.user.role === "manager"
      ? "TRUE"
      : req.user.role === "maintenance"
        ? "mr.assigned_to = $1"
        : "mr.tenant_id = $1";
  res.json(
    (
      await pool.query(
        `${requestSelect} WHERE ${condition} ORDER BY mr.created_at DESC, mr.id DESC`,
        req.user.role === "manager" ? [] : [req.user.id],
      )
    ).rows,
  );
});
app.get("/api/requests/:id", async (req, res) => {
  const request = await accessibleRequest(req.params.id, req.user);
  const comments = await pool.query(
    `SELECT c.id, c.message, c.created_at, u.first_name, u.last_name, u.role
    FROM comments c JOIN users u ON u.id = c.user_id WHERE c.request_id = $1 ORDER BY c.created_at, c.id`,
    [request.id],
  );
  const history = await pool.query(
    `SELECT h.*, u.first_name, u.last_name FROM status_history h
    JOIN users u ON u.id = h.changed_by WHERE h.request_id = $1 ORDER BY h.changed_at, h.id`,
    [request.id],
  );
  res.json({ ...request, comments: comments.rows, history: history.rows });
});
app.post("/api/request", allow("tenant"), async (req, res) => {
  const title = text(req.body.title, "Title", 500);
  const description = text(req.body.description, "Description", 5000);
  const categoryId = id(req.body.category_id);
  const priority = req.body.priority || "medium";
  if (!["low", "medium", "high"].includes(priority))
    throw fail(400, "Choose a valid priority.");
  const apartment = await pool.query(
    "SELECT id FROM apartments WHERE tenant_id = $1 ORDER BY id LIMIT 1",
    [req.user.id],
  );
  if (!apartment.rows[0])
    throw fail(
      409,
      "Ask your property manager to assign your apartment before submitting a request.",
    );
  const category = await pool.query("SELECT id FROM categories WHERE id = $1", [
    categoryId,
  ]);
  if (!category.rows[0]) throw fail(400, "Choose an existing category.");
  const created = await transaction(async (client) => {
    const result = await client.query(
      `INSERT INTO maintenance_requests (tenant_id, apartment_id, category_id, title, description, priority, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'pending') RETURNING *`,
      [
        req.user.id,
        apartment.rows[0].id,
        categoryId,
        title,
        description,
        priority,
      ],
    );
    const request = result.rows[0];
    await client.query(
      "INSERT INTO status_history (request_id, changed_by, new_status) VALUES ($1, $2, 'pending')",
      [request.id, req.user.id],
    );
    return request;
  });
  res.status(201).json({ message: "Request submitted.", data: created });
});
app.post("/api/comment", async (req, res) => {
  const request = await accessibleRequest(req.body.request_id, req.user);
  const message = text(req.body.message, "Comment", 5000);
  const result = await pool.query(
    "INSERT INTO comments (request_id, user_id, message) VALUES ($1, $2, $3) RETURNING *",
    [request.id, req.user.id, message],
  );
  res.status(201).json(result.rows[0]);
});
app.get("/api/manager/requests", allow("manager"), async (req, res) =>
  res.json(
    (
      await pool.query(
        `${requestSelect} ORDER BY mr.created_at DESC, mr.id DESC`,
      )
    ).rows,
  ),
);
app.get("/api/manager/workers", allow("manager"), async (req, res) =>
  res.json(
    (
      await pool.query(
        `SELECT ${safeUserColumns} FROM users WHERE role = 'maintenance' ORDER BY first_name, last_name`,
      )
    ).rows,
  ),
);
app.get("/api/manager/users", allow("manager"), async (req, res) =>
  res.json(
    (
      await pool.query(
        `SELECT ${safeUserColumns} FROM users ORDER BY first_name, last_name`,
      )
    ).rows,
  ),
);
app.post("/api/manager/users", allow("manager"), async (req, res) => {
  const first = text(req.body.first_name, "First name");
  const last = text(req.body.last_name, "Last name");
  const email = emailAddress(req.body.email);
  const role = req.body.role;
  if (!roles.includes(role)) throw fail(400, "Choose a valid role.");
  const hash = await bcrypt.hash(passwordValue(req.body.password), 10);
  const result = await pool.query(
    `INSERT INTO users (first_name, last_name, email, password, role) VALUES ($1, $2, $3, $4, $5) RETURNING ${safeUserColumns}`,
    [first, last, email, hash, role],
  );
  res.status(201).json(result.rows[0]);
});
app.get("/api/manager/apartments", allow("manager"), async (req, res) => {
  res.json(
    (
      await pool.query(
        `SELECT a.*, u.first_name, u.last_name, u.email FROM apartments a JOIN users u ON u.id = a.tenant_id ORDER BY a.building, a.unit_number`,
      )
    ).rows,
  );
});
const apartmentValues = async (body) => {
  const tenantId = id(body.tenant_id);
  const user = await pool.query(
    "SELECT id FROM users WHERE id = $1 AND role = 'tenant'",
    [tenantId],
  );
  if (!user.rows[0]) throw fail(400, "Select an existing tenant.");
  return [
    text(body.unit_number, "Unit number", 100),
    text(body.building, "Building"),
    text(body.floor, "Floor", 100),
    tenantId,
  ];
};
app.post("/api/apartment", allow("manager"), async (req, res) => {
  const values = await apartmentValues(req.body);
  const result = await pool.query(
    "INSERT INTO apartments (unit_number, building, floor, tenant_id) VALUES ($1, $2, $3, $4) RETURNING *",
    values,
  );
  res.status(201).json(result.rows[0]);
});
app.patch("/api/manager/apartments/:id", allow("manager"), async (req, res) => {
  const values = await apartmentValues(req.body);
  const result = await pool.query(
    "UPDATE apartments SET unit_number = $1, building = $2, floor = $3, tenant_id = $4 WHERE id = $5 RETURNING *",
    [...values, id(req.params.id)],
  );
  if (!result.rows[0]) throw fail(404, "Apartment not found.");
  res.json(result.rows[0]);
});
app.patch(
  "/api/manager/requests/:id/assign",
  allow("manager"),
  async (req, res) => {
    const requestId = id(req.params.id);
    const workerId =
      req.body.assigned_to === null ? null : id(req.body.assigned_to);
    const request = await transaction(async (client) => {
      const current = (
        await client.query(
          "SELECT * FROM maintenance_requests WHERE id = $1 FOR UPDATE",
          [requestId],
        )
      ).rows[0];
      if (!current) throw fail(404, "Request not found.");
      if (current.status === "completed")
        throw fail(409, "Completed requests cannot be reassigned.");
      if (workerId) {
        const worker = await client.query(
          "SELECT id FROM users WHERE id = $1 AND role = 'maintenance'",
          [workerId],
        );
        if (!worker.rows[0])
          throw fail(400, "Select a maintenance staff member.");
      }
      if (current.assigned_to === workerId) return current;
      const status = workerId ? "assigned" : "pending";
      const updated = (
        await client.query(
          "UPDATE maintenance_requests SET assigned_to = $1, status = $2, updated_at = NOW(), completed_at = NULL WHERE id = $3 RETURNING *",
          [workerId, status, requestId],
        )
      ).rows[0];
      await client.query(
        "INSERT INTO status_history (request_id, changed_by, old_status, new_status) VALUES ($1, $2, $3, $4)",
        [requestId, req.user.id, current.status, status],
      );
      return updated;
    });
    res.json({ message: "Assignment updated.", data: request });
  },
);
app.get("/api/maintenance/assigned", allow("maintenance"), async (req, res) =>
  res.json(
    (
      await pool.query(
        `${requestSelect} WHERE mr.assigned_to = $1 ORDER BY mr.created_at DESC, mr.id DESC`,
        [req.user.id],
      )
    ).rows,
  ),
);
app.patch(
  "/api/maintenance/requests/:id/status",
  allow("maintenance"),
  async (req, res) => {
    const requestId = id(req.params.id);
    const status = req.body.status;
    if (!["in_progress", "completed"].includes(status))
      throw fail(400, "Choose a valid status.");
    const request = await transaction(async (client) => {
      const current = (
        await client.query(
          "SELECT * FROM maintenance_requests WHERE id = $1 AND assigned_to = $2 FOR UPDATE",
          [requestId, req.user.id],
        )
      ).rows[0];
      if (!current) throw fail(404, "Assigned request not found.");
      if (current.status === status) return current;
      if (
        current.status === "completed" ||
        (status === "completed" && current.status !== "in_progress")
      )
        throw fail(
          409,
          "Start the request before completing it. Completed requests cannot be reopened.",
        );
      const updated = (
        await client.query(
          `UPDATE maintenance_requests SET status = $1::text, updated_at = NOW(),
      completed_at = CASE WHEN $1::text = 'completed' THEN NOW() ELSE NULL END WHERE id = $2 RETURNING *`,
          [status, requestId],
        )
      ).rows[0];
      await client.query(
        "INSERT INTO status_history (request_id, changed_by, old_status, new_status) VALUES ($1, $2, $3, $4)",
        [requestId, req.user.id, current.status, status],
      );
      return updated;
    });
    res.json({ message: "Status updated.", request });
  },
);
if (process.env.NODE_ENV === "production") {
  const directory = fileURLToPath(
    new URL("../frontend/dist/", import.meta.url),
  );
  app.use(express.static(directory));
  app.get(/^(?!\/api(?:\/|$)).*/, (req, res) =>
    res.sendFile(`${directory}/index.html`),
  );
}
app.use((req, res) => res.status(404).json({ message: "Endpoint not found." }));
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.code === "23505")
    return res.status(409).json({
      message: "This email, apartment, or tenant assignment already exists.",
    });
  if (["23503", "23514", "22001", "22P02"].includes(error.code))
    return res
      .status(400)
      .json({ message: "Invalid data. Check your selections and try again." });
  const status = error.status || 500;
  if (status >= 500) console.error("API error:", error.message);
  res.status(status).json({
    message:
      status >= 500 && !error.status
        ? "The server could not complete your request. Please try again."
        : error.message,
  });
});
export default app;
