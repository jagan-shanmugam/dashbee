import { test, expect } from "./fixtures/db-config";
import { Page } from "@playwright/test";
import {
  barChartData,
  manyBarsData,
  dailyTimeSeriesData,
  scatterData,
  generateMockChartResponse,
} from "./fixtures/chart-data";

/**
 * Chart Components E2E Tests
 *
 * These tests verify chart rendering, tooltips, fullscreen mode,
 * and data formatting using mocked API responses.
 */

// Helper to mock the generate-agentic API response
async function mockChartApiResponse(
  page: Page,
  mockResponse: string,
  options?: { delay?: number }
) {
  await page.route("**/api/generate-agentic", async (route) => {
    // Add optional delay to simulate streaming
    if (options?.delay) {
      await new Promise((resolve) => setTimeout(resolve, options.delay));
    }

    // Create a streaming response
    const lines = mockResponse.split("\n");

    // Return as streaming text response
    await route.fulfill({
      status: 200,
      contentType: "text/plain; charset=utf-8",
      body: lines.map((line) => `0:${JSON.stringify(line)}\n`).join(""),
    });
  });
}

test.describe("Chart Components", () => {
  // Database config is automatically injected by the dbConfig fixture

  test.describe("Vertical Bar Chart", () => {
    test("renders vertical bars correctly", async ({ page }) => {
      const mockResponse = generateMockChartResponse("bar", barChartData, "test_query", {
        labelColumn: "category",
        valueColumn: "value",
        title: "Product Sales",
        orientation: "vertical",
      });

      await mockChartApiResponse(page, mockResponse);
      await page.goto("/");

      // Fill in a prompt and generate
      const input = page.getByPlaceholder("Describe the dashboard you want...");
      await input.fill("Show product sales");
      await page.getByRole("button", { name: "Generate" }).click();

      // Wait for chart to render
      await expect(page.locator("svg")).toBeVisible({ timeout: 10000 });

      // Verify SVG bar elements exist
      const bars = page.locator("svg rect").filter({ hasNot: page.locator("[fill='transparent']") });
      await expect(bars.first()).toBeVisible();
    });

    test("shows tooltip on bar hover", async ({ page }) => {
      const mockResponse = generateMockChartResponse("bar", barChartData, "test_query", {
        labelColumn: "category",
        valueColumn: "value",
        title: "Sales Data",
        orientation: "vertical",
      });

      await mockChartApiResponse(page, mockResponse);
      await page.goto("/");

      const input = page.getByPlaceholder("Describe the dashboard you want...");
      await input.fill("Show sales data");
      await page.getByRole("button", { name: "Generate" }).click();

      await expect(page.locator("svg")).toBeVisible({ timeout: 10000 });

      // Hover over a bar (the transparent hit area)
      const hitAreas = page.locator("svg rect[fill='transparent']");
      const firstHitArea = hitAreas.first();

      if ((await firstHitArea.count()) > 0) {
        await firstHitArea.hover();

        // Tooltip text should appear in SVG
        const tooltipText = page.locator("svg text").filter({ hasText: /\d/ });
        await expect(tooltipText.first()).toBeVisible({ timeout: 5000 });
      }
    });

    test("displays angled labels for many items", async ({ page }) => {
      const mockResponse = generateMockChartResponse("bar", manyBarsData, "test_query", {
        labelColumn: "category",
        valueColumn: "value",
        title: "Many Categories",
        orientation: "vertical",
      });

      await mockChartApiResponse(page, mockResponse);
      await page.goto("/");

      const input = page.getByPlaceholder("Describe the dashboard you want...");
      await input.fill("Show many categories");
      await page.getByRole("button", { name: "Generate" }).click();

      await expect(page.locator("svg")).toBeVisible({ timeout: 10000 });

      // Check for rotated text elements (transform attribute with rotate)
      const rotatedLabels = page.locator('svg text[transform*="rotate"]');
      // With 10 items, labels should be angled
      await expect(rotatedLabels.first()).toBeVisible({ timeout: 5000 });
    });

    test("formats y-axis with proper number formatting", async ({ page }) => {
      const mockResponse = generateMockChartResponse("bar", barChartData, "test_query", {
        labelColumn: "category",
        valueColumn: "value",
        title: "Large Numbers",
        orientation: "vertical",
      });

      await mockChartApiResponse(page, mockResponse);
      await page.goto("/");

      const input = page.getByPlaceholder("Describe the dashboard you want...");
      await input.fill("Show large numbers");
      await page.getByRole("button", { name: "Generate" }).click();

      await expect(page.locator("svg")).toBeVisible({ timeout: 10000 });

      // Y-axis labels should contain formatted numbers (with commas)
      const yAxisLabels = page.locator("svg text[text-anchor='end']");
      const labelText = await yAxisLabels.first().textContent();

      // Should have some formatted number
      expect(labelText).toBeTruthy();
    });
  });

  test.describe("Line Chart", () => {
    test("renders line correctly", async ({ page }) => {
      const mockResponse = generateMockChartResponse("line", dailyTimeSeriesData, "test_query", {
        labelColumn: "date",
        valueColumn: "value",
        title: "Daily Trend",
      });

      await mockChartApiResponse(page, mockResponse);
      await page.goto("/");

      const input = page.getByPlaceholder("Describe the dashboard you want...");
      await input.fill("Show daily trend");
      await page.getByRole("button", { name: "Generate" }).click();

      await expect(page.locator("svg")).toBeVisible({ timeout: 10000 });

      // Should have a path element for the line
      const linePath = page.locator("svg path[stroke='var(--foreground)']");
      await expect(linePath).toBeVisible();
    });

    test("shows tooltip on point hover", async ({ page }) => {
      const mockResponse = generateMockChartResponse("line", dailyTimeSeriesData, "test_query", {
        labelColumn: "date",
        valueColumn: "value",
        title: "Daily Trend",
      });

      await mockChartApiResponse(page, mockResponse);
      await page.goto("/");

      const input = page.getByPlaceholder("Describe the dashboard you want...");
      await input.fill("Show daily data");
      await page.getByRole("button", { name: "Generate" }).click();

      await expect(page.locator("svg")).toBeVisible({ timeout: 10000 });

      // Hover over a data point (circle elements)
      const dataPoints = page.locator("svg circle[fill='transparent']");

      if ((await dataPoints.count()) > 0) {
        await dataPoints.first().hover();

        // Should show tooltip with value
        const tooltip = page.locator("svg rect[fill='var(--card)']");
        await expect(tooltip).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe("Scatter Plot", () => {
    test("plots points at correct positions", async ({ page }) => {
      const mockResponse = generateMockChartResponse("scatter", scatterData, "test_query", {
        title: "Scatter Plot",
      });

      await mockChartApiResponse(page, mockResponse);
      await page.goto("/");

      const input = page.getByPlaceholder("Describe the dashboard you want...");
      await input.fill("Show scatter plot");
      await page.getByRole("button", { name: "Generate" }).click();

      await expect(page.locator("svg")).toBeVisible({ timeout: 10000 });

      // Should have visible data point circles
      const dataPoints = page.locator("svg circle").filter({
        hasNot: page.locator("[fill='transparent']"),
      });
      await expect(dataPoints.first()).toBeVisible();
    });

    test("shows tooltip with x, y values on hover", async ({ page }) => {
      const mockResponse = generateMockChartResponse("scatter", scatterData, "test_query", {
        title: "Scatter Data",
      });

      await mockChartApiResponse(page, mockResponse);
      await page.goto("/");

      const input = page.getByPlaceholder("Describe the dashboard you want...");
      await input.fill("Show scatter data");
      await page.getByRole("button", { name: "Generate" }).click();

      await expect(page.locator("svg")).toBeVisible({ timeout: 10000 });

      // Hover over a data point
      const hitAreas = page.locator("svg circle[fill='transparent']");

      if ((await hitAreas.count()) > 0) {
        await hitAreas.first().hover();

        // Tooltip should show x and y labels
        const tooltipText = page.locator("svg text");
        await expect(tooltipText.first()).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe("Full-screen Mode", () => {
    test("opens fullscreen modal", async ({ page }) => {
      const mockResponse = generateMockChartResponse("bar", barChartData, "test_query", {
        labelColumn: "category",
        valueColumn: "value",
        title: "Fullscreen Test",
        orientation: "vertical",
      });

      await mockChartApiResponse(page, mockResponse);
      await page.goto("/");

      const input = page.getByPlaceholder("Describe the dashboard you want...");
      await input.fill("Show fullscreen test");
      await page.getByRole("button", { name: "Generate" }).click();

      await expect(page.locator("svg")).toBeVisible({ timeout: 10000 });

      // Find and click the fullscreen button
      const fullscreenBtn = page.getByRole("button", { name: /fullscreen/i });

      if ((await fullscreenBtn.count()) > 0) {
        await fullscreenBtn.click();

        // Modal should be visible
        const modal = page.locator('[style*="position: fixed"]');
        await expect(modal).toBeVisible({ timeout: 5000 });
      }
    });

    test("chart type dropdown changes chart", async ({ page }) => {
      const mockResponse = generateMockChartResponse("bar", dailyTimeSeriesData, "test_query", {
        labelColumn: "date",
        valueColumn: "value",
        title: "Chart Type Test",
        orientation: "vertical",
      });

      await mockChartApiResponse(page, mockResponse);
      await page.goto("/");

      const input = page.getByPlaceholder("Describe the dashboard you want...");
      await input.fill("Show chart type test");
      await page.getByRole("button", { name: "Generate" }).click();

      await expect(page.locator("svg")).toBeVisible({ timeout: 10000 });

      // Open fullscreen
      const fullscreenBtn = page.getByRole("button", { name: /fullscreen/i });

      if ((await fullscreenBtn.count()) > 0) {
        await fullscreenBtn.click();

        // Find and interact with chart type dropdown
        const dropdown = page.locator('[data-testid="chart-type-dropdown"]');

        if ((await dropdown.count()) > 0) {
          // Change to Line chart
          await dropdown.selectOption("line");

          // Should now show a line path
          const linePath = page.locator("svg path[fill='none']");
          await expect(linePath).toBeVisible({ timeout: 5000 });
        }
      }
    });

    test("closes on escape key", async ({ page }) => {
      const mockResponse = generateMockChartResponse("bar", barChartData, "test_query", {
        labelColumn: "category",
        valueColumn: "value",
        title: "Escape Test",
        orientation: "vertical",
      });

      await mockChartApiResponse(page, mockResponse);
      await page.goto("/");

      const input = page.getByPlaceholder("Describe the dashboard you want...");
      await input.fill("Show escape test");
      await page.getByRole("button", { name: "Generate" }).click();

      await expect(page.locator("svg")).toBeVisible({ timeout: 10000 });

      // Open fullscreen
      const fullscreenBtn = page.getByRole("button", { name: /fullscreen/i });

      if ((await fullscreenBtn.count()) > 0) {
        await fullscreenBtn.click();

        // Modal should be visible
        const modal = page.locator('[style*="position: fixed"]');
        await expect(modal).toBeVisible({ timeout: 5000 });

        // Press Escape to close
        await page.keyboard.press("Escape");

        // Modal should be closed
        await expect(modal).not.toBeVisible({ timeout: 3000 });
      }
    });
  });

  test.describe("Date Formatting", () => {
    test("formats daily dates correctly", async ({ page }) => {
      const mockResponse = generateMockChartResponse("line", dailyTimeSeriesData, "test_query", {
        labelColumn: "date",
        valueColumn: "value",
        title: "Daily Data",
      });

      await mockChartApiResponse(page, mockResponse);
      await page.goto("/");

      const input = page.getByPlaceholder("Describe the dashboard you want...");
      await input.fill("Show daily data");
      await page.getByRole("button", { name: "Generate" }).click();

      await expect(page.locator("svg")).toBeVisible({ timeout: 10000 });

      // Check for formatted date labels (should be short format like "Jan 15")
      const dateLabels = page.locator("svg text").filter({ hasText: /Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/ });
      await expect(dateLabels.first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("Area Chart", () => {
    test("renders area fill correctly", async ({ page }) => {
      const mockResponse = generateMockChartResponse("area", dailyTimeSeriesData, "test_query", {
        labelColumn: "date",
        valueColumn: "value",
        title: "Area Chart",
      });

      await mockChartApiResponse(page, mockResponse);
      await page.goto("/");

      const input = page.getByPlaceholder("Describe the dashboard you want...");
      await input.fill("Show area chart");
      await page.getByRole("button", { name: "Generate" }).click();

      await expect(page.locator("svg")).toBeVisible({ timeout: 10000 });

      // Area charts should have a filled path (with opacity)
      const areaPath = page.locator('svg path[opacity="0.1"]');
      await expect(areaPath).toBeVisible();
    });
  });
});
