import { test, expect } from "@playwright/test";

/**
 * E2E tests for the Visual Encoding Shelves feature.
 * Tests the column mapping interface that guides AI chart generation.
 */

test.describe("Visual Encoding Shelves", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto("/");

    // Wait for the app to load
    await page.waitForSelector('input[placeholder*="dashboard"]', {
      timeout: 10000,
    });
  });

  async function ensureDbConnected(page: import("@playwright/test").Page) {
    // Check if already connected
    const connectedButton = page.locator('button:has-text("Sources Connected")');
    if (await connectedButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      return; // Already connected
    }

    // Not connected - configure PostgreSQL connection
    const connectButton = page.locator('button:has-text("Connect")');
    if (await connectButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await connectButton.click();
    } else {
      // Try Sources button
      await page.click('button:has-text("Sources")');
    }

    // Wait for connection panel
    await page.waitForSelector("select", { timeout: 5000 });

    // Fill password and save
    const passwordField = page.getByRole("textbox", { name: "Password" });
    if (await passwordField.isVisible()) {
      await passwordField.fill("postgres");
    }
    await page.click('button:has-text("Save")');
    await page.waitForTimeout(500);
  }

  test("should show encoding shelf after database connection @postgres", async ({
    page,
  }) => {
    await ensureDbConnected(page);

    // Visual Encoding button should be visible
    const encodingButton = page.locator('button:has-text("Visual Encoding")');
    await expect(encodingButton).toBeVisible({ timeout: 5000 });

    // Click to expand
    await encodingButton.click();
    await page.waitForTimeout(500);

    // Should show dropdowns (using combobox role)
    const dropdowns = page.locator("select");
    await expect(dropdowns.first()).toBeVisible({ timeout: 5000 });

    // Verify we have at least 3 dropdowns (Chart Type, X-Axis, Y-Axis)
    const dropdownCount = await dropdowns.count();
    expect(dropdownCount).toBeGreaterThanOrEqual(3);
  });

  test("should update badge when columns are mapped @postgres", async ({
    page,
  }) => {
    await ensureDbConnected(page);

    // Click Visual Encoding to expand
    await page.click('button:has-text("Visual Encoding")');
    await page.waitForTimeout(500);

    // Select X-Axis column (second dropdown - first is Chart Type)
    const xAxisDropdown = page.locator("select").nth(1);
    await xAxisDropdown.selectOption({ index: 1 }); // Select first column

    // Badge should show "1 columns mapped"
    await expect(page.locator("text=1 columns mapped")).toBeVisible({ timeout: 3000 });

    // Select Y-Axis column (third dropdown)
    const yAxisDropdown = page.locator("select").nth(2);
    await yAxisDropdown.selectOption({ index: 1 }); // Select first column

    // Badge should show "2 columns mapped"
    await expect(page.locator("text=2 columns mapped")).toBeVisible({ timeout: 3000 });

    // Clear mappings button should be visible
    const clearButton = page.locator('button:has-text("Clear mappings")');
    await expect(clearButton).toBeVisible();

    // Click clear mappings
    await clearButton.click();

    // Badge should be gone
    await expect(page.locator("text=columns mapped")).not.toBeVisible({ timeout: 3000 });
  });

  test("should change chart type in encoding shelf @postgres", async ({
    page,
  }) => {
    await ensureDbConnected(page);

    // Click Visual Encoding to expand
    await page.click('button:has-text("Visual Encoding")');
    await page.waitForTimeout(500);

    // Get chart type dropdown (first select)
    const chartTypeDropdown = page.locator("select").first();

    // Default should be Bar Chart (value "bar")
    await expect(chartTypeDropdown).toHaveValue("bar");

    // Change to Line Chart
    await chartTypeDropdown.selectOption("line");
    await expect(chartTypeDropdown).toHaveValue("line");

    // Change to Pie Chart
    await chartTypeDropdown.selectOption("pie");
    await expect(chartTypeDropdown).toHaveValue("pie");

    // Change to Scatter Plot
    await chartTypeDropdown.selectOption("scatter");
    await expect(chartTypeDropdown).toHaveValue("scatter");
  });
});
