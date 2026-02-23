import { test as baseTest, expect as baseExpect } from "@playwright/test";
import { test, expect } from "./fixtures/db-config";

/**
 * Database Connection E2E Tests
 *
 * Tests are split into two groups:
 * 1. Tests requiring unconfigured state (use baseTest)
 * 2. Tests requiring configured state (use test with fixture)
 */

// Tests for unconfigured database state
baseTest.describe("Database Connection - Unconfigured", () => {
  baseTest("shows data source selector when not configured", async ({ page }) => {
    // Clear localStorage to ensure no saved config
    await page.addInitScript(() => {
      localStorage.removeItem("dashb-db-config");
    });

    await page.goto("/");

    // Should show the "Choose Data Source" section
    await baseExpect(page.getByText("Choose Data Source")).toBeVisible();

    // Should show Database and Upload Files options (h4 elements)
    await baseExpect(page.getByRole("heading", { name: "Database", level: 4 })).toBeVisible();
    await baseExpect(page.getByRole("heading", { name: "Upload Files", level: 4 })).toBeVisible();
  });

  baseTest("can configure database from data source selector", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem("dashb-db-config");
    });

    await page.goto("/");

    // Default config has host/db set but no password, so button shows "Connect"
    // Click to open the config modal
    await page.getByRole("button", { name: "Connect" }).click();

    // DB Config modal should open
    await baseExpect(page.getByText("Database Configuration")).toBeVisible();

    // Fill in the form (password is required for full configuration)
    await page.getByLabel("Password").fill("secret");

    // Save
    await page.getByRole("button", { name: "Save" }).click();

    // Modal should close
    await baseExpect(page.getByText("Database Configuration")).not.toBeVisible();

    // Data source selector should be hidden (now configured)
    await baseExpect(page.getByText("Choose Data Source")).not.toBeVisible();
  });
});

// Tests for configured database state (uses fixture)
test.describe("Database Connection - Configured", () => {
  test("opens database configuration modal via Sources button", async ({ page }) => {
    await page.goto("/");

    // "Sources" button opens DB config modal directly
    await page.getByRole("button", { name: /sources/i }).click();

    // DB Config modal should appear
    await expect(page.getByText("Database Configuration")).toBeVisible();

    // Should have all the form fields (use specific selectors to avoid ambiguity)
    await expect(page.getByLabel("Host")).toBeVisible();
    await expect(page.getByLabel("Port")).toBeVisible();
    await expect(page.getByLabel("Database Type")).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Database" })).toBeVisible();
    await expect(page.getByLabel("User")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
  });

  test("can close database config modal with Cancel", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: /sources/i }).click();
    await expect(page.getByText("Database Configuration")).toBeVisible();

    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByText("Database Configuration")).not.toBeVisible();
  });

  test("shows switch button when configured", async ({ page }) => {
    await page.goto("/");

    // "Switch" button should be visible when configured
    await expect(page.getByRole("button", { name: /switch/i })).toBeVisible();
  });

  test("opens switch source modal via Switch button", async ({ page }) => {
    await page.goto("/");

    // Click "Switch" button to open switch source modal
    await page.getByRole("button", { name: /switch/i }).click();

    // Switch source modal should appear
    await expect(page.getByText("Switch Data Source")).toBeVisible();
  });
});
