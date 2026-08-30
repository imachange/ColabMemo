import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  use: {
    baseURL: "http://127.0.0.1:4173",
  },
  webServer: {
    command: "npm run dev:test",
    url: "http://127.0.0.1:4173/api/health",
    reuseExistingServer: true,
    timeout: 120000,
  },
});
