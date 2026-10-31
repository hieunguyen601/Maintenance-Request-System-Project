import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { fileURLToPath } from "node:url";

export default defineConfig(({ mode, command }) => {
  const frontendDirectory = fileURLToPath(new URL(".", import.meta.url));
  const frontendEnv = loadEnv(mode, frontendDirectory, "VITE_");
  if (command === "build" && process.env.VERCEL === "1") {
    const apiUrl = frontendEnv.VITE_API_BASE_URL?.trim();
    if (!apiUrl) {
      throw new Error(
        "Set VITE_API_BASE_URL in Vercel to your Render URL ending in /api, then redeploy.",
      );
    }
    try {
      const url = new URL(apiUrl);
      if (
        url.protocol !== "https:" ||
        url.pathname.replace(/\/+$/, "") !== "/api" ||
        url.search ||
        url.hash ||
        url.username ||
        url.password
      ) {
        throw new Error();
      }
    } catch {
      throw new Error(
        "VITE_API_BASE_URL must be an HTTPS API URL, for example https://your-service.onrender.com/api.",
      );
    }
  }
  // The development proxy is local only; a Vercel build needs no backend files.
  const backendEnv =
    command === "serve"
      ? loadEnv(
          mode,
          fileURLToPath(new URL("../backend", import.meta.url)),
          "PORT",
        )
      : {};
  return {
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        "/api": {
          target: `http://localhost:${backendEnv.PORT || 5000}`,
          changeOrigin: true,
        },
      },
    },
  };
});
