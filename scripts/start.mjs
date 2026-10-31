import { existsSync } from "node:fs";
if (!existsSync(new URL("../frontend/dist/index.html", import.meta.url)))
  throw new Error("Run npm run build before npm start.");
process.env.NODE_ENV = "production";
process.env.SERVE_FRONTEND = "true";
await import("../backend/server.js");
