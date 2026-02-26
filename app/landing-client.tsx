"use client";

import Link from "next/link";
import React, { useState } from "react";
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

// Logo SVG Component - Hexagon with data grid pattern
function LogoIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M16 2L28.5 9.5V24.5L16 32L3.5 24.5V9.5L16 2Z"
        fill="url(#logo-gradient)"
      />
      <path
        d="M10 12H14V16H10V12Z"
        fill="white"
        fillOpacity="0.9"
      />
      <path
        d="M18 12H22V16H18V12Z"
        fill="white"
        fillOpacity="0.7"
      />
      <path
        d="M10 18H14V22H10V18Z"
        fill="white"
        fillOpacity="0.7"
      />
      <path
        d="M18 18H22V22H18V18Z"
        fill="white"
        fillOpacity="0.9"
      />
      <defs>
        <linearGradient id="logo-gradient" x1="3.5" y1="2" x2="28.5" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0ea5e9" />
          <stop offset="1" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// Chevron Down Icon
function ChevronDown() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

// Check Icon
function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// GitHub Icon
function GitHubIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

// Twitter/X Icon
function TwitterIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

// Analytics Icon (chart bars)
function AnalyticsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

// Lightning/Bolt Icon
function BoltIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

// Users Icon
function UsersIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

// Package/Box Icon
function PackageIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m7.5 4.27 9 5.15" />
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  );
}

// Sparkles Icon
function SparklesIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  );
}

// Layers Icon (for interactive)
function LayersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}

// Refresh Icon
function RefreshIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  );
}

// Lock Icon
function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

// Star Icon (unused but kept for potential future use)
function _StarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

// Data Teams Chart - Query Performance Line Chart
function DataTeamsChart() {
  const data = [
    { month: "Jan", traditional: 45, dashbee: 8 },
    { month: "Feb", traditional: 52, dashbee: 6 },
    { month: "Mar", traditional: 48, dashbee: 5 },
    { month: "Apr", traditional: 61, dashbee: 4 },
    { month: "May", traditional: 55, dashbee: 3 },
    { month: "Jun", traditional: 67, dashbee: 2 },
  ];

  const width = 400;
  const height = 280;
  const padding = { top: 40, right: 30, bottom: 50, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxVal = Math.max(...data.map(d => Math.max(d.traditional, d.dashbee)));
  const yScale = (val: number) => chartHeight - (val / maxVal) * chartHeight;
  const xScale = (i: number) => (i / (data.length - 1)) * chartWidth;

  const traditionalPath = data.map((d, i) =>
    `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(d.traditional)}`
  ).join(' ');

  const dashbeePath = data.map((d, i) =>
    `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(d.dashbee)}`
  ).join(' ');

  return (
    <div style={{ background: 'var(--card)', borderRadius: 'var(--radius)', padding: '24px', border: '1px solid var(--border)' }}>
      <div style={{ marginBottom: '16px' }}>
        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--foreground)' }}>
          Time to Insight (minutes)
        </h4>
        <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--muted)' }}>
          Traditional BI tools vs DashBee
        </p>
      </div>
      <svg width={width} height={height} style={{ display: 'block' }}>
        <defs>
          <linearGradient id="trad-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--muted)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--muted)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="dashbee-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g transform={`translate(${padding.left}, ${padding.top})`}>
          {/* Grid lines */}
          {[0, 20, 40, 60].map(tick => (
            <g key={tick}>
              <line x1={0} y1={yScale(tick)} x2={chartWidth} y2={yScale(tick)} stroke="var(--border)" strokeDasharray="4 4" />
              <text x={-10} y={yScale(tick) + 4} textAnchor="end" fill="var(--muted)" fontSize="11">{tick}</text>
            </g>
          ))}
          {/* Traditional area fill */}
          <path d={`${traditionalPath} L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`} fill="url(#trad-gradient)" />
          {/* DashBee area fill */}
          <path d={`${dashbeePath} L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`} fill="url(#dashbee-gradient)" />
          {/* Traditional line */}
          <path d={traditionalPath} fill="none" stroke="var(--muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          {/* DashBee line */}
          <path d={dashbeePath} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          {/* Data points */}
          {data.map((d, i) => (
            <g key={i}>
              <circle cx={xScale(i)} cy={yScale(d.traditional)} r="4" fill="var(--card)" stroke="var(--muted)" strokeWidth="2" />
              <circle cx={xScale(i)} cy={yScale(d.dashbee)} r="4" fill="var(--card)" stroke="var(--primary)" strokeWidth="2" />
              <text x={xScale(i)} y={chartHeight + 20} textAnchor="middle" fill="var(--muted)" fontSize="11">{d.month}</text>
            </g>
          ))}
        </g>
      </svg>
      <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', marginTop: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: 12, height: 3, background: 'var(--muted)', borderRadius: 2 }} />
          <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Traditional BI</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: 12, height: 3, background: 'var(--primary)', borderRadius: 2 }} />
          <span style={{ fontSize: '12px', color: 'var(--muted)' }}>DashBee</span>
        </div>
      </div>
    </div>
  );
}

// Developers Chart - Deployment Options Bar Chart
function DevelopersChart() {
  const data = [
    { label: "Docker", value: 85, color: "var(--signal-teal)" },
    { label: "npm/pnpm", value: 95, color: "var(--primary)" },
    { label: "Vercel", value: 70, color: "var(--signal-purple)" },
    { label: "K8s", value: 60, color: "var(--signal-coral)" },
  ];

  const maxVal = Math.max(...data.map(d => d.value));

  return (
    <div style={{ background: 'var(--card)', borderRadius: 'var(--radius)', padding: '24px', border: '1px solid var(--border)' }}>
      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--foreground)' }}>
          Self-Host Anywhere
        </h4>
        <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--muted)' }}>
          Deploy on your infrastructure in minutes
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {data.map((item, i) => (
          <div key={i}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--foreground)' }}>{item.label}</span>
              <span style={{ fontSize: '13px', color: 'var(--muted)' }}>{item.value}% satisfaction</span>
            </div>
            <div style={{ height: '10px', background: 'var(--border)', borderRadius: '5px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${(item.value / maxVal) * 100}%`,
                  background: item.color,
                  borderRadius: '5px',
                  transition: 'width 0.5s ease'
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: '20px', padding: '16px', background: 'var(--background)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
        <code style={{ fontSize: '13px', color: 'var(--primary)', fontFamily: 'monospace' }}>
          docker run -p 3000:3000 dashbee/dashbee
        </code>
      </div>
    </div>
  );
}

// Founders Chart - KPI Dashboard
function FoundersChart() {
  const revenueData = [32, 45, 38, 52, 61, 58, 72, 85, 78, 92, 105, 118];
  const months = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

  const maxVal = Math.max(...revenueData);
  const width = 400;
  const height = 120;
  const barWidth = (width - 40) / revenueData.length - 4;

  return (
    <div style={{ background: 'var(--card)', borderRadius: 'var(--radius)', padding: '24px', border: '1px solid var(--border)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ padding: '16px', background: 'var(--pastel-teal)', borderRadius: 'var(--radius-sm)' }}>
          <p style={{ margin: 0, fontSize: '12px', fontWeight: 500, color: '#0f766e' }}>Monthly Revenue</p>
          <p style={{ margin: '4px 0 0', fontSize: '24px', fontWeight: 600, color: '#0f766e', fontFamily: 'var(--font-serif)' }}>$118K</p>
          <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#0f766e' }}>↑ 12% vs last month</p>
        </div>
        <div style={{ padding: '16px', background: 'var(--pastel-coral)', borderRadius: 'var(--radius-sm)' }}>
          <p style={{ margin: 0, fontSize: '12px', fontWeight: 500, color: '#c2410c' }}>Active Users</p>
          <p style={{ margin: '4px 0 0', fontSize: '24px', fontWeight: 600, color: '#c2410c', fontFamily: 'var(--font-serif)' }}>8.4K</p>
          <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#c2410c' }}>↑ 24% vs last month</p>
        </div>
        <div style={{ padding: '16px', background: 'var(--pastel-purple)', borderRadius: 'var(--radius-sm)' }}>
          <p style={{ margin: 0, fontSize: '12px', fontWeight: 500, color: '#7c3aed' }}>Conversion</p>
          <p style={{ margin: '4px 0 0', fontSize: '24px', fontWeight: 600, color: '#7c3aed', fontFamily: 'var(--font-serif)' }}>4.2%</p>
          <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#7c3aed' }}>↑ 0.8% vs last month</p>
        </div>
      </div>
      <div>
        <p style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 500, color: 'var(--muted)' }}>Revenue Trend (2024)</p>
        <svg width={width} height={height} style={{ display: 'block' }}>
          {revenueData.map((val, i) => (
            <g key={i}>
              <rect
                x={20 + i * (barWidth + 4)}
                y={height - 24 - (val / maxVal) * (height - 40)}
                width={barWidth}
                height={(val / maxVal) * (height - 40)}
                fill={i === revenueData.length - 1 ? 'var(--signal-green)' : 'var(--primary)'}
                opacity={i === revenueData.length - 1 ? 1 : 0.6}
                rx={3}
              />
              <text
                x={20 + i * (barWidth + 4) + barWidth / 2}
                y={height - 6}
                textAnchor="middle"
                fill="var(--muted)"
                fontSize="10"
              >
                {months[i]}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

// Persona charts map
const personaCharts: Record<string, () => React.ReactNode> = {
  "data-teams": DataTeamsChart,
  "developers": DevelopersChart,
  "founders": FoundersChart,
};

// Feature ticker items
const tickerItems = [
  { label: "Natural Language Queries", color: "teal" },
  { label: "Multi-Database Support", color: "coral" },
  { label: "Interactive Charts", color: "purple" },
  { label: "Real-time Analytics", color: "green" },
  { label: "Export to PDF", color: "pink" },
  { label: "Dark Mode", color: "teal" },
  { label: "Type-safe Components", color: "coral" },
  { label: "AI-Powered Insights", color: "purple" },
  { label: "Custom Visualizations", color: "green" },
  { label: "PostgreSQL", color: "pink" },
  { label: "MySQL", color: "teal" },
  { label: "SQLite", color: "coral" },
];

// Features data
const features = [
  {
    id: "natural-language",
    title: "Ask Questions in Plain English",
    color: "teal",
    description: "Skip the SQL complexity. Just describe what you want to know about your data, and DashBee generates the perfect visualization instantly.",
  },
  {
    id: "multi-database",
    title: "Connect Any Database",
    color: "coral",
    description: "PostgreSQL, MySQL, SQLite - connect your existing databases in seconds. No data migration required. Your data stays where it belongs.",
  },
  {
    id: "interactive-charts",
    title: "Rich Interactive Visualizations",
    color: "purple",
    description: "From bar charts to heatmaps, scatter plots to geographic maps. Every visualization is interactive and customizable out of the box.",
  },
  {
    id: "type-safe",
    title: "Type-Safe by Default",
    color: "green",
    description: "Built with TypeScript from the ground up. Catch errors before they happen with full type safety across your entire dashboard.",
  },
];

// Personas data - ordered by primary audience
const personas = [
  {
    id: "data-teams",
    label: "Data Teams",
    title: "From SQL to insights in seconds",
    description: "Connect your data warehouse and let AI translate business questions into optimized queries. No more waiting for engineering bandwidth.",
    benefits: [
      "Natural language to SQL",
      "Multi-database support",
      "Automatic query optimization",
      "Real-time data refresh",
    ],
  },
  {
    id: "developers",
    label: "Developers",
    title: "Self-host on your own infrastructure",
    description: "Deploy DashBee anywhere — Docker, Kubernetes, Vercel, or bare metal. Your data never leaves your servers. Full control, zero vendor lock-in.",
    benefits: [
      "One-command Docker deploy",
      "100% open source (MIT)",
      "No external dependencies",
      "TypeScript-first, extensible",
    ],
  },
  {
    id: "founders",
    label: "Founders",
    title: "Know your numbers, make better decisions",
    description: "Get a bird's eye view of your business metrics without hiring a data team. Ask questions, get answers, take action.",
    benefits: [
      "Self-service analytics",
      "No SQL knowledge required",
      "Export reports for investors",
      "Track KPIs automatically",
    ],
  },
];

// Bento stats
const bentoStats = [
  { stat: "10x", label: "Faster dashboard creation", color: "teal" },
  { stat: "0", label: "Lines of chart code needed", color: "coral" },
  { stat: "3", label: "Database types supported", color: "purple" },
  { stat: "2", label: "File formats supported for analytics", color: "blue" },
  { stat: "∞", label: "Questions you can ask", color: "pink", span: true },
  { stat: "100%", label: "Open source & free", color: "green" },
  { stat: "<60s", label: "Average query response", color: "yellow" },
];

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
  const [activeFeature, setActiveFeature] = useState("natural-language");
  const [activePersona, setActivePersona] = useState("data-teams");

  // Newsletter form state
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitStatus({ type: null, message: "" });

    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "landing_hero" }),
      });

      const result = await response.json();

      if (result.success) {
        setSubmitStatus({ type: "success", message: result.message });
        setEmail(""); // Clear input on success
      } else {
        setSubmitStatus({ type: "error", message: result.error });
      }
    } catch {
      setSubmitStatus({
        type: "error",
        message: "Connection failed. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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

  // Define UI tree for dashboard visualization
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
    ],
  };

  // Convert to flat UITree structure
  const uiTree = buildUITree(treeDefinition);

  const currentPersona = personas.find((p) => p.id === activePersona) || personas[0];

  return (
    <div className="landing-container">
      {/* Floating Header */}
      <header className="landing-header">
        <div className="landing-header-inner">
          <Link href="/" className="landing-logo">
            <span className="logo-icon">
              <LogoIcon />
            </span>
            <span className="logo-text">DashBee</span>
          </Link>

          <nav className="landing-nav">
            <div className="nav-dropdown">
              <button className="nav-dropdown-trigger">
                Product
                <ChevronDown />
              </button>
              <div className="nav-dropdown-menu">
                <div className="dropdown-list">
                  <a href="#features" className="dropdown-item">
                    <span className="dropdown-icon teal">
                      <AnalyticsIcon />
                    </span>
                    <div className="dropdown-content">
                      <span className="dropdown-title">Analytics</span>
                      <span className="dropdown-desc">AI-powered insights from your data</span>
                    </div>
                  </a>
                  <a href="#demo" className="dropdown-item">
                    <span className="dropdown-icon coral">
                      <BoltIcon />
                    </span>
                    <div className="dropdown-content">
                      <span className="dropdown-title">Live Demo</span>
                      <span className="dropdown-desc">See a working dashboard in action</span>
                    </div>
                  </a>
                  <a href="#personas" className="dropdown-item">
                    <span className="dropdown-icon purple">
                      <UsersIcon />
                    </span>
                    <div className="dropdown-content">
                      <span className="dropdown-title">Use Cases</span>
                      <span className="dropdown-desc">Built for data teams and developers</span>
                    </div>
                  </a>
                  <a href="https://github.com/jagan-shanmugam/dashbee" className="dropdown-item" target="_blank" rel="noopener noreferrer">
                    <span className="dropdown-icon green">
                      <PackageIcon />
                    </span>
                    <div className="dropdown-content">
                      <span className="dropdown-title">Open Source</span>
                      <span className="dropdown-desc">MIT Licensed, free forever</span>
                    </div>
                  </a>
                </div>
              </div>
            </div>
            <a href="#demo" className="nav-link">Demo</a>
            <a href="https://github.com/jagan-shanmugam/dashbee" className="nav-link" target="_blank" rel="noopener noreferrer">GitHub</a>
          </nav>

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
        <div className="hero-badge">
          <span className="hero-badge-new">New</span>
          <span>Gemini AI provider now available</span>
        </div>

        <h1 className="hero-title">
          Transform <em>Data</em> into
          <br />
          <em>Decisions</em>
        </h1>

        <p className="hero-subtitle">
          Connect databases with millions of rows, ask your business questions in plain English,
          and get interactive dashboards in seconds.
        </p>

        <form className="hero-form" onSubmit={handleNewsletterSubmit}>
          <div className="hero-input-group">
            <input
              type="email"
              className="hero-input"
              placeholder="Enter your email for updates"
              aria-label="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
            />
            <button
              type="submit"
              className="cta-button"
              disabled={isSubmitting || !email.trim()}
              style={{ opacity: isSubmitting || !email.trim() ? 0.7 : 1 }}
            >
              {isSubmitting ? "Subscribing..." : "Get Updates"}
            </button>
          </div>
          {submitStatus.type && (
            <p
              style={{
                margin: 0,
                fontSize: 14,
                fontWeight: 500,
                color: submitStatus.type === "success" ? "var(--signal-green)" : "var(--destructive)",
              }}
            >
              {submitStatus.message}
            </p>
          )}
          <Link
            href="/dashboard"
            className="cta-button-secondary"
            style={{ marginTop: 8 }}
          >
            Or try the app now →
          </Link>
        </form>

        <div className="hero-proof">
          <div className="proof-badge">
            <GitHubIcon />
            <span>100% Open Source</span>
          </div>
          <div className="proof-badge">
            <PackageIcon />
            <span>Self-Host Anywhere</span>
          </div>
          <div className="proof-badge">
            <LockIcon />
            <span>Your Data, Your Servers</span>
          </div>
        </div>
      </section>

      {/* Dashboard Demo Section - Right after hero for immediate product validation */}
      <section id="demo" className="demo-section">
        <div className="demo-header">
          <span className="demo-badge">Live Demo</span>
          <p className="demo-label">Sample E-Commerce Dashboard (real database)</p>
        </div>

        <div className="demo-container">
          {/* Floating tooltips - positioned inside container */}
          <div className="demo-tooltip top-left" style={{ animationDelay: "0s" }}>
            <SparklesIcon /> AI-generated
          </div>
          <div className="demo-tooltip top-right" style={{ animationDelay: "1s" }}>
            <LayersIcon /> Interactive
          </div>
          <div className="demo-tooltip bottom-right" style={{ animationDelay: "2s" }}>
            <RefreshIcon /> Real-time
          </div>

          <div className="demo-content">
            <DataProvider initialData={initialData}>
              <VisibilityProvider>
                <ActionProvider handlers={{}}>
                  <Renderer tree={uiTree} registry={componentRegistry} />
                </ActionProvider>
              </VisibilityProvider>
            </DataProvider>
          </div>
        </div>
      </section>

      {/* Logo Cloud */}
      <section className="logo-cloud-section">
        <p className="logo-cloud-label">Works with your favorite databases</p>
        <div className="logo-cloud">
          <div className="logo-item">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.128 0a10.134 10.134 0 0 0-2.755.403l-.063.02C11.674.576 9.053 1.668 6.81 3.4c-.676.523-1.296 1.115-1.844 1.764-.04.047-.085.097-.12.15-.9 1.095-1.59 2.347-2.062 3.65-.496 1.37-.62 2.77-.62 4.13v.267c.02 1.584.285 3.13.898 4.577.128.302.264.6.42.887.477.89 1.03 1.695 1.67 2.41.61.68 1.275 1.29 1.987 1.83 1.58 1.193 3.37 2.002 5.284 2.422 1.227.268 2.504.4 3.796.343 1.303-.06 2.6-.287 3.84-.7 1.244-.415 2.416-1.005 3.446-1.79.345-.264.677-.543.99-.84.314-.302.613-.618.89-.95.558-.668 1.04-1.396 1.44-2.17.197-.386.376-.78.528-1.19.392-1.053.57-2.13.57-3.2 0-1.08-.238-2.14-.643-3.13-.206-.5-.452-.98-.74-1.43-.285-.45-.6-.88-.954-1.27a9.3 9.3 0 0 0-1.19-1.12c-.434-.36-.9-.68-1.39-.96-.248-.14-.502-.27-.76-.39-.26-.12-.53-.23-.8-.33-.28-.1-.56-.18-.85-.25-.29-.07-.58-.13-.88-.17-.3-.04-.6-.07-.91-.08-.3-.01-.61-.01-.92 0-.31.01-.62.03-.93.07-.31.03-.62.08-.92.14-.31.06-.61.13-.91.21l-.02.005c-.298.08-.594.17-.888.27-.293.1-.583.21-.87.33-.286.12-.568.25-.845.39-.277.14-.55.3-.818.46-.267.17-.527.35-.78.55-.253.19-.497.4-.734.62-.236.22-.462.45-.68.69-.217.24-.423.49-.618.75-.195.26-.378.53-.548.8-.17.28-.328.57-.472.86-.145.29-.276.59-.394.89-.12.3-.223.61-.316.92-.094.31-.17.62-.236.94-.065.32-.11.64-.145.97-.035.33-.05.66-.055 1 0 .33.01.67.04 1 .03.33.07.66.13.99.06.33.13.65.22.97.08.32.18.64.29.95.11.31.24.62.38.92.15.3.31.59.48.87.18.28.37.55.57.81.21.26.43.51.66.75.23.24.48.47.73.69.25.22.52.43.79.63.27.2.55.38.84.55.29.17.58.32.88.46.3.14.6.26.91.37.31.11.63.2.95.28.32.08.64.14.97.18.33.04.66.07.99.08.33.01.67 0 1-.02.33-.02.66-.06.99-.11.33-.05.65-.12.97-.2.32-.08.64-.18.95-.29.31-.11.61-.24.91-.39.29-.14.58-.3.85-.48.28-.18.54-.37.79-.58.25-.21.49-.43.72-.66.22-.23.44-.48.64-.73.2-.25.39-.52.56-.79.18-.27.34-.55.49-.84.15-.29.28-.59.4-.89.12-.3.22-.61.31-.93.09-.31.16-.63.22-.95.06-.32.1-.65.13-.98.03-.33.04-.66.04-1 0-.06 0-.12-.01-.17-.17-2.09-.93-4.05-2.1-5.66C20.81 3.84 18.32 1.87 15.41.84 16.006.417 16.567.115 17.128 0Z"/>
            </svg>
            PostgreSQL
          </div>
          <div className="logo-item">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.001 0C5.326 0 0 5.326 0 12.001c0 5.164 3.253 9.561 7.824 11.27-.14-1.057-.249-2.682.052-3.838.268-1.054 1.732-7.338 1.732-7.338s-.443-.886-.443-2.195c0-2.056 1.193-3.592 2.677-3.592 1.263 0 1.873.948 1.873 2.084 0 1.27-.808 3.166-1.224 4.925-.347 1.473.738 2.674 2.191 2.674 2.63 0 4.651-2.773 4.651-6.773 0-3.541-2.544-6.017-6.18-6.017-4.209 0-6.679 3.156-6.679 6.417 0 1.272.49 2.635 1.101 3.374.121.147.139.275.103.424-.112.467-.363 1.473-.412 1.679-.065.268-.213.324-.491.195-1.833-.853-2.978-3.532-2.978-5.685 0-4.625 3.361-8.877 9.694-8.877 5.089 0 9.043 3.628 9.043 8.473 0 5.056-3.188 9.126-7.61 9.126-1.488 0-2.885-.773-3.366-1.686l-.915 3.491c-.331 1.276-1.225 2.874-1.824 3.851 1.375.424 2.833.654 4.345.654 6.675 0 12.001-5.326 12.001-12.001C24.002 5.326 18.676 0 12.001 0Z"/>
            </svg>
            MySQL
          </div>
          <div className="logo-item">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2zm-2 4v12l8-6-8-6z"/>
            </svg>
            SQLite
          </div>
          <div className="logo-item">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.32 9.54L13.1.95c-.42-.38-.97-.58-1.53-.58H1.6c-.63 0-1.14.5-1.14 1.13v21c0 .63.51 1.13 1.14 1.13h9.88c.56 0 1.11-.2 1.53-.58l10.22-8.59c.89-.75.89-2.17 0-2.92z"/>
            </svg>
            Supabase
          </div>
        </div>
      </section>

      {/* Feature Ticker */}
      <section className="feature-ticker-section">
        <div className="ticker-wrapper">
          <div className="ticker-content">
            {[...tickerItems, ...tickerItems].map((item, index) => (
              <div key={index} className="ticker-item">
                <span className={`ticker-dot ${item.color}`} />
                {item.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial Section */}
      <section className="testimonial-section">
        <div className="testimonial-quote">
          <p className="quote-text">
            &ldquo;Finally, a tool that lets us <em>ask questions</em> about our data
            without writing SQL. Went from waiting days for custom reports
            to getting <em>instant insights</em>.&rdquo;
          </p>
          <div className="quote-author">
            <div className="author-avatar">J</div>
            <div className="author-info">
              <p className="author-name">Jagan Shanmugam (me)</p>
              <p className="author-title">Data Scientist</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section">
        <div className="section-header">
          <span className="section-label">Features</span>
          <h2 className="section-title">
            Everything you need for <em>data-driven</em> decisions
          </h2>
          <p className="section-desc">
            A complete analytics platform that grows with your business.
            No complex setup, no learning curve.
          </p>
        </div>

        <div className="feature-accordion">
          {features.map((feature) => (
            <div
              key={feature.id}
              className={`feature-item ${activeFeature === feature.id ? "active" : ""}`}
              onClick={() => setActiveFeature(feature.id)}
            >
              <div className="feature-header">
                <span className={`feature-indicator ${feature.color}`} />
                <h3 className="feature-title">{feature.title}</h3>
                <svg className="feature-expand" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </div>
              <div className="feature-content">
                <div className="feature-body">
                  <p className="feature-desc">{feature.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Bento Grid Section */}
      <section className="bento-section">
        <div className="section-header">
          <span className="section-label">By the Numbers</span>
          <h2 className="section-title">
            Built for <em>performance</em>
          </h2>
        </div>

        <div className="bento-grid">
          {bentoStats.map((item, index) => (
            <div
              key={index}
              className={`bento-card ${item.color} ${item.span ? "span-2" : ""}`}
            >
              <p className="bento-stat">{item.stat}</p>
              <p className="bento-label">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Persona Tabs Section */}
      <section id="personas" className="persona-section">
        <div className="section-header">
          <span className="section-label">Use Cases</span>
          <h2 className="section-title">
            Built for <em>your</em> team
          </h2>
          <p className="section-desc">
            Whether you&apos;re a solo founder or part of a data team,
            DashBee adapts to your workflow.
          </p>
        </div>

        <div className="persona-tabs">
          {personas.map((persona) => (
            <button
              key={persona.id}
              className={`persona-tab ${activePersona === persona.id ? "active" : ""}`}
              onClick={() => setActivePersona(persona.id)}
            >
              {persona.label}
            </button>
          ))}
        </div>

        <div className="persona-content">
          <div className="persona-info">
            <h3 className="persona-title">{currentPersona.title}</h3>
            <p className="persona-desc">{currentPersona.description}</p>
            <ul className="persona-benefits">
              {currentPersona.benefits.map((benefit, index) => (
                <li key={index} className="persona-benefit">
                  <span className="benefit-check">
                    <CheckIcon />
                  </span>
                  {benefit}
                </li>
              ))}
            </ul>
            <Link href="/dashboard" className="cta-button" style={{ alignSelf: "flex-start", marginTop: "8px" }}>
              Try DashBee Now
            </Link>
          </div>
          <div className="persona-chart">
            {personaCharts[currentPersona.id]?.()}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content">
          <h2 className="cta-title">
            Ready to transform your <em>data</em>?
          </h2>
          <p className="cta-desc">
            Join developers and data teams who are building better dashboards, faster.
            Open source, free forever.
          </p>
          <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/dashboard" className="cta-button">
              Start Building Now
            </Link>
            <a
              href="https://github.com/jagan-shanmugam/dashbee"
              target="_blank"
              rel="noopener noreferrer"
              className="cta-button-outline"
            >
              <GitHubIcon />
              View on GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link href="/" className="footer-logo">
              <span className="logo-icon" style={{ width: 24, height: 24 }}>
                <LogoIcon />
              </span>
              <span className="logo-text">DashBee</span>
            </Link>
            <p className="footer-tagline">
              Transform data into decisions. AI-powered analytics
              for modern teams. Open source and free.
            </p>
            <div className="footer-social">
              <a
                href="https://github.com/jagan-shanmugam/dashbee"
                target="_blank"
                rel="noopener noreferrer"
                className="social-link"
                aria-label="GitHub"
              >
                <GitHubIcon />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="social-link"
                aria-label="Twitter"
              >
                <TwitterIcon />
              </a>
            </div>
          </div>

          <div className="footer-column">
            <h4 className="footer-heading">Product</h4>
            <ul className="footer-links">
              <li><a href="#features" className="footer-link">Features</a></li>
              <li><a href="#demo" className="footer-link">Demo</a></li>
              <li><a href="#personas" className="footer-link">Use Cases</a></li>
              <li><Link href="/dashboard" className="footer-link">Open App</Link></li>
            </ul>
          </div>

          <div className="footer-column">
            <h4 className="footer-heading">Resources</h4>
            <ul className="footer-links">
              <li><a href="https://github.com/jagan-shanmugam/dashbee" className="footer-link" target="_blank" rel="noopener noreferrer">Documentation</a></li>
              <li><a href="https://github.com/jagan-shanmugam/dashbee" className="footer-link" target="_blank" rel="noopener noreferrer">GitHub</a></li>
              <li><a href="https://github.com/jagan-shanmugam/dashbee/issues" className="footer-link" target="_blank" rel="noopener noreferrer">Issues</a></li>
              <li><a href="https://github.com/jagan-shanmugam/dashbee/releases" className="footer-link" target="_blank" rel="noopener noreferrer">Changelog</a></li>
            </ul>
          </div>

          <div className="footer-column">
            <h4 className="footer-heading">Legal</h4>
            <ul className="footer-links">
              <li><Link href="/privacy" className="footer-link">Privacy Policy</Link></li>
              <li><Link href="/terms" className="footer-link">Terms of Service</Link></li>
              <li><a href="https://github.com/jagan-shanmugam/dashbee/blob/main/LICENSE" className="footer-link" target="_blank" rel="noopener noreferrer">MIT License</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p className="footer-copyright">
            &copy; {new Date().getFullYear()} DashBee. Open source under MIT License.
          </p>
          <div className="footer-legal">
            <Link href="/privacy" className="footer-link">Privacy</Link>
            <Link href="/terms" className="footer-link">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
