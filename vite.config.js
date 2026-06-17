import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Hook is a single-page creative instrument. Nothing exotic here —
// React fast-refresh in dev, a normal static build for the demo deploy.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
  },
  build: {
    target: "es2020",
    sourcemap: false,
  },
});
