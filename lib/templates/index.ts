/**
 * Dashboard Templates
 *
 * Pre-built dashboard structures for common use cases.
 * The AI adapts these templates to the user's actual database schema.
 */

export interface TemplateSection {
  name: string;
  type: "metric" | "chart" | "table";
  description: string;
  chartType?: "bar" | "line" | "pie" | "area" | "heatmap";
  heatmapVariant?: "calendar" | "matrix";
}

export interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: "sales" | "marketing" | "operations" | "analytics";
  sections: TemplateSection[];
  suggestedFilters: Array<{
    type: "date-range" | "dropdown";
    suggestedColumn: string;
    label: string;
  }>;
}

/**
 * Sales Dashboard Template
 * Revenue metrics, trends, top products, recent orders
 */
export const salesTemplate: DashboardTemplate = {
  id: "sales",
  name: "Sales Dashboard",
  description: "Revenue metrics, trends, top products, and recent orders",
  icon: "💰",
  category: "sales",
  sections: [
    {
      name: "Total Revenue",
      type: "metric",
      description: "Sum of all order amounts or sales revenue",
    },
    {
      name: "Order Count",
      type: "metric",
      description: "Total number of orders or transactions",
    },
    {
      name: "Average Order Value",
      type: "metric",
      description: "Average amount per order (revenue / orders)",
    },
    {
      name: "Revenue Trend",
      type: "chart",
      chartType: "line",
      description:
        "Revenue over time (daily/weekly/monthly) showing sales trends",
    },
    {
      name: "Top Products",
      type: "chart",
      chartType: "bar",
      description: "Best-selling products by revenue or quantity",
    },
    {
      name: "Sales by Category",
      type: "chart",
      chartType: "pie",
      description: "Revenue distribution across product categories",
    },
    {
      name: "Recent Orders",
      type: "table",
      description:
        "Latest orders with customer, amount, date, and status columns",
    },
  ],
  suggestedFilters: [
    {
      type: "date-range",
      suggestedColumn: "created_at",
      label: "Date Range",
    },
    {
      type: "dropdown",
      suggestedColumn: "status",
      label: "Order Status",
    },
    {
      type: "dropdown",
      suggestedColumn: "region",
      label: "Region",
    },
  ],
};

/**
 * Marketing Dashboard Template
 * Campaign performance, conversions, traffic sources
 */
export const marketingTemplate: DashboardTemplate = {
  id: "marketing",
  name: "Marketing Dashboard",
  description: "Campaign performance, conversions, and traffic analysis",
  icon: "📈",
  category: "marketing",
  sections: [
    {
      name: "Total Visitors",
      type: "metric",
      description: "Total unique visitors or page views",
    },
    {
      name: "Conversion Rate",
      type: "metric",
      description:
        "Percentage of visitors who completed desired action (signups, purchases)",
    },
    {
      name: "Total Conversions",
      type: "metric",
      description: "Number of completed conversions or signups",
    },
    {
      name: "Traffic Trend",
      type: "chart",
      chartType: "area",
      description: "Visitor traffic over time showing growth patterns",
    },
    {
      name: "Traffic Sources",
      type: "chart",
      chartType: "pie",
      description:
        "Distribution of traffic by source (organic, paid, social, referral)",
    },
    {
      name: "Campaign Performance",
      type: "chart",
      chartType: "bar",
      description: "Comparison of campaigns by conversions or revenue",
    },
    {
      name: "Activity Heatmap",
      type: "chart",
      chartType: "heatmap",
      heatmapVariant: "calendar",
      description: "Daily activity pattern showing engagement over time",
    },
    {
      name: "Campaign Details",
      type: "table",
      description:
        "Campaign list with name, impressions, clicks, conversions, and ROI",
    },
  ],
  suggestedFilters: [
    {
      type: "date-range",
      suggestedColumn: "date",
      label: "Date Range",
    },
    {
      type: "dropdown",
      suggestedColumn: "source",
      label: "Traffic Source",
    },
    {
      type: "dropdown",
      suggestedColumn: "campaign",
      label: "Campaign",
    },
  ],
};

/**
 * Operations Dashboard Template
 * Status breakdown, SLAs, throughput, activity
 */
export const operationsTemplate: DashboardTemplate = {
  id: "operations",
  name: "Operations Dashboard",
  description: "Status tracking, SLA metrics, and operational throughput",
  icon: "⚙️",
  category: "operations",
  sections: [
    {
      name: "Open Tasks",
      type: "metric",
      description: "Count of tasks/tickets in open or pending status",
    },
    {
      name: "Completed Today",
      type: "metric",
      description: "Tasks completed in the last 24 hours",
    },
    {
      name: "Average Resolution Time",
      type: "metric",
      description: "Average time to resolve tasks or tickets",
    },
    {
      name: "Status Breakdown",
      type: "chart",
      chartType: "pie",
      description:
        "Distribution of items by status (open, in progress, closed)",
    },
    {
      name: "Throughput Trend",
      type: "chart",
      chartType: "area",
      description: "Volume of completed tasks over time",
    },
    {
      name: "Priority Distribution",
      type: "chart",
      chartType: "bar",
      description: "Tasks grouped by priority level (high, medium, low)",
    },
    {
      name: "Activity by Day/Hour",
      type: "chart",
      chartType: "heatmap",
      heatmapVariant: "matrix",
      description: "Activity heatmap showing busy periods (day × hour)",
    },
    {
      name: "Recent Activity",
      type: "table",
      description:
        "Latest tasks with assignee, status, priority, and timestamp",
    },
  ],
  suggestedFilters: [
    {
      type: "date-range",
      suggestedColumn: "created_at",
      label: "Date Range",
    },
    {
      type: "dropdown",
      suggestedColumn: "status",
      label: "Status",
    },
    {
      type: "dropdown",
      suggestedColumn: "priority",
      label: "Priority",
    },
    {
      type: "dropdown",
      suggestedColumn: "assignee",
      label: "Assignee",
    },
  ],
};

/**
 * Analytics Dashboard Template
 * User behavior, engagement metrics, performance analysis
 */
export const analyticsTemplate: DashboardTemplate = {
  id: "analytics",
  name: "Analytics Dashboard",
  description: "User behavior, engagement metrics, and performance analysis",
  icon: "📊",
  category: "analytics",
  sections: [
    {
      name: "Active Users",
      type: "metric",
      description: "Count of active users in selected period",
    },
    {
      name: "Sessions",
      type: "metric",
      description: "Total number of user sessions",
    },
    {
      name: "Avg Session Duration",
      type: "metric",
      description: "Average time users spend per session",
    },
    {
      name: "User Growth",
      type: "chart",
      chartType: "line",
      description: "New user signups over time",
    },
    {
      name: "Daily Activity",
      type: "chart",
      chartType: "heatmap",
      heatmapVariant: "calendar",
      description: "GitHub-style activity heatmap showing engagement",
    },
    {
      name: "Feature Usage",
      type: "chart",
      chartType: "bar",
      description: "Most used features or pages",
    },
    {
      name: "User Segments",
      type: "chart",
      chartType: "pie",
      description: "Users grouped by type, plan, or cohort",
    },
    {
      name: "Top Users",
      type: "table",
      description: "Most active users with activity metrics",
    },
  ],
  suggestedFilters: [
    {
      type: "date-range",
      suggestedColumn: "timestamp",
      label: "Date Range",
    },
    {
      type: "dropdown",
      suggestedColumn: "user_type",
      label: "User Type",
    },
  ],
};

/**
 * All available templates
 */
export const templates: DashboardTemplate[] = [
  salesTemplate,
  marketingTemplate,
  operationsTemplate,
  analyticsTemplate,
];
