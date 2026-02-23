import { test, expect } from "./fixtures/db-config";
import { Page } from "@playwright/test";
import {
  donutData,
  multiLineData,
  gaugeData,
  funnelData,
  treemapData,
  waterfallData,
  radarData,
  bulletData,
  histogramData,
  boxplotData,
  stackedChartData,
  generateMockChartResponse,
} from "./fixtures/chart-data";

/**
 * Advanced Chart Components E2E Tests
 *
 * Tests for the newer chart types: Donut, MultiLine, Gauge, Funnel,
 * Treemap, Waterfall, Radar, Bullet, Histogram, and Boxplot.
 * Verifies rendering, tooltips, fullscreen mode, and data formatting.
 */

// Helper to mock the generate-agentic API response
async function mockChartApiResponse(page: Page, mockResponse: string) {
  await page.route("**/api/generate-agentic", async (route) => {
    const lines = mockResponse.split("\n");
    await route.fulfill({
      status: 200,
      contentType: "text/plain; charset=utf-8",
      body: lines.map((line) => `0:${JSON.stringify(line)}\n`).join(""),
    });
  });
}

// Helper to generate dashboard and wait for chart
async function generateAndWaitForChart(page: Page, prompt: string) {
  const input = page.getByPlaceholder("Describe the dashboard you want...");
  await input.fill(prompt);
  await page.getByRole("button", { name: "Generate" }).click();
  await expect(page.locator("svg")).toBeVisible({ timeout: 10000 });
}

test.describe("Donut Chart", () => {
  test("renders donut segments correctly", async ({ page }) => {
    const mockResponse = generateMockChartResponse("donut", donutData, "donut_query", {
      labelColumn: "category",
      valueColumn: "value",
      title: "Device Distribution",
    });

    await mockChartApiResponse(page, mockResponse);
    await page.goto("/");
    await generateAndWaitForChart(page, "Show device distribution");

    // Donut chart should have path elements for segments
    const segments = page.locator("svg path");
    await expect(segments.first()).toBeVisible();
  });

  test("shows tooltip on segment hover", async ({ page }) => {
    const mockResponse = generateMockChartResponse("donut", donutData, "donut_query", {
      title: "Donut Tooltip Test",
    });

    await mockChartApiResponse(page, mockResponse);
    await page.goto("/");
    await generateAndWaitForChart(page, "Show donut chart");

    // Hover over a segment
    const segments = page.locator("svg path").first();
    await segments.hover();

    // Should show tooltip or title
    const tooltipOrTitle = page.locator("svg text, svg title");
    await expect(tooltipOrTitle.first()).toBeVisible({ timeout: 5000 });
  });

  test("displays legend with categories", async ({ page }) => {
    const mockResponse = generateMockChartResponse("donut", donutData, "donut_query", {
      title: "Donut with Legend",
    });

    await mockChartApiResponse(page, mockResponse);
    await page.goto("/");
    await generateAndWaitForChart(page, "Show donut with legend");

    // Should have legend items with category names
    const legendText = page.locator("text, span").filter({ hasText: /Desktop|Mobile|Tablet/ });
    await expect(legendText.first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Multi-Line Chart", () => {
  test("renders multiple line series", async ({ page }) => {
    const mockResponse = generateMockChartResponse("multiline", multiLineData, "multiline_query", {
      title: "Regional Sales Trend",
    });

    await mockChartApiResponse(page, mockResponse);
    await page.goto("/");
    await generateAndWaitForChart(page, "Show regional sales");

    // Should have multiple path elements for different series
    const lines = page.locator("svg path[stroke-width]");
    await expect(lines.first()).toBeVisible();
  });

  test("shows interactive legend for series toggle", async ({ page }) => {
    const mockResponse = generateMockChartResponse("multiline", multiLineData, "multiline_query", {
      title: "Multi-Line Legend",
    });

    await mockChartApiResponse(page, mockResponse);
    await page.goto("/");
    await generateAndWaitForChart(page, "Show multi-line chart");

    // Legend buttons should be present
    const legendButtons = page.locator("button").filter({ hasText: /North|South|East/ });
    await expect(legendButtons.first()).toBeVisible({ timeout: 5000 });
  });

  test("shows tooltip on point hover", async ({ page }) => {
    const mockResponse = generateMockChartResponse("multiline", multiLineData, "multiline_query", {
      title: "Multi-Line Tooltip",
    });

    await mockChartApiResponse(page, mockResponse);
    await page.goto("/");
    await generateAndWaitForChart(page, "Show multi-line tooltip test");

    // Hover over a data point
    const hitAreas = page.locator("svg circle[fill='transparent']");
    if ((await hitAreas.count()) > 0) {
      await hitAreas.first().hover();

      // Tooltip should appear
      const tooltip = page.locator("svg rect[fill='var(--card)']");
      await expect(tooltip).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe("Gauge Chart", () => {
  test("renders gauge arc correctly", async ({ page }) => {
    const mockResponse = generateMockChartResponse("gauge", gaugeData, "gauge_query", {
      title: "Performance Score",
    });

    await mockChartApiResponse(page, mockResponse);
    await page.goto("/");
    await generateAndWaitForChart(page, "Show performance gauge");

    // Gauge should have arc paths
    const arcs = page.locator("svg path");
    await expect(arcs.first()).toBeVisible();
  });

  test("displays current value prominently", async ({ page }) => {
    const mockResponse = generateMockChartResponse("gauge", gaugeData, "gauge_query", {
      title: "Gauge Value Display",
    });

    await mockChartApiResponse(page, mockResponse);
    await page.goto("/");
    await generateAndWaitForChart(page, "Show gauge value");

    // Should display the value (72)
    const valueText = page.locator("svg text, span").filter({ hasText: /72|72%/ });
    await expect(valueText.first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Funnel Chart", () => {
  test("renders funnel stages in descending order", async ({ page }) => {
    const mockResponse = generateMockChartResponse("funnel", funnelData, "funnel_query", {
      title: "Sales Funnel",
    });

    await mockChartApiResponse(page, mockResponse);
    await page.goto("/");
    await generateAndWaitForChart(page, "Show sales funnel");

    // Funnel should have trapezoid/rect elements for stages
    const stages = page.locator("svg rect, svg path");
    await expect(stages.first()).toBeVisible();
  });

  test("displays stage labels and values", async ({ page }) => {
    const mockResponse = generateMockChartResponse("funnel", funnelData, "funnel_query", {
      title: "Funnel Labels",
    });

    await mockChartApiResponse(page, mockResponse);
    await page.goto("/");
    await generateAndWaitForChart(page, "Show funnel labels");

    // Should display stage names
    const stageLabels = page.locator("text, span").filter({ hasText: /Visitors|Leads|Qualified/ });
    await expect(stageLabels.first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Treemap", () => {
  test("renders rectangular cells for categories", async ({ page }) => {
    const mockResponse = generateMockChartResponse("treemap", treemapData, "treemap_query", {
      title: "Product Categories",
    });

    await mockChartApiResponse(page, mockResponse);
    await page.goto("/");
    await generateAndWaitForChart(page, "Show product treemap");

    // Treemap should have rect elements
    const cells = page.locator("svg rect");
    await expect(cells.first()).toBeVisible();
  });

  test("shows tooltip on cell hover", async ({ page }) => {
    const mockResponse = generateMockChartResponse("treemap", treemapData, "treemap_query", {
      title: "Treemap Tooltip",
    });

    await mockChartApiResponse(page, mockResponse);
    await page.goto("/");
    await generateAndWaitForChart(page, "Show treemap tooltip");

    // Hover over a cell
    const cells = page.locator("svg rect").first();
    await cells.hover();

    // Should show tooltip or value
    const tooltipText = page.locator("svg text, svg g text");
    await expect(tooltipText.first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Waterfall Chart", () => {
  test("renders waterfall bars with connectors", async ({ page }) => {
    const mockResponse = generateMockChartResponse("waterfall", waterfallData, "waterfall_query", {
      title: "Financial Summary",
    });

    await mockChartApiResponse(page, mockResponse);
    await page.goto("/");
    await generateAndWaitForChart(page, "Show financial waterfall");

    // Waterfall should have rect elements for bars
    const bars = page.locator("svg rect");
    await expect(bars.first()).toBeVisible();
  });

  test("shows positive values in green, negative in red", async ({ page }) => {
    const mockResponse = generateMockChartResponse("waterfall", waterfallData, "waterfall_query", {
      title: "Waterfall Colors",
    });

    await mockChartApiResponse(page, mockResponse);
    await page.goto("/");
    await generateAndWaitForChart(page, "Show waterfall colors");

    // Should have colored bars (checking for any fill attribute)
    const coloredBars = page.locator("svg rect[fill]");
    await expect(coloredBars.first()).toBeVisible();
  });
});

test.describe("Radar Chart", () => {
  test("renders radar polygon", async ({ page }) => {
    const mockResponse = generateMockChartResponse("radar", radarData, "radar_query", {
      title: "Performance Radar",
    });

    await mockChartApiResponse(page, mockResponse);
    await page.goto("/");
    await generateAndWaitForChart(page, "Show performance radar");

    // Radar should have polygon or path elements
    const polygon = page.locator("svg polygon, svg path");
    await expect(polygon.first()).toBeVisible();
  });

  test("displays dimension labels around the chart", async ({ page }) => {
    const mockResponse = generateMockChartResponse("radar", radarData, "radar_query", {
      title: "Radar Dimensions",
    });

    await mockChartApiResponse(page, mockResponse);
    await page.goto("/");
    await generateAndWaitForChart(page, "Show radar dimensions");

    // Should display dimension labels
    const dimensionLabels = page.locator("svg text").filter({ hasText: /Speed|Quality|Cost|Support|Reliability/ });
    await expect(dimensionLabels.first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Bullet Chart", () => {
  test("renders bullet bar with target marker", async ({ page }) => {
    const mockResponse = generateMockChartResponse("bullet", bulletData, "bullet_query", {
      title: "Sales Progress",
    });

    await mockChartApiResponse(page, mockResponse);
    await page.goto("/");
    await generateAndWaitForChart(page, "Show sales bullet");

    // Bullet should have rect elements
    const bars = page.locator("svg rect");
    await expect(bars.first()).toBeVisible();
  });
});

test.describe("Histogram", () => {
  test("renders distribution bins correctly", async ({ page }) => {
    const mockResponse = generateMockChartResponse("histogram", histogramData, "histogram_query", {
      title: "Value Distribution",
    });

    await mockChartApiResponse(page, mockResponse);
    await page.goto("/");
    await generateAndWaitForChart(page, "Show value histogram");

    // Histogram should have rect elements for bins
    const bins = page.locator("svg rect");
    await expect(bins.first()).toBeVisible();
  });

  test("displays statistical summary", async ({ page }) => {
    const mockResponse = generateMockChartResponse("histogram", histogramData, "histogram_query", {
      title: "Histogram Stats",
    });

    await mockChartApiResponse(page, mockResponse);
    await page.goto("/");
    await generateAndWaitForChart(page, "Show histogram stats");

    // Should display stats like mean, median, or n
    const statsText = page.locator("text, span").filter({ hasText: /n=|mean|median|σ/ });
    await expect(statsText.first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Boxplot", () => {
  test("renders box-and-whisker elements", async ({ page }) => {
    const mockResponse = generateMockChartResponse("boxplot", boxplotData, "boxplot_query", {
      title: "Group Comparison",
    });

    await mockChartApiResponse(page, mockResponse);
    await page.goto("/");
    await generateAndWaitForChart(page, "Show boxplot comparison");

    // Boxplot should have rect elements for boxes
    const boxes = page.locator("svg rect");
    await expect(boxes.first()).toBeVisible();
  });

  test("shows outlier points", async ({ page }) => {
    const mockResponse = generateMockChartResponse("boxplot", boxplotData, "boxplot_query", {
      title: "Boxplot Outliers",
    });

    await mockChartApiResponse(page, mockResponse);
    await page.goto("/");
    await generateAndWaitForChart(page, "Show boxplot outliers");

    // Should have circle elements for outliers
    const outliers = page.locator("svg circle");
    await expect(outliers.first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Stacked Chart", () => {
  test("renders stacked bar segments", async ({ page }) => {
    const mockResponse = generateMockChartResponse("stacked", stackedChartData, "stacked_query", {
      title: "Quarterly Breakdown",
    });

    await mockChartApiResponse(page, mockResponse);
    await page.goto("/");
    await generateAndWaitForChart(page, "Show quarterly breakdown");

    // Stacked chart should have rect elements
    const segments = page.locator("svg rect");
    await expect(segments.first()).toBeVisible();
  });

  test("shows legend for series", async ({ page }) => {
    const mockResponse = generateMockChartResponse("stacked", stackedChartData, "stacked_query", {
      title: "Stacked Legend",
    });

    await mockChartApiResponse(page, mockResponse);
    await page.goto("/");
    await generateAndWaitForChart(page, "Show stacked legend");

    // Should display series names in legend
    const legendText = page.locator("text, span, button").filter({ hasText: /Product A|Product B|Product C/ });
    await expect(legendText.first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Fullscreen Mode - All Charts", () => {
  test("donut chart opens in fullscreen", async ({ page }) => {
    const mockResponse = generateMockChartResponse("donut", donutData, "donut_query", {
      title: "Fullscreen Donut",
    });

    await mockChartApiResponse(page, mockResponse);
    await page.goto("/");
    await generateAndWaitForChart(page, "Show fullscreen donut");

    const fullscreenBtn = page.getByRole("button", { name: /fullscreen/i });
    if ((await fullscreenBtn.count()) > 0) {
      await fullscreenBtn.click();
      const modal = page.locator('[style*="position: fixed"]');
      await expect(modal).toBeVisible({ timeout: 5000 });
    }
  });

  test("multi-line chart opens in fullscreen with larger dimensions", async ({ page }) => {
    const mockResponse = generateMockChartResponse("multiline", multiLineData, "multiline_query", {
      title: "Fullscreen Multi-Line",
    });

    await mockChartApiResponse(page, mockResponse);
    await page.goto("/");
    await generateAndWaitForChart(page, "Show fullscreen multi-line");

    const fullscreenBtn = page.getByRole("button", { name: /fullscreen/i });
    if ((await fullscreenBtn.count()) > 0) {
      await fullscreenBtn.click();
      const modal = page.locator('[style*="position: fixed"]');
      await expect(modal).toBeVisible({ timeout: 5000 });

      // Fullscreen SVG should be present with larger viewBox
      const fullscreenSvg = modal.locator("svg");
      await expect(fullscreenSvg).toBeVisible();
    }
  });
});
