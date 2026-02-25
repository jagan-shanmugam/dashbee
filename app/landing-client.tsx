"use client";

import Link from "next/link";
import {
  DataProvider,
  VisibilityProvider,
  ActionProvider,
  Renderer,
} from "@json-render/react";
import type { UITree, UIElement } from "@json-render/core";
import { componentRegistry } from "@/components/ui";
import { ThemeToggle } from "@/components/theme-toggle";
import type { LandingPageData } from "@/lib/landing-data";

interface LandingPageClientProps {
  data: LandingPageData;
}

/**
 * Helper to build a flat UITree from nested structure
 */
function buildUITree(
  node: {
    type: string;
    props: Record<string, unknown>;
    children?: Array<{
      type: string;
      props: Record<string, unknown>;
      children?: unknown[];
    }>;
  },
  keyPrefix = "el"
): UITree {
  const elements: Record<string, UIElement> = {};
  let keyCounter = 0;

  function addElement(
    node: {
      type: string;
      props: Record<string, unknown>;
      children?: unknown[];
    },
    parentKey: string | null = null
  ): string {
    const key = `${keyPrefix}_${keyCounter++}`;
    const childKeys: string[] = [];

    if (node.children && Array.isArray(node.children)) {
      for (const child of node.children) {
        if (typeof child === "object" && child !== null && "type" in child) {
          const childKey = addElement(
            child as { type: string; props: Record<string, unknown>; children?: unknown[] },
            key
          );
          childKeys.push(childKey);
        }
      }
    }

    elements[key] = {
      key,
      type: node.type,
      props: node.props,
      children: childKeys.length > 0 ? childKeys : undefined,
      parentKey,
    };

    return key;
  }

  const rootKey = addElement(node);

  return {
    root: rootKey,
    elements,
  };
}

export function LandingPageClient({ data }: LandingPageClientProps) {
  // Transform landing page data into query format expected by components
  const initialData = {
    queries: {
      kpi_customers: [{ value: data.kpis.customers }],
      kpi_orders: [{ value: data.kpis.orders }],
      kpi_revenue: [{ value: data.kpis.revenue }],
      kpi_products: [{ value: data.kpis.products }],
      revenue_by_region: data.revenueByRegion,
      daily_revenue: data.dailyRevenue,
      top_products: data.topProducts,
      store_locations: data.storeLocations,
      category_region_sales: data.categoryRegionSales,
      product_scatter: data.productScatter,
    },
  };

  // Define UI tree for dashboard visualization (nested for readability, then flatten)
  const treeDefinition = {
    type: "Stack",
    props: { spacing: 32 },
    children: [
      // KPI Grid - 4 metrics in a row
      {
        type: "Grid",
        props: { columns: 4, gap: 16 },
        children: [
          {
            type: "Card",
            props: {},
            children: [
              {
                type: "Metric",
                props: {
                  label: "Total Customers",
                  queryKey: "kpi_customers",
                  valuePath: "value",
                },
              },
            ],
          },
          {
            type: "Card",
            props: {},
            children: [
              {
                type: "Metric",
                props: {
                  label: "Total Orders",
                  queryKey: "kpi_orders",
                  valuePath: "value",
                },
              },
            ],
          },
          {
            type: "Card",
            props: {},
            children: [
              {
                type: "Metric",
                props: {
                  label: "Total Revenue",
                  queryKey: "kpi_revenue",
                  valuePath: "value",
                  format: "currency",
                },
              },
            ],
          },
          {
            type: "Card",
            props: {},
            children: [
              {
                type: "Metric",
                props: {
                  label: "Products Sold",
                  queryKey: "kpi_products",
                  valuePath: "value",
                },
              },
            ],
          },
        ],
      },
      // Charts Row 1: Bar + Line
      {
        type: "Grid",
        props: { columns: 2, gap: 16 },
        children: [
          {
            type: "Card",
            props: {},
            children: [
              {
                type: "Chart",
                props: {
                  type: "bar",
                  queryKey: "revenue_by_region",
                  labelColumn: "region",
                  valueColumn: "revenue",
                  title: "Revenue by Region",
                },
              },
            ],
          },
          {
            type: "Card",
            props: {},
            children: [
              {
                type: "Chart",
                props: {
                  type: "line",
                  queryKey: "daily_revenue",
                  labelColumn: "date",
                  valueColumn: "revenue",
                  title: "Daily Revenue Trend (30 Days)",
                },
              },
            ],
          },
        ],
      },
      // Charts Row 2: Heatmap + Scatter
      {
        type: "Grid",
        props: { columns: 2, gap: 16 },
        children: [
          {
            type: "Card",
            props: {},
            children: [
              {
                type: "Heatmap",
                props: {
                  variant: "matrix",
                  queryKey: "category_region_sales",
                  rowColumn: "category",
                  colColumn: "region",
                  valueColumn: "revenue",
                  title: "Sales by Category & Region",
                  colorScale: "blue",
                },
              },
            ],
          },
          {
            type: "Card",
            props: {},
            children: [
              {
                type: "Scatter",
                props: {
                  queryKey: "product_scatter",
                  xColumn: "price",
                  yColumn: "units_sold",
                  labelColumn: "name",
                  title: "Price vs Units Sold",
                },
              },
            ],
          },
        ],
      },
      // Table: Top Products
      {
        type: "Card",
        props: {},
        children: [
          {
            type: "Table",
            props: {
              queryKey: "top_products",
              title: "Top Selling Products",
              columns: [
                { key: "name", label: "Product Name" },
                { key: "category", label: "Category" },
                { key: "units_sold", label: "Units Sold" },
                { key: "revenue", label: "Revenue", format: "currency" },
              ],
            },
          },
        ],
      },
      // Map: Store Locations
      {
        type: "Card",
        props: {},
        children: [
          {
            type: "MapChart",
            props: {
              variant: "points",
              queryKey: "store_locations",
              latColumn: "lat",
              lngColumn: "lng",
              labelColumn: "name",
              valueColumn: "revenue",
              title: "Store Locations",
              colorScale: "blue",
            },
          },
        ],
      },
    ],
  };

  // Convert to flat UITree structure
  const uiTree = buildUITree(treeDefinition);

  return (
    <div className="landing-container">
      {/* Header */}
      <header className="landing-header">
        <div className="landing-header-inner">
          <Link href="/" className="landing-logo">
            <span className="logo-icon">🐝</span>
            <span className="logo-text">DashBee</span>
          </Link>
          <div className="landing-header-actions">
            <ThemeToggle />
            <Link href="/dashboard" className="cta-button-small">
              Open App
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <h1 className="hero-title">
          Get Insights Instantly from Your Data
        </h1>
        <p className="hero-subtitle">
          Connect databases with millions of rows, ask your business questions,
          and get interactive dashboards in seconds.
        </p>
        <div className="cta-group">
          <Link href="/dashboard" className="cta-button">
            Generate Your Dashboard
          </Link>
          <a href="#demo" className="cta-button-secondary">
            See it in action ↓
          </a>
        </div>
      </section>

      {/* Dashboard Demo */}
      <section id="demo" className="landing-content">
        <div className="demo-label">
          <span className="demo-badge">Live Demo</span>
          <span className="demo-text">Sample E-Commerce Dashboard (from database)</span>
        </div>
        <DataProvider initialData={initialData}>
          <VisibilityProvider>
            <ActionProvider handlers={{}}>
              <Renderer tree={uiTree} registry={componentRegistry} />
            </ActionProvider>
          </VisibilityProvider>
        </DataProvider>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <a
          href="https://github.com/jagan-shanmugam/dashbee"
          target="_blank"
          rel="noopener noreferrer"
          className="github-link"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="currentColor"
            style={{ marginRight: 8 }}
          >
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
          Open Source on GitHub
        </a>
      </footer>
    </div>
  );
}
