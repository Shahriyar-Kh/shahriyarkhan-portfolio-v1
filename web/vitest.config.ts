import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: [".next/**", "node_modules/**"],
    globals: false,
    // The default 5000ms is tight for userEvent-driven async tests
    // (inquiry-form.test.tsx) under full-suite parallel load - observed
    // flaking under CPU contention with no change to the test itself.
    // Raising this is slack for the runner, not a weakened assertion.
    testTimeout: 10000,
  },
  resolve: {
    alias: {
      "@": path.resolve(dirname, "src"),
    },
  },
});
