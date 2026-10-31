# Deploy to Vercel, Render, and Neon

Frontend: **https://maintenance-request-system-project.vercel.app**. The Render service has not been created yet.

Use this order: **Neon database → Render backend → update Vercel → Google settings**. Commit and push the prepared files to the repository connected to your hosting accounts before deploying.

## 1. Create and initialize Neon

1. Create a Neon project and database, preferably in a region near your Render service.
2. In Neon's **Connect** dialog, copy the connection string with **connection pooling enabled**. This is the runtime `DATABASE_URL` for Render; its hostname contains `-pooler`.
3. Also copy a **direct** connection string with pooling disabled for setup and administrative commands. Keep the SSL and channel-binding parameters in these URLs. Neon supports `sslmode=verify-full` for certificate verification.
4. Create a local **`backend/.env.neon`** file containing your direct connection URL:

   ```env
   DATABASE_URL=postgresql://YOUR_USER:YOUR_PASSWORD@YOUR_DIRECT_NEON_HOST/YOUR_DATABASE?sslmode=verify-full&channel_binding=require
   ```

   Use your actual connection string from Neon. This file is ignored by Git. Do not add the database URL to any `VITE_` variable.

5. From the repository root, initialize the schema and create a manager:

   ```bash
   node --env-file=backend/.env.neon backend/scripts/setup-db.js
   node --env-file=backend/.env.neon backend/scripts/create-manager.js
   ```

   These commands use the Neon URL supplied by `--env-file` instead of the local PostgreSQL settings in `backend/.env`. The second command prompts for the manager's details and hidden password.

Alternatively, run `backend/sql/schema.sql` in Neon's SQL Editor, wrapped in `BEGIN;` and `COMMIT;`, then use the manager command above. Setup creates tables, indexes, and categories. **It does not copy your local users, apartments, or requests to Neon.** A new Neon database starts with new application accounts unless you separately migrate your existing data.

The backend uses `DATABASE_URL` when present and falls back to `DB_HOST`, `DB_USER`, and the other local settings when it is absent. Administrative commands prefer `DIRECT_DATABASE_URL` if you set it.

[Neon Node.js guide](https://neon.com/docs/guides/node) · [Neon TLS support](https://github.com/neondatabase/website/blob/main/content/docs/security/security-overview.md)

## 2. Create the Render backend

In Render, choose **New → Web Service**, connect your Git repository, and enter:

| Setting           | Value               |
| ----------------- | ------------------- |
| Runtime           | Node                |
| Root Directory    | `backend`           |
| Build Command     | `npm ci --omit=dev` |
| Start Command     | `npm start`         |
| Health Check Path | `/api/health`       |
| Node version      | `24`                |

Set these environment variables in Render:

```env
NODE_ENV=production
NODE_VERSION=24
DATABASE_URL=YOUR_POOLED_NEON_CONNECTION_STRING
JWT_SECRET=YOUR_LONG_RANDOM_SECRET
FRONTEND_ORIGIN=https://maintenance-request-system-project.vercel.app
TRUST_PROXY=1
SERVE_FRONTEND=false
GOOGLE_CLIENT_ID=YOUR_GOOGLE_WEB_CLIENT_ID
```

`GOOGLE_CLIENT_ID` is optional if you are not using Google sign-in. Generate a separate production JWT secret with:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Let Render supply **`PORT`**; do not copy your local `PORT=5000` into Render. The server listens on `0.0.0.0` and reads Render's port. `SERVE_FRONTEND=false` makes this an API-only service; Vercel serves the frontend. `TRUST_PROXY=1` trusts the single proxy hop nearest the app so rate limiting can use the forwarded client address; revisit this setting if you add another proxy.

Click **Create Web Service**. Copy the public URL that Render assigns, such as `https://your-service.onrender.com`. Open:

```text
https://your-service.onrender.com/api/health
```

It should return `{"status":"ok"}`. The root URL returns a small API description; it does not display the React app.

You can instead create a **Blueprint** from the included root `render.yaml`. It defines the backend, health check, frontend origin, and generated JWT secret, and prompts for your Neon URL and Google client ID. The file selects Render's free service plan; change the plan if you need an always-on service. Schema setup remains a separate step before deployment.

[Render Express deployment](https://render.com/docs/deploy-node-express-app) · [Port binding](https://render.com/docs/web-services#port-binding) · [Blueprint reference](https://render.com/docs/blueprint-spec)

## 3. Connect your existing Vercel frontend

In the Vercel project settings:

| Setting          | Value                  |
| ---------------- | ---------------------- |
| Root Directory   | `frontend`             |
| Framework Preset | Vite                   |
| Node.js Version  | `24.x`                 |
| Install Command  | `npm ci --include=dev` |
| Build Command    | `npm run build`        |
| Output Directory | `dist`                 |

Set the production environment variables:

```env
VITE_API_BASE_URL=https://YOUR_RENDER_SERVICE.onrender.com/api
VITE_GOOGLE_CLIENT_ID=YOUR_GOOGLE_WEB_CLIENT_ID
```

Replace `YOUR_RENDER_SERVICE` with the URL from the previous step. **Keep `/api` at the end.** Do not put `DATABASE_URL`, `JWT_SECRET`, or a Google client secret in Vercel's frontend variables. Vite exposes `VITE_` values in the browser bundle.

Vercel builds now stop with a clear error if `VITE_API_BASE_URL` is missing, is not HTTPS, or does not end in `/api`. This check applies only on Vercel; local builds can continue using the same-origin `/api` default.

**Redeploy Vercel after saving these settings.** Environment changes do not update an already built frontend. The included `frontend/vercel.json` sends client-side routes to `index.html`, so refreshing `/tenant/requests`, `/login`, and other pages works.

For Vercel Preview deployments, either use a separate test backend or add the exact preview origin to Render's comma-separated `FRONTEND_ORIGIN` list. Production is currently configured for the one frontend URL above.

[Vercel Vite setup and SPA routing](https://vercel.com/docs/frameworks/frontend/vite) · [Vercel environment variables](https://vercel.com/docs/environment-variables)

### Local frontend deployment check

Run `npm run test:vercel` using Node 24. It installs and builds only the frontend in a temporary directory without backend files or `.env` files. It verifies the production API URL, static assets, absence of private settings in the bundle, and errors for invalid API URLs. It checks the SPA routing configuration; live route refreshes still need verification after deploying to Vercel.

## 4. Update Google OAuth

In your Google Cloud **Web application** OAuth client, add this authorized JavaScript origin:

```text
https://maintenance-request-system-project.vercel.app
```

Keep `http://localhost:5173` if you still use Google sign-in locally. Set the same client ID in Render's `GOOGLE_CLIENT_ID` and Vercel's `VITE_GOOGLE_CLIENT_ID`.

This app uses a JavaScript credential callback, so it does not need a new backend redirect URI. If the Google project is in testing mode, include the intended Google accounts as test users as required by your Google OAuth configuration.

[Google Identity setup](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid)

## Local Render readiness check

With Node 24 and your local database available, run `npm run test:render` from the repository root. It performs a clean backend-only production install in a temporary directory and checks startup, database health, Vercel CORS, protected routes, and shutdown. It does not deploy the service or verify a Neon connection unless you have configured one.

## 5. Verify the deployment

1. Open the Render `/api/health` endpoint and confirm the database is reachable.
2. Open the Vercel frontend and sign in with the manager account created in Neon.
3. Create a maintenance worker, register a tenant, and assign their apartment.
4. Submit a tenant request, assign it as manager, then start and complete it as the assigned worker.
5. Check the tenant's status history and comments.
6. Refresh a nested URL such as `/manager/apartments` to verify the SPA rewrite.
7. Check Google signup and login using an allowed account if Google sign-in is enabled.

Render's free services sleep after 15 minutes of inactivity and can take about a minute to wake. The frontend allows 60 seconds per API request; if an idle service still times out, wait for `/api/health` to respond and retry. An always-on plan avoids this cold start. [Render free-service behavior](https://render.com/docs/free#spinning-down-on-idle)

## Common errors

| Symptom                                 | Check                                                                                                                    |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| API calls go to Vercel or localhost     | Set `VITE_API_BASE_URL` to the Render URL ending in `/api`, then redeploy Vercel.                                        |
| Browser CORS error                      | Render `FRONTEND_ORIGIN` must exactly match the frontend origin, including `https://`, without a trailing slash or path. |
| Refreshing a dashboard returns 404      | Root Directory must be `frontend`, so Vercel reads `frontend/vercel.json`.                                               |
| Database connection or SSL failure      | Use the Neon connection URL with SSL parameters and the correct database/role/password.                                  |
| `relation "users" does not exist`       | Run the schema setup against Neon, rather than your local PostgreSQL database.                                           |
| Local credentials cannot sign in online | Local records were not copied; create a manager in Neon or migrate the local database separately.                        |
| Google `origin_mismatch`                | Add the exact Vercel origin to the Google Web OAuth client and use matching client IDs on both hosts.                    |
