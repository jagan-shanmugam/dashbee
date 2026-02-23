/**
 * Mock data fixtures for Playwright chart tests
 */

export const barChartData = [
  { category: "Product A", value: 1234567 },
  { category: "Product B", value: 987654 },
  { category: "Product C", value: 756432 },
  { category: "Product D", value: 543210 },
  { category: "Product E", value: 432109 },
  { category: "Product F", value: 321098 },
];

export const manyBarsData = [
  { category: "Category 1", value: 100 },
  { category: "Category 2", value: 200 },
  { category: "Category 3", value: 150 },
  { category: "Category 4", value: 180 },
  { category: "Category 5", value: 220 },
  { category: "Category 6", value: 190 },
  { category: "Category 7", value: 170 },
  { category: "Category 8", value: 140 },
  { category: "Category 9 With Long Label", value: 160 },
  { category: "Category 10 Extra Long Label Text", value: 130 },
];

export const dailyTimeSeriesData = [
  { date: "2024-01-15", value: 100 },
  { date: "2024-01-16", value: 150 },
  { date: "2024-01-17", value: 120 },
  { date: "2024-01-18", value: 180 },
  { date: "2024-01-19", value: 200 },
  { date: "2024-01-20", value: 175 },
  { date: "2024-01-21", value: 190 },
];

export const monthlyTimeSeriesData = [
  { date: "2024-01-01", value: 1000 },
  { date: "2024-02-01", value: 1200 },
  { date: "2024-03-01", value: 1100 },
  { date: "2024-04-01", value: 1500 },
  { date: "2024-05-01", value: 1400 },
  { date: "2024-06-01", value: 1600 },
];

export const quarterlyData = [
  { quarter: "Q1 2024", value: 25000 },
  { quarter: "Q2 2024", value: 28000 },
  { quarter: "Q3 2024", value: 32000 },
  { quarter: "Q4 2024", value: 35000 },
];

export const scatterData = [
  { x: 10, y: 20, label: "Point A" },
  { x: 30, y: 40, label: "Point B" },
  { x: 50, y: 35, label: "Point C" },
  { x: 70, y: 60, label: "Point D" },
  { x: 90, y: 80, label: "Point E" },
];

export const heatmapCalendarData = [
  { date: "2024-01-01", value: 5 },
  { date: "2024-01-02", value: 10 },
  { date: "2024-01-03", value: 3 },
  { date: "2024-01-04", value: 8 },
  { date: "2024-01-05", value: 12 },
  { date: "2024-01-06", value: 6 },
  { date: "2024-01-07", value: 15 },
];

export const heatmapMatrixData = [
  { row: "Monday", col: "Morning", value: 10 },
  { row: "Monday", col: "Afternoon", value: 15 },
  { row: "Monday", col: "Evening", value: 8 },
  { row: "Tuesday", col: "Morning", value: 12 },
  { row: "Tuesday", col: "Afternoon", value: 20 },
  { row: "Tuesday", col: "Evening", value: 18 },
  { row: "Wednesday", col: "Morning", value: 8 },
  { row: "Wednesday", col: "Afternoon", value: 14 },
  { row: "Wednesday", col: "Evening", value: 10 },
];

export const stackedChartData = [
  { category: "Q1", series: "Product A", value: 100 },
  { category: "Q1", series: "Product B", value: 80 },
  { category: "Q1", series: "Product C", value: 60 },
  { category: "Q2", series: "Product A", value: 120 },
  { category: "Q2", series: "Product B", value: 90 },
  { category: "Q2", series: "Product C", value: 70 },
  { category: "Q3", series: "Product A", value: 140 },
  { category: "Q3", series: "Product B", value: 100 },
  { category: "Q3", series: "Product C", value: 85 },
];

// Donut chart data - category breakdown
export const donutData = [
  { category: "Desktop", value: 45000 },
  { category: "Mobile", value: 35000 },
  { category: "Tablet", value: 12000 },
  { category: "Other", value: 8000 },
];

// Multi-line chart data - multiple series over time
export const multiLineData = [
  { date: "2024-01-01", region: "North", sales: 100 },
  { date: "2024-01-01", region: "South", sales: 80 },
  { date: "2024-01-01", region: "East", sales: 60 },
  { date: "2024-02-01", region: "North", sales: 120 },
  { date: "2024-02-01", region: "South", sales: 90 },
  { date: "2024-02-01", region: "East", sales: 75 },
  { date: "2024-03-01", region: "North", sales: 140 },
  { date: "2024-03-01", region: "South", sales: 110 },
  { date: "2024-03-01", region: "East", sales: 85 },
];

// Gauge chart data - single metric with target
export const gaugeData = [{ current: 72, target: 85 }];

// Funnel chart data - conversion stages
export const funnelData = [
  { stage: "Visitors", value: 10000 },
  { stage: "Leads", value: 4500 },
  { stage: "Qualified", value: 2000 },
  { stage: "Proposals", value: 800 },
  { stage: "Closed Won", value: 350 },
];

// Treemap data - hierarchical breakdown
export const treemapData = [
  { category: "Electronics", subcategory: "Phones", value: 45000 },
  { category: "Electronics", subcategory: "Laptops", value: 32000 },
  { category: "Electronics", subcategory: "Tablets", value: 18000 },
  { category: "Clothing", subcategory: "Shirts", value: 25000 },
  { category: "Clothing", subcategory: "Pants", value: 22000 },
  { category: "Clothing", subcategory: "Shoes", value: 15000 },
  { category: "Home", subcategory: "Furniture", value: 28000 },
  { category: "Home", subcategory: "Decor", value: 12000 },
];

// Waterfall chart data - cumulative changes
export const waterfallData = [
  { category: "Starting Balance", value: 50000 },
  { category: "Revenue", value: 35000 },
  { category: "Cost of Goods", value: -15000 },
  { category: "Operating Expenses", value: -8000 },
  { category: "Marketing", value: -5000 },
  { category: "Other Income", value: 3000 },
];

// Radar chart data - multi-dimensional comparison
export const radarData = [
  { dimension: "Speed", value: 85 },
  { dimension: "Quality", value: 92 },
  { dimension: "Cost", value: 70 },
  { dimension: "Support", value: 88 },
  { dimension: "Reliability", value: 95 },
];

// Bullet chart data - actual vs target with ranges
export const bulletData = [{ actual: 275, target: 300 }];

// Histogram data - distribution of values
export const histogramData = [
  { amount: 15 }, { amount: 22 }, { amount: 18 }, { amount: 35 },
  { amount: 42 }, { amount: 38 }, { amount: 51 }, { amount: 48 },
  { amount: 55 }, { amount: 62 }, { amount: 58 }, { amount: 45 },
  { amount: 72 }, { amount: 68 }, { amount: 75 }, { amount: 82 },
  { amount: 78 }, { amount: 88 }, { amount: 95 }, { amount: 102 },
];

// Boxplot data - statistical distribution
export const boxplotData = [
  { group: "Group A", value: 15 },
  { group: "Group A", value: 22 },
  { group: "Group A", value: 28 },
  { group: "Group A", value: 35 },
  { group: "Group A", value: 42 },
  { group: "Group A", value: 120 }, // Outlier
  { group: "Group B", value: 30 },
  { group: "Group B", value: 35 },
  { group: "Group B", value: 40 },
  { group: "Group B", value: 45 },
  { group: "Group B", value: 50 },
];

/**
 * All supported chart types for mock response generation
 */
export type ChartType =
  | "bar"
  | "line"
  | "area"
  | "scatter"
  | "heatmap"
  | "stacked"
  | "donut"
  | "multiline"
  | "gauge"
  | "funnel"
  | "treemap"
  | "waterfall"
  | "radar"
  | "bullet"
  | "histogram"
  | "boxplot";

/**
 * Generate mock API response for generate-agentic endpoint
 * Returns JSONL patches that create a chart dashboard
 */
export function generateMockChartResponse(
  chartType: ChartType,
  data: Array<Record<string, unknown>>,
  queryKey = "test_query",
  options?: {
    labelColumn?: string;
    valueColumn?: string;
    title?: string;
    orientation?: "vertical" | "horizontal";
  }
): string {
  const {
    labelColumn = "category",
    valueColumn = "value",
    title = "Test Chart",
    orientation = "vertical",
  } = options ?? {};

  const patches: Array<{ op: string; path: string; value: unknown }> = [
    // Root element
    { op: "set", path: "/root", value: "main-card" },
    // Main card
    {
      op: "add",
      path: "/elements/main-card",
      value: { type: "Card", props: { title: "Test Dashboard" }, children: ["test-chart"] },
    },
  ];

  // Add chart element based on type
  switch (chartType) {
    case "scatter":
      patches.push({
        op: "add",
        path: "/elements/test-chart",
        value: {
          type: "Scatter",
          props: { queryKey, xColumn: "x", yColumn: "y", labelColumn: "label", title },
        },
      });
      break;

    case "heatmap":
      patches.push({
        op: "add",
        path: "/elements/test-chart",
        value: {
          type: "Heatmap",
          props: { variant: "matrix", queryKey, rowColumn: "row", colColumn: "col", valueColumn: "value", title },
        },
      });
      break;

    case "stacked":
      patches.push({
        op: "add",
        path: "/elements/test-chart",
        value: {
          type: "StackedChart",
          props: { queryKey, categoryColumn: "category", seriesColumn: "series", valueColumn: "value", title },
        },
      });
      break;

    case "donut":
      patches.push({
        op: "add",
        path: "/elements/test-chart",
        value: {
          type: "DonutChart",
          props: { queryKey, labelColumn, valueColumn, title },
        },
      });
      break;

    case "multiline":
      patches.push({
        op: "add",
        path: "/elements/test-chart",
        value: {
          type: "MultiLineChart",
          props: { queryKey, xColumn: "date", yColumn: "sales", seriesColumn: "region", title },
        },
      });
      break;

    case "gauge":
      patches.push({
        op: "add",
        path: "/elements/test-chart",
        value: {
          type: "GaugeChart",
          props: { queryKey, valueColumn: "current", targetColumn: "target", title, min: 0, max: 100 },
        },
      });
      break;

    case "funnel":
      patches.push({
        op: "add",
        path: "/elements/test-chart",
        value: {
          type: "FunnelChart",
          props: { queryKey, stageColumn: "stage", valueColumn: "value", title },
        },
      });
      break;

    case "treemap":
      patches.push({
        op: "add",
        path: "/elements/test-chart",
        value: {
          type: "Treemap",
          props: { queryKey, categoryColumn: "category", valueColumn: "value", labelColumn: "subcategory", title },
        },
      });
      break;

    case "waterfall":
      patches.push({
        op: "add",
        path: "/elements/test-chart",
        value: {
          type: "WaterfallChart",
          props: { queryKey, categoryColumn: "category", valueColumn: "value", title },
        },
      });
      break;

    case "radar":
      patches.push({
        op: "add",
        path: "/elements/test-chart",
        value: {
          type: "RadarChart",
          props: { queryKey, dimensionColumn: "dimension", valueColumn: "value", title },
        },
      });
      break;

    case "bullet":
      patches.push({
        op: "add",
        path: "/elements/test-chart",
        value: {
          type: "BulletChart",
          props: { queryKey, actualColumn: "actual", targetColumn: "target", title },
        },
      });
      break;

    case "histogram":
      patches.push({
        op: "add",
        path: "/elements/test-chart",
        value: {
          type: "Histogram",
          props: { queryKey, valueColumn: "amount", title, bins: 8 },
        },
      });
      break;

    case "boxplot":
      patches.push({
        op: "add",
        path: "/elements/test-chart",
        value: {
          type: "Boxplot",
          props: { queryKey, valueColumn: "value", categoryColumn: "group", title },
        },
      });
      break;

    default:
      // Regular Chart (bar, line, area)
      patches.push({
        op: "add",
        path: "/elements/test-chart",
        value: {
          type: "Chart",
          props: { type: chartType, queryKey, labelColumn, valueColumn, title, orientation },
        },
      });
  }

  // Add query data
  patches.push({
    op: "set",
    path: `/queries/${queryKey}`,
    value: data,
  });

  // Convert to JSONL
  return patches.map((p) => JSON.stringify(p)).join("\n");
}
