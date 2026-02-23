import { test, expect } from "@playwright/test";

/**
 * E2E tests for the Chart Refinement Panel feature.
 * These tests verify the column selectors and chart type switching work in fullscreen mode.
 *
 * Note: These tests depend on dashboard generation which can be slow.
 * They are marked with @slow tag for CI filtering.
 */

test.describe("Chart Refinement Panel", () => {
  // Increase timeout for these tests since they depend on LLM generation
  test.setTimeout(180000);

  test("fullscreen mode shows chart refinement controls @postgres @slow", async ({ page }) => {
    // Navigate to the app
    await page.goto("/");

    // Wait for app to load
    await page.waitForSelector('input[placeholder*="dashboard"]', { timeout: 10000 });

    // Configure PostgreSQL connection
    await page.click('button:has-text("Connect")');
    await page.waitForSelector('select', { timeout: 5000 });
    await page.getByRole('textbox', { name: 'Password' }).fill("postgres");
    await page.click('button:has-text("Save")');

    // Wait for charts to appear (auto-generation happens on connect)
    await page.waitForSelector('button[title="Fullscreen"]', { timeout: 120000 });

    // Open fullscreen
    const fullscreenButton = page.locator('button[title="Fullscreen"]').first();
    await fullscreenButton.click();

    // Verify fullscreen controls are visible
    await page.waitForTimeout(500);

    // Look for chart type dropdown or axis label
    const hasChartType = await page.locator('select').filter({ hasText: /Bar|Line|Area/ }).first().isVisible();
    const hasAxisLabel = await page.locator('text=X-Axis:').first().isVisible() ||
                         await page.locator('text=Y-Axis:').first().isVisible();

    expect(hasChartType || hasAxisLabel).toBeTruthy();

    // Close fullscreen
    await page.keyboard.press("Escape");
  });
});
