import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  root: "renderer",
  base: "./",
  build: {
    outDir: "../dist/renderer",
    emptyOutDir: true,
    target: "es2022",
    sourcemap: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "renderer"),
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});