CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY, first_name VARCHAR(200) NOT NULL, last_name VARCHAR(200) NOT NULL,
  email VARCHAR(200) NOT NULL, password VARCHAR(1000), google_sub TEXT UNIQUE,
  role VARCHAR(200) NOT NULL DEFAULT 'tenant' CHECK (role IN ('tenant', 'maintenance', 'manager')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_sub TEXT;
ALTER TABLE users ALTER COLUMN password DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_unique ON users (LOWER(email));
CREATE UNIQUE INDEX IF NOT EXISTS users_google_sub_unique ON users (google_sub);
CREATE TABLE IF NOT EXISTS apartments (
  id SERIAL PRIMARY KEY, unit_number VARCHAR(100) NOT NULL, building VARCHAR(200) NOT NULL,
  floor VARCHAR(100) NOT NULL, tenant_id INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS apartments_unit_unique ON apartments (LOWER(building), LOWER(unit_number));
CREATE UNIQUE INDEX IF NOT EXISTS apartments_tenant_unique ON apartments (tenant_id);
CREATE TABLE IF NOT EXISTS categories (id SERIAL PRIMARY KEY, name VARCHAR(200) NOT NULL);
CREATE TABLE IF NOT EXISTS maintenance_requests (
  id SERIAL PRIMARY KEY, tenant_id INTEGER NOT NULL REFERENCES users(id),
  apartment_id INTEGER NOT NULL REFERENCES apartments(id), category_id INTEGER NOT NULL REFERENCES categories(id),
  title VARCHAR(500) NOT NULL, description VARCHAR(5000) NOT NULL,
  priority VARCHAR(100) NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
  status VARCHAR(100) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed')),
  assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS requests_tenant_idx ON maintenance_requests (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS requests_worker_idx ON maintenance_requests (assigned_to, created_at DESC);
CREATE TABLE IF NOT EXISTS comments (
  id SERIAL PRIMARY KEY, request_id INTEGER NOT NULL REFERENCES maintenance_requests(id),
  user_id INTEGER NOT NULL REFERENCES users(id), message VARCHAR(5000) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS comments_request_idx ON comments (request_id);
CREATE TABLE IF NOT EXISTS status_history (
  id SERIAL PRIMARY KEY, request_id INTEGER NOT NULL REFERENCES maintenance_requests(id) ON DELETE CASCADE,
  changed_by INTEGER NOT NULL REFERENCES users(id), old_status VARCHAR(30), new_status VARCHAR(30) NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS history_request_idx ON status_history (request_id);
INSERT INTO categories (name)
SELECT name FROM (VALUES ('Plumbing'), ('Electrical'), ('HVAC'), ('Appliances'), ('Doors & Locks'), ('General')) AS defaults(name)
WHERE NOT EXISTS (SELECT 1 FROM categories c WHERE LOWER(c.name) = LOWER(defaults.name));
