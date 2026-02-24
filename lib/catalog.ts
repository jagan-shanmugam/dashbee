import { createCatalog } from "@json-render/core";
import { z } from "zod";

/**
 * DashBee component catalog
 *
 * This defines the ONLY components that the AI can generate.
 * It acts as a guardrail - the AI cannot create arbitrary HTML/CSS.
 *
 * Note: OpenAI structured output requires all fields to be required.
 * Use .nullable() instead of .optional() for optional fields.
 */
export const sqlDashboardCatalog = createCatalog({
  name: "DashBee",
  components: {
    // Layout Components
    Card: {
      props: z.object({
        title: z.string().nullable(),
        description: z.string().nullable(),
        padding: z.enum(["sm", "md", "lg"]).nullable(),
      }),
      hasChildren: true,
      description: "A card container with optional title",
    },

    Grid: {
      props: z.object({
        columns: z.number().min(1).max(4).nullable(),
        gap: z.enum(["sm", "md", "lg"]).nullable(),
      }),
      hasChildren: true,
      description: "Grid layout with configurable columns",
    },

    Stack: {
      props: z.object({
        direction: z.enum(["horizontal", "vertical"]).nullable(),
        gap: z.enum(["sm", "md", "lg"]).nullable(),
        align: z.enum(["start", "center", "end", "stretch"]).nullable(),
      }),
      hasChildren: true,
      description: "Flex stack for horizontal or vertical layouts",
    },

    // Data Components
    Metric: {
      props: z.object({
        label: z.string(),
        queryKey: z.string(),
        valuePath: z.string().nullable(),
        format: z.enum(["number", "currency", "percent"]).nullable(),
      }),
      description:
        "Display a metric from SQL query results. queryKey references a query, valuePath navigates within results (default: first row, first column)",
    },

    Chart: {
      props: z.object({
        type: z.enum(["bar", "line", "pie", "area"]),
        queryKey: z.string(),
        labelColumn: z.string(),
        valueColumn: z.string(),
        title: z.string().nullable(),
      }),
      description:
        "Display a chart from SQL query results. labelColumn and valueColumn specify which columns to use for the chart.",
    },

    Table: {
      props: z.object({
        queryKey: z.string(),
        columns: z.array(
          z.object({
            key: z.string(),
            label: z.string(),
            format: z.enum(["text", "currency", "date", "badge"]).nullable(),
          }),
        ),
        title: z.string().nullable(),
      }),
      description: "Display tabular data from SQL query results",
    },

    Heatmap: {
      props: z.object({
        variant: z.enum(["calendar", "matrix"]),
        queryKey: z.string(),
        title: z.string().nullable(),
        // Calendar variant - shows activity over time (GitHub contribution style)
        dateColumn: z.string().nullable(),
        valueColumn: z.string().nullable(),
        // Matrix variant - two-dimensional grid (row × column → value)
        rowColumn: z.string().nullable(),
        colColumn: z.string().nullable(),
        colorScale: z.enum(["green", "blue", "red", "purple"]).nullable(),
      }),
      description:
        "Display heatmap visualization. Use 'calendar' variant for time-series data (daily activity, commits, etc.) with dateColumn and valueColumn. Use 'matrix' variant for two-dimensional data (sales by region×product, traffic by hour×day) with rowColumn, colColumn, and valueColumn.",
    },

    MapChart: {
      props: z.object({
        variant: z.enum(["choropleth", "points"]),
        queryKey: z.string(),
        title: z.string().nullable(),
        // Choropleth props - regions colored by value
        regionColumn: z.string().nullable(),
        valueColumn: z.string().nullable(),
        geoType: z.enum(["us-states", "world"]).nullable(),
        // Point map props - markers at coordinates
        latColumn: z.string().nullable(),
        lngColumn: z.string().nullable(),
        labelColumn: z.string().nullable(),
        colorScale: z.enum(["green", "blue", "red", "purple"]).nullable(),
      }),
      description:
        "Display geographical map visualization. Use 'choropleth' variant for region-based data (sales by state, population by country) with regionColumn, valueColumn, and geoType. Use 'points' variant for coordinate-based data (store locations, events) with latColumn, lngColumn, and optional labelColumn.",
    },

    Scatter: {
      props: z.object({
        queryKey: z.string(),
        xColumn: z.string(),
        yColumn: z.string(),
        sizeColumn: z.string().nullable(),
        colorColumn: z.string().nullable(),
        labelColumn: z.string().nullable(),
        title: z.string().nullable(),
        colorPalette: z.string().nullable(),
      }),
      description:
        "Display scatter plot from SQL query results. xColumn and yColumn specify coordinates. Optional sizeColumn for bubble size, colorColumn for grouping, labelColumn for point labels.",
    },

    Histogram: {
      props: z.object({
        queryKey: z.string(),
        valueColumn: z.string(),
        bins: z.number().nullable(),
        title: z.string().nullable(),
        colorPalette: z.string().nullable(),
      }),
      description:
        "Display histogram showing distribution of values. valueColumn specifies the data to analyze. bins (default 10) controls the number of bars.",
    },

    Boxplot: {
      props: z.object({
        queryKey: z.string(),
        valueColumn: z.string(),
        categoryColumn: z.string().nullable(),
        title: z.string().nullable(),
        colorPalette: z.string().nullable(),
      }),
      description:
        "Display box plot showing statistical distribution (min, Q1, median, Q3, max, outliers). valueColumn is the numeric data. Optional categoryColumn for grouped box plots.",
    },

    StackedChart: {
      props: z.object({
        type: z.enum(["bar", "area"]),
        queryKey: z.string(),
        categoryColumn: z.string(),
        seriesColumn: z.string(),
        valueColumn: z.string(),
        title: z.string().nullable(),
        colorPalette: z.string().nullable(),
        normalized: z.boolean().nullable(),
      }),
      description:
        "Display stacked bar or area chart for multi-series data. categoryColumn is the X axis, seriesColumn groups the stacks, valueColumn is the measure. Set normalized=true for 100% stacked charts.",
    },

    DonutChart: {
      props: z.object({
        queryKey: z.string(),
        labelColumn: z.string(),
        valueColumn: z.string(),
        title: z.string().nullable(),
        innerRadius: z.number().min(0).max(1).nullable(),
        centerLabel: z.string().nullable(),
        centerValue: z.enum(["total", "average", "max"]).nullable(),
        colorPalette: z.string().nullable(),
      }),
      description:
        "Donut chart with optional center metric. Use for part-to-whole relationships with a summary KPI in the center. innerRadius controls the hole size (0=pie, 0.6=default donut, 1=ring).",
    },

    MultiLineChart: {
      props: z.object({
        queryKey: z.string(),
        xColumn: z.string(),
        yColumn: z.string(),
        seriesColumn: z.string(),
        title: z.string().nullable(),
        colorPalette: z.string().nullable(),
        showPoints: z.boolean().nullable(),
        smooth: z.boolean().nullable(),
      }),
      description:
        "Multi-line chart for comparing multiple time series. xColumn is the X axis (usually date/time), yColumn is the value, seriesColumn groups lines. Use for trend comparison across categories.",
    },

    GaugeChart: {
      props: z.object({
        queryKey: z.string(),
        valueColumn: z.string(),
        title: z.string().nullable(),
        min: z.number().nullable(),
        max: z.number().nullable(),
        target: z.number().nullable(),
        thresholds: z.object({
          warning: z.number().nullable(),
          danger: z.number().nullable(),
        }).nullable(),
        format: z.enum(["number", "percent", "currency"]).nullable(),
      }),
      description:
        "Radial gauge for KPI visualization. Shows progress as an arc with optional color zones (green/yellow/red for good/warning/critical). Use thresholds to define zone boundaries.",
    },

    FunnelChart: {
      props: z.object({
        queryKey: z.string(),
        stageColumn: z.string(),
        valueColumn: z.string(),
        title: z.string().nullable(),
        orientation: z.enum(["vertical", "horizontal"]).nullable(),
        showPercentage: z.boolean().nullable(),
        colorPalette: z.string().nullable(),
      }),
      description:
        "Funnel chart for conversion pipeline visualization. Shows stages narrowing from top to bottom with conversion rates between stages. Use for sales funnels, user journeys, process completion.",
    },

    Treemap: {
      props: z.object({
        queryKey: z.string(),
        categoryColumn: z.string(),
        subcategoryColumn: z.string().nullable(),
        valueColumn: z.string(),
        title: z.string().nullable(),
        colorPalette: z.string().nullable(),
      }),
      description:
        "Treemap for hierarchical proportional area visualization. Each rectangle's area is proportional to its value. Use for budget breakdown, sales by category, market share visualization.",
    },

    WaterfallChart: {
      props: z.object({
        queryKey: z.string(),
        categoryColumn: z.string().nullable(),
        labelColumn: z.string().nullable(),
        valueColumn: z.string(),
        title: z.string().nullable(),
        colorPalette: z.string().nullable(),
        showTotal: z.boolean().nullable(),
        showConnectors: z.boolean().nullable(),
      }),
      description:
        "Waterfall chart showing cumulative effect of sequential positive/negative values. Use for financial analysis, variance reports, and cost breakdowns. Green bars for positive changes, red for negative, with optional total bar. Use categoryColumn (or labelColumn) for category names and valueColumn for delta values.",
    },

    RadarChart: {
      props: z.object({
        queryKey: z.string(),
        dimensionColumn: z.string().nullable(),
        categoryColumn: z.string().nullable(),
        labelColumn: z.string().nullable(),
        valueColumn: z.string(),
        seriesColumn: z.string().nullable(),
        title: z.string().nullable(),
        colorPalette: z.string().nullable(),
        maxValue: z.number().nullable(),
        showGrid: z.boolean().nullable(),
        fillArea: z.boolean().nullable(),
      }),
      description:
        "Radar/spider chart for multi-dimensional comparison. Use for comparing entities across multiple metrics (skills, features, ratings). Use dimensionColumn (or categoryColumn/labelColumn) for metric names, valueColumn for values, optional seriesColumn for comparing multiple entities.",
    },

    BulletChart: {
      props: z.object({
        queryKey: z.string(),
        actualColumn: z.string().nullable(),
        valueColumn: z.string().nullable(),
        valuePath: z.string().nullable(),
        targetColumn: z.string().nullable(),
        target: z.number().nullable(),
        title: z.string().nullable(),
        min: z.number().nullable(),
        max: z.number().nullable(),
        ranges: z
          .object({
            poor: z.number().nullable(),
            satisfactory: z.number().nullable(),
            good: z.number().nullable(),
          })
          .nullable(),
        orientation: z.enum(["horizontal", "vertical"]).nullable(),
        format: z.enum(["number", "percent", "currency"]).nullable(),
      }),
      description:
        "Compact bullet chart for KPI visualization. Shows actual vs target with qualitative ranges (poor/satisfactory/good). Use actualColumn (or valueColumn/valuePath) for the metric, targetColumn or static target for comparison. Space-efficient alternative to gauge charts.",
    },

    // Filter Components
    Filter: {
      props: z.object({
        filterId: z.string(),
        filterType: z.enum(["date-range", "dropdown"]),
        label: z.string(),
        column: z.string(),
        options: z.array(z.string()).nullable(),
        multiSelect: z.boolean().nullable(),
        defaultPreset: z
          .enum(["last7days", "last30days", "last90days", "ytd", "custom"])
          .nullable(),
      }),
      description:
        "Dashboard filter component. Use date-range for date columns, dropdown for categorical columns. Filters affect all queries via {{column_name}} placeholders.",
    },

    // Typography
    Heading: {
      props: z.object({
        text: z.string(),
        level: z.enum(["h1", "h2", "h3", "h4"]).nullable(),
      }),
      description: "Section heading",
    },

    Text: {
      props: z.object({
        content: z.string(),
        variant: z.enum(["body", "caption", "label"]).nullable(),
        color: z
          .enum(["default", "muted", "success", "warning", "danger"])
          .nullable(),
      }),
      description: "Text paragraph",
    },

    Insight: {
      props: z.object({
        content: z.string(),
        type: z
          .enum(["default", "positive", "negative", "warning", "info"])
          .nullable(),
      }),
      description:
        "Display a styled insight or analysis callout. Use for chart interpretations, data insights, and key takeaways. Types: 'positive' for good trends (green), 'negative' for concerning trends (red), 'warning' for caution (yellow), 'info' for neutral information (blue), 'default' for general insights (purple).",
    },

    // Status Components
    Badge: {
      props: z.object({
        text: z.string(),
        variant: z
          .enum(["default", "success", "warning", "danger", "info"])
          .nullable(),
      }),
      description: "Small status badge",
    },

    Alert: {
      props: z.object({
        type: z.enum(["info", "success", "warning", "error"]),
        title: z.string(),
        message: z.string().nullable(),
        dismissible: z.boolean().nullable(),
      }),
      description: "Alert/notification banner",
    },

    // Special Components
    Divider: {
      props: z.object({
        label: z.string().nullable(),
      }),
      description: "Visual divider",
    },

    Empty: {
      props: z.object({
        title: z.string(),
        description: z.string().nullable(),
        action: z.string().nullable(),
        actionLabel: z.string().nullable(),
      }),
      description: "Empty state placeholder",
    },
  },
  actions: {
    refresh_data: { description: "Refresh all SQL queries and data" },
    export_csv: { description: "Export current data to CSV" },
  },
  validation: "strict",
});

// Export the component list for the AI prompt
export const componentList = sqlDashboardCatalog.componentNames as string[];
