import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

function cspPlugin() {
  return {
    name: "oh-my-channel-csp",
    transformIndexHtml(html, context) {
      const dev = Boolean(context.server);
      const csp = dev
        ? "default-src 'self'; img-src 'self' file: data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self' ws://localhost:* http://localhost:*"
        : "default-src 'self'; img-src 'self' file: data:; style-src 'self'; script-src 'self'; connect-src 'self'";
      return html.replace(
        "<!-- CSP -->",
        `<meta http-equiv="Content-Security-Policy" content="${csp}" />`
      );
    },
  };
}

export default defineConfig({
  root: path.join(rootDir, "renderer"),
  base: "./",
  publicDir: path.join(rootDir, "assets"),
  plugins: [react(), cspPlugin()],
  build: {
    outDir: path.join(rootDir, "dist-renderer"),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
