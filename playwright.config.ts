import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: process.env.CI ? "http://localhost:3002" : "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    // Database-specific projects for multi-DB testing
    {
      name: "postgres",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mysql",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "sqlite",
      use: { ...devices["Desktop Chrome"] },
    },
    // Default project for general tests (uses PostgreSQL)
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: process.env.CI ? "PORT=3002 pnpm dev" : "pnpm dev",
    url: process.env.CI ? "http://localhost:3002" : "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
