import { test, expect } from "./fixtures/db-config";

test.describe("Dashboard Generation", () => {
  // Database config is automatically injected by the dbConfig fixture

  test("shows prompt input when configured", async ({ page }) => {
    await page.goto("/");

    // Input should be enabled
    const input = page.getByPlaceholder("Describe the dashboard you want...");
    await expect(input).toBeEnabled();

    // Generate button should be visible
    await expect(page.getByRole("button", { name: "Generate" })).toBeVisible();
  });

  test("shows example prompts when no dashboard is generated", async ({
    page,
  }) => {
    await page.goto("/");

    // Example prompts should be visible
    await expect(
      page.getByRole("button", { name: "Show total revenue and order count" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Top 5 customers by order amount" }),
    ).toBeVisible();
  });

  test("clicking example fills the prompt", async ({ page }) => {
    await page.goto("/");

    // Click an example
    await page
      .getByRole("button", { name: "Show total revenue and order count" })
      .click();

    // Input should be filled
    const input = page.getByPlaceholder("Describe the dashboard you want...");
    await expect(input).toHaveValue("Show total revenue and order count");
  });

  test("generate button is disabled when prompt is empty", async ({ page }) => {
    await page.goto("/");

    const generateBtn = page.getByRole("button", { name: "Generate" });
    await expect(generateBtn).toBeDisabled();
  });

  test("shows theme toggle in header", async ({ page }) => {
    await page.goto("/");

    // Theme toggle should be visible
    await expect(
      page.getByRole("button", { name: /toggle theme/i }),
    ).toBeVisible();
  });

  test("can toggle theme", async ({ page }) => {
    await page.goto("/");

    const themeToggle = page.getByRole("button", { name: /toggle theme/i });

    // Initially dark mode (default)
    await expect(page.locator("html")).not.toHaveClass(/light/);

    // Click to switch to light
    await themeToggle.click();

    // Should now have light class
    await expect(page.locator("html")).toHaveClass(/light/);

    // Click to switch back to dark
    await themeToggle.click();

    // Should no longer have light class
    await expect(page.locator("html")).not.toHaveClass(/light/);
  });
});
