import { writeFileSync } from "node:fs"
import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// The build is embedded in the Go binary, so it is written into the backend.
const outDir = path.resolve(import.meta.dirname, "../service/internal/webui/dist")
const backend = process.env.FIRE_BACKEND ?? "http://127.0.0.1:8080"

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      // Keeps the directory in Git so a fresh checkout still compiles.
      name: "keep-dist-dir",
      closeBundle() {
        writeFileSync(path.join(outDir, ".gitkeep"), "")
      },
    },
  ],
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "./src") },
  },
  build: { outDir, emptyOutDir: true },
  server: {
    proxy: {
      "/api": {
        target: backend,
        // The dev server is a different origin; present requests as same-origin.
        configure: (proxy) => {
          proxy.on("proxyReq", (request) => request.removeHeader("origin"))
        },
      },
    },
  },
})
