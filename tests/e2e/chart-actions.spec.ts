import { test, expect } from "./fixtures/db-config";

/**
 * Chart Actions E2E Tests
 *
 * Note: These tests verify the chart actions UI components are rendered
 * correctly. Full integration tests with actual chart generation require
 * a running database, which is outside the scope of these e2e tests.
 */

test.describe("Chart Actions Components", () => {
  // Database config is automatically injected by the dbConfig fixture

  test("page loads with generate UI when configured", async ({ page }) => {
    await page.goto("/");

    // Prompt input should be visible
    const input = page.getByPlaceholder("Describe the dashboard you want...");
    await expect(input).toBeVisible();

    // Generate button should exist
    await expect(page.getByRole("button", { name: "Generate" })).toBeVisible();
  });

  test("example prompts are clickable", async ({ page }) => {
    await page.goto("/");

    // Click an example prompt
    const exampleButton = page.getByRole("button", {
      name: "Show total revenue and order count",
    });
    await expect(exampleButton).toBeVisible();

    await exampleButton.click();

    // Input should be filled
    const input = page.getByPlaceholder("Describe the dashboard you want...");
    await expect(input).toHaveValue("Show total revenue and order count");
  });

  test("generate button becomes enabled when prompt is filled", async ({
    page,
  }) => {
    await page.goto("/");

    const generateBtn = page.getByRole("button", { name: "Generate" });
    const input = page.getByPlaceholder("Describe the dashboard you want...");

    // Initially disabled (empty prompt)
    await expect(generateBtn).toBeDisabled();

    // Fill in prompt
    await input.fill("Test prompt");

    // Should now be enabled
    await expect(generateBtn).toBeEnabled();
  });

  test("theme toggle persists preference", async ({ page }) => {
    await page.goto("/");

    const themeToggle = page.getByRole("button", { name: /toggle theme/i });

    // Click to switch to light
    await themeToggle.click();
    await expect(page.locator("html")).toHaveClass(/light/);

    // Reload page
    await page.reload();

    // Should still be light mode (persisted in localStorage)
    await expect(page.locator("html")).toHaveClass(/light/);
  });

  test("sources button opens database config modal", async ({ page }) => {
    await page.goto("/");

    // Click Sources button to open DB config
    await page.getByRole("button", { name: /sources/i }).click();

    // Modal should open with configuration form
    await expect(page.getByText("Database Configuration")).toBeVisible();
    await expect(page.getByLabel("Host")).toBeVisible();
    await expect(page.getByLabel("Database Type")).toBeVisible();
  });

  test("test connection button exists in config modal", async ({ page }) => {
    await page.goto("/");

    // Open config modal via Sources button
    await page.getByRole("button", { name: /sources/i }).click();

    // Test Connection button should exist
    await expect(
      page.getByRole("button", { name: "Test Connection" }),
    ).toBeVisible();
  });
});
