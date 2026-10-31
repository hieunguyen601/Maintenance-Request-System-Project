# Maintenance Services Management System

A React + TypeScript frontend and Express + PostgreSQL backend for managing apartment maintenance from submission to completion.

## Features

- Residents: password or Google signup/login, apartment details, maintenance requests, searchable status tracking, comments, profile editing, and password changes.
- Property managers: live dashboard, all requests, worker assignment, apartment/tenant assignment, and creation of tenant, maintenance, and manager accounts.
- Maintenance staff: assigned work orders, start/complete actions, request details, and conversations.
- Database-backed dashboards, status history, input validation, JWT sessions, role and ownership checks, and server-side Google credential verification.
- Responsive layouts, loading/error/empty states, keyboard-accessible request dialogs, and optional Google sign-in.

Public registration creates **tenant** accounts. Managers create staff accounts. Each tenant has one apartment; a manager must assign it before the tenant can submit a request. A work order moves through **pending → assigned → in progress → completed**. Only its assigned worker can start or complete it. Completed work orders cannot be reassigned or reopened. Managers may reassign unfinished work.

## Local setup

Requirements: Node.js 22.12+ (or a newer supported LTS), npm, and PostgreSQL. Create a PostgreSQL database first, for example `createdb maintenance_services`, using your PostgreSQL account.

From the project root:

```bash
npm --prefix backend ci
npm --prefix frontend ci
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

If `.env` files already exist, keep them and add only missing settings. Edit `backend/.env` to match your PostgreSQL database. Set `JWT_SECRET` to a long random value; generate one with:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Then initialize the database and create your initial manager account:

```bash
npm run db:setup
npm run manager:create
```

The manager command prompts for names, email, and a hidden password. It creates a new account; it does not overwrite an existing account. If a manager account already exists, use that account instead.

Database setup is transactional and can be repeated. It creates missing tables, adds indexes, and adds default categories while preserving existing records. It will stop and roll back if existing duplicate emails, units, or tenant assignments prevent uniqueness; resolve those records before retrying.

Start both services:

```bash
npm run dev
```

Open **http://localhost:5173**. The backend defaults to **http://localhost:5000**; Vite proxies `/api` to the `PORT` in `backend/.env`. You can also run `npm run dev` separately inside `backend/` and `frontend/`. Stop earlier dev servers before starting a second copy. A port conflict reports `EADDRINUSE`; stop the existing process or change `PORT` and restart Vite.

### First workflow

1. Sign in as a manager. Use **Accounts & Team** to create maintenance staff.
2. Register a tenant, or create one through the manager account.
3. Use **Apartments** to add a unit and assign the tenant.
4. Sign in as the tenant and create a maintenance request.
5. Assign the request to a worker from the manager's request tracker.
6. Sign in as that worker, select **Start work**, add an update, and select **Complete**.
7. The tenant sees the updated status, comments, and history in request details.

### Google sign-in

Create a Web OAuth client in Google Cloud and configure the authorized JavaScript origins for your frontend (locally `http://localhost:5173`). Set the **same client ID** in:

```env
# backend/.env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com

# frontend/.env
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

Restart both services after changing environment variables. Google credentials are verified by the backend before any account is created. New Google accounts are tenants; an existing Google account signs in to its current role. A password account with the same email is not automatically linked; sign in using its password. Google-only accounts do not have a local password. No Google client secret belongs in frontend environment variables.

If the frontend client ID is unset, Google buttons are hidden and password authentication remains available. A real Google sign-in requires the configured OAuth client and an interactive browser.

### Environment settings

| Variable                                                  | Location | Purpose                                                                                     |
| --------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------- |
| `PORT`                                                    | backend  | API/production port, default `5000`                                                         |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | backend  | PostgreSQL connection                                                                       |
| `JWT_SECRET`                                              | backend  | Required session signing secret                                                             |
| `FRONTEND_ORIGIN`                                         | backend  | Comma-separated allowed browser origins; default `http://localhost:5173`                    |
| `GOOGLE_CLIENT_ID`                                        | backend  | Google ID-token audience, optional                                                          |
| `VITE_GOOGLE_CLIENT_ID`                                   | frontend | Google button client ID, optional                                                           |
| `VITE_API_BASE_URL`                                       | frontend | Optional API URL ending in `/api`; omit for the development proxy or same-origin production |

Frontend `VITE_` settings are public and embedded at build time. Keep `.env` files private and out of Git. Real deployments should supply environment settings through the host, use HTTPS and a persistent PostgreSQL database, and restrict `FRONTEND_ORIGIN` to the deployed frontend.

## Production build

```bash
npm run build
npm start
```

The Express server serves `frontend/dist` and `/api` from the same origin, including client-side route refreshes. Open `http://localhost:5000` (or your configured port). A reverse proxy can terminate HTTPS. This repository has not been deployed to an external host.

## Verification

```bash
npm test
npm run test:integration
npm run build
npm run test:production
```

The production smoke check uses an available temporary port and verifies the built frontend, client-side routes, protected APIs, and database health, then stops its server.

Unit/API tests mock external Google and database calls. Integration checks use the configured PostgreSQL database to create a uniquely named temporary schema, exercise the full workflow, and remove that schema in a `finally` block. The database user needs schema-creation permission. Existing application records are not modified. Google signature verification is covered with mocked responses; live OAuth still requires browser verification.

`GET /api/health` checks PostgreSQL connectivity. Protected endpoints require `Authorization: Bearer <token>`.

## Project structure

- `backend/app.js`: API routes, authentication, validation, and workflow rules.
- `backend/sql/schema.sql`: repeatable schema/index/category setup.
- `backend/scripts/`: database setup, initial manager creation, and isolated integration checks.
- `frontend/src/assets/components/`: shared request tracker, request conversation/history dialog, and navigation.
- `frontend/src/assets/pages/`: authentication, apartment/account/profile forms, and role dashboards.
- `scripts/`: combined local development and production startup.

Nodemon uses an explicit `minimatch` override to the fixed 11.x release; its development restart behavior is checked when updating this dependency.

Author: Henry Nguyen.
