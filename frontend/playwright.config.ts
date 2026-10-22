import { defineConfig, devices } from "@playwright/test";

// Real browser against a real API and database (orderops_e2e, recreated each run) on ports 3001/8001,
// so it can run next to `npm run dev`. The production build it makes replaces .next/.
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1, // the tests share one database
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  expect: { timeout: 15_000 }, // the first request after start compiles and hashes passwords
  use: { baseURL: "http://127.0.0.1:3001", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    { command: "node tests/e2e/backend.mjs", url: "http://127.0.0.1:8001/health", timeout: 120_000 },
    {
      command: "npm run build && npx next start -H 127.0.0.1 -p 3001",
      env: { BACKEND_URL: "http://127.0.0.1:8001" },
      url: "http://127.0.0.1:3001/login",
      timeout: 300_000,
    },
  ],
});
