#!/usr/bin/env tsx
/**
 * MySQL Database Seeder - SaaS/Subscription Data
 *
 * Creates a large-scale SaaS subscription dataset with realistic patterns:
 * - ~1,000 organizations across industries
 * - ~10,000 users with roles
 * - 5 subscription plan tiers
 * - ~2,000 subscriptions (including historical)
 * - ~20,000 invoices
 * - ~500,000 usage events
 * - ~5,000 support tickets
 * - 2 years of daily MRR data
 *
 * Usage: pnpm db:seed-mysql
 */

import * as mysql from "mysql2/promise";
import { faker } from "@faker-js/faker";
import { config } from "dotenv";

config({ path: ".env.local" });

// Configuration
const SEED = 42; // For reproducible data
faker.seed(SEED);

const CONFIG = {
  ORGS_COUNT: 1000,
  USERS_PER_ORG_MIN: 2,
  USERS_PER_ORG_MAX: 50,
  USAGE_EVENTS_COUNT: 500000,
  SUPPORT_TICKETS_COUNT: 5000,
  TIME_RANGE_DAYS: 730, // 2 years
  BATCH_SIZE: 1000, // For batch inserts
};

// Plan definitions (SaaS tiers)
const PLANS = [
  {
    name: "Free",
    monthly_price: 0,
    annual_price: 0,
    max_users: 3,
    max_api_calls: 1000,
    features: ["basic_reports", "email_support"],
  },
  {
    name: "Starter",
    monthly_price: 29,
    annual_price: 290,
    max_users: 10,
    max_api_calls: 10000,
    features: ["basic_reports", "email_support", "api_access", "custom_dashboards"],
  },
  {
    name: "Professional",
    monthly_price: 99,
    annual_price: 990,
    max_users: 50,
    max_api_calls: 100000,
    features: ["advanced_reports", "priority_support", "api_access", "custom_dashboards", "sso"],
  },
  {
    name: "Business",
    monthly_price: 299,
    annual_price: 2990,
    max_users: 200,
    max_api_calls: 500000,
    features: ["advanced_reports", "priority_support", "api_access", "custom_dashboards", "sso", "audit_logs", "dedicated_account_manager"],
  },
  {
    name: "Enterprise",
    monthly_price: 999,
    annual_price: 9990,
    max_users: -1, // unlimited
    max_api_calls: -1, // unlimited
    features: ["advanced_reports", "priority_support", "api_access", "custom_dashboards", "sso", "audit_logs", "dedicated_account_manager", "sla", "custom_integrations", "on_premise"],
  },
];

// Industries for organizations
const INDUSTRIES = [
  "Technology",
  "Healthcare",
  "Finance",
  "Education",
  "E-commerce",
  "Manufacturing",
  "Marketing",
  "Real Estate",
  "Legal",
  "Consulting",
  "Media",
  "Retail",
  "Transportation",
  "Energy",
  "Non-profit",
];

// Company sizes with distribution weights
const COMPANY_SIZES: Array<{ size: string; weight: number; planDistribution: number[] }> = [
  { size: "startup", weight: 0.4, planDistribution: [0.3, 0.4, 0.2, 0.08, 0.02] },
  { size: "smb", weight: 0.35, planDistribution: [0.1, 0.25, 0.35, 0.25, 0.05] },
  { size: "enterprise", weight: 0.25, planDistribution: [0.02, 0.05, 0.15, 0.38, 0.4] },
];

// Countries with distribution
const COUNTRIES = [
  { name: "United States", weight: 0.35 },
  { name: "United Kingdom", weight: 0.12 },
  { name: "Germany", weight: 0.1 },
  { name: "Canada", weight: 0.08 },
  { name: "Australia", weight: 0.07 },
  { name: "France", weight: 0.06 },
  { name: "Japan", weight: 0.05 },
  { name: "Brazil", weight: 0.04 },
  { name: "India", weight: 0.04 },
  { name: "Netherlands", weight: 0.03 },
  { name: "Singapore", weight: 0.03 },
  { name: "Sweden", weight: 0.03 },
];

// Usage event types and their features
const EVENT_TYPES = [
  { type: "api_call", features: ["data_api", "reports_api", "export_api", "import_api"], weight: 0.6 },
  { type: "login", features: ["web_app", "mobile_app", "api"], weight: 0.15 },
  { type: "export", features: ["csv_export", "pdf_export", "excel_export"], weight: 0.1 },
  { type: "report_generated", features: ["custom_report", "scheduled_report", "dashboard_view"], weight: 0.1 },
  { type: "integration_sync", features: ["salesforce", "hubspot", "slack", "zapier"], weight: 0.05 },
];

// Support ticket categories
const TICKET_CATEGORIES = [
  { category: "technical", weight: 0.4 },
  { category: "billing", weight: 0.25 },
  { category: "feature_request", weight: 0.2 },
  { category: "bug", weight: 0.15 },
];

const TICKET_PRIORITIES = [
  { priority: "low", weight: 0.3 },
  { priority: "medium", weight: 0.4 },
  { priority: "high", weight: 0.2 },
  { priority: "urgent", weight: 0.1 },
];

// Helper functions
function weightedRandom<T extends { weight: number }>(items: T[]): T {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;
  for (const item of items) {
    random -= item.weight;
    if (random <= 0) return item;
  }
  return items[items.length - 1];
}

function randomDateBetween(start: Date, end: Date): Date {
  const startTime = start.getTime();
  const endTime = end.getTime();
  return new Date(startTime + Math.random() * (endTime - startTime));
}

function formatDatetime(date: Date): string {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function selectByDistribution(distribution: number[]): number {
  const random = Math.random();
  let cumulative = 0;
  for (let i = 0; i < distribution.length; i++) {
    cumulative += distribution[i];
    if (random <= cumulative) return i;
  }
  return distribution.length - 1;
}

// Growth pattern - more signups over time with seasonality
function getGrowthMultiplier(date: Date, startDate: Date): number {
  const daysSinceStart = (date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
  const normalizedDay = daysSinceStart / CONFIG.TIME_RANGE_DAYS;

  // Base growth: exponential-ish curve
  const baseGrowth = 0.3 + normalizedDay * 0.7;

  // Seasonality: dip in summer, peak in Q4
  const month = date.getMonth();
  let seasonality = 1.0;
  if (month >= 5 && month <= 7) seasonality = 0.85; // Summer dip
  if (month >= 9 && month <= 11) seasonality = 1.15; // Q4 peak

  return baseGrowth * seasonality;
}

// Main seeder function
async function seedDatabase() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || "localhost",
    port: parseInt(process.env.MYSQL_PORT || "3306"),
    user: process.env.MYSQL_USER || "mysql",
    password: process.env.MYSQL_PASSWORD || "mysql",
    database: process.env.MYSQL_DATABASE || "demo",
  });

  console.log("Connected to MySQL");

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - CONFIG.TIME_RANGE_DAYS);
  const now = new Date();

  try {
    // Check if tables exist, if so truncate them
    console.log("Checking existing tables...");
    const [tables] = await connection.query<mysql.RowDataPacket[]>(
      "SHOW TABLES"
    );

    if (tables.length > 0) {
      console.log("Truncating existing data...");
      // Disable FK checks for truncation
      await connection.query("SET FOREIGN_KEY_CHECKS = 0");

      const tablesToTruncate = [
        "feature_usage", "daily_mrr", "support_tickets",
        "usage_events", "invoices", "subscriptions",
        "users", "organizations", "plans"
      ];

      for (const table of tablesToTruncate) {
        try {
          await connection.query(`TRUNCATE TABLE ${table}`);
        } catch {
          // Table might not exist yet
        }
      }

      await connection.query("SET FOREIGN_KEY_CHECKS = 1");
    }

    // ============================================
    // 1. Insert Plans
    // ============================================
    console.log("Inserting plans...");
    for (const plan of PLANS) {
      await connection.query(
        `INSERT INTO plans (name, monthly_price, annual_price, max_users, max_api_calls, features)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          plan.name,
          plan.monthly_price,
          plan.annual_price,
          plan.max_users,
          plan.max_api_calls,
          JSON.stringify(plan.features),
        ]
      );
    }
    console.log(`Inserted ${PLANS.length} plans`);

    // ============================================
    // 2. Insert Organizations
    // ============================================
    console.log("Generating organizations...");
    const organizations: Array<{
      id: number;
      companySize: string;
      planDistribution: number[];
      created_at: Date;
    }> = [];

    const orgValues: Array<Array<string | null>> = [];
    for (let i = 0; i < CONFIG.ORGS_COUNT; i++) {
      const sizeInfo = weightedRandom(COMPANY_SIZES);
      const country = weightedRandom(COUNTRIES);
      const createdAt = randomDateBetween(startDate, now);

      organizations.push({
        id: i + 1,
        companySize: sizeInfo.size,
        planDistribution: sizeInfo.planDistribution,
        created_at: createdAt,
      });

      orgValues.push([
        faker.company.name(),
        INDUSTRIES[Math.floor(Math.random() * INDUSTRIES.length)],
        sizeInfo.size,
        country.name,
        formatDatetime(createdAt),
      ]);
    }

    // Batch insert organizations
    for (let i = 0; i < orgValues.length; i += CONFIG.BATCH_SIZE) {
      const batch = orgValues.slice(i, i + CONFIG.BATCH_SIZE);
      const placeholders = batch.map(() => "(?, ?, ?, ?, ?)").join(", ");
      const flatValues = batch.flat();
      await connection.query(
        `INSERT INTO organizations (name, industry, company_size, country, created_at)
         VALUES ${placeholders}`,
        flatValues
      );
      if ((i + CONFIG.BATCH_SIZE) % 5000 === 0 || i + CONFIG.BATCH_SIZE >= orgValues.length) {
        console.log(`  Inserted ${Math.min(i + CONFIG.BATCH_SIZE, orgValues.length)} organizations`);
      }
    }

    // ============================================
    // 3. Insert Users
    // ============================================
    console.log("Generating users...");
    const users: Array<{ id: number; org_id: number }> = [];
    const userValues: Array<Array<string | number | null>> = [];
    let userId = 1;

    for (const org of organizations) {
      // Number of users based on company size
      let maxUsers: number;
      switch (org.companySize) {
        case "startup":
          maxUsers = Math.min(CONFIG.USERS_PER_ORG_MAX, 15);
          break;
        case "smb":
          maxUsers = Math.min(CONFIG.USERS_PER_ORG_MAX, 35);
          break;
        default:
          maxUsers = CONFIG.USERS_PER_ORG_MAX;
      }

      const userCount = faker.number.int({
        min: CONFIG.USERS_PER_ORG_MIN,
        max: maxUsers,
      });

      for (let u = 0; u < userCount; u++) {
        const isAdmin = u === 0; // First user is always admin
        const role = isAdmin ? "admin" : faker.helpers.arrayElement(["member", "member", "member", "viewer"]);
        const status = faker.helpers.weightedArrayElement([
          { value: "active", weight: 0.8 },
          { value: "inactive", weight: 0.15 },
          { value: "invited", weight: 0.05 },
        ]);

        const userCreatedAt = new Date(org.created_at);
        userCreatedAt.setDate(userCreatedAt.getDate() + faker.number.int({ min: 0, max: 30 }));
        if (userCreatedAt > now) userCreatedAt.setTime(now.getTime());

        const lastLogin = status === "active"
          ? randomDateBetween(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), now)
          : null;

        users.push({ id: userId, org_id: org.id });
        // Include userId in email to guarantee uniqueness across 10K users
        const firstName = faker.person.firstName();
        const lastName = faker.person.lastName();
        const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${userId}@${faker.internet.domainName()}`;
        userValues.push([
          org.id,
          email,
          `${firstName} ${lastName}`,
          role,
          status,
          lastLogin ? formatDatetime(lastLogin) : null,
          formatDatetime(userCreatedAt),
        ]);
        userId++;
      }
    }

    // Batch insert users
    for (let i = 0; i < userValues.length; i += CONFIG.BATCH_SIZE) {
      const batch = userValues.slice(i, i + CONFIG.BATCH_SIZE);
      const placeholders = batch.map(() => "(?, ?, ?, ?, ?, ?, ?)").join(", ");
      const flatValues = batch.flat();
      await connection.query(
        `INSERT INTO users (organization_id, email, name, role, status, last_login, created_at)
         VALUES ${placeholders}`,
        flatValues
      );
      if ((i + CONFIG.BATCH_SIZE) % 5000 === 0 || i + CONFIG.BATCH_SIZE >= userValues.length) {
        console.log(`  Inserted ${Math.min(i + CONFIG.BATCH_SIZE, userValues.length)} users`);
      }
    }

    // ============================================
    // 4. Insert Subscriptions
    // ============================================
    console.log("Generating subscriptions...");
    const subscriptions: Array<{
      id: number;
      org_id: number;
      plan_id: number;
      status: string;
      billing_cycle: string;
      started_at: Date;
      cancelled_at: Date | null;
    }> = [];

    const subscriptionValues: Array<Array<string | number | null>> = [];
    let subId = 1;

    for (const org of organizations) {
      // Select plan based on company size distribution
      const planIndex = selectByDistribution(org.planDistribution);
      const planId = planIndex + 1;

      // Some organizations have subscription history (upgrades/downgrades)
      const hasHistory = Math.random() < 0.3;
      const subscriptionStart = new Date(org.created_at);
      subscriptionStart.setDate(subscriptionStart.getDate() + faker.number.int({ min: 0, max: 14 }));

      if (hasHistory && planIndex > 0) {
        // Previous subscription (lower tier)
        const prevPlanId = faker.number.int({ min: 1, max: planIndex });
        const prevEndDate = randomDateBetween(
          new Date(subscriptionStart.getTime() + 30 * 24 * 60 * 60 * 1000),
          new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
        );

        subscriptions.push({
          id: subId,
          org_id: org.id,
          plan_id: prevPlanId,
          status: "cancelled",
          billing_cycle: Math.random() < 0.3 ? "annual" : "monthly",
          started_at: subscriptionStart,
          cancelled_at: prevEndDate,
        });

        subscriptionValues.push([
          org.id,
          prevPlanId,
          "cancelled",
          Math.random() < 0.3 ? "annual" : "monthly",
          formatDatetime(subscriptionStart),
          formatDatetime(prevEndDate),
        ]);
        subId++;

        // Current subscription starts after previous ended
        const currentStart = new Date(prevEndDate);
        currentStart.setDate(currentStart.getDate() + 1);

        const currentStatus = faker.helpers.weightedArrayElement([
          { value: "active", weight: 0.85 },
          { value: "past_due", weight: 0.1 },
          { value: "trialing", weight: 0.05 },
        ]);

        subscriptions.push({
          id: subId,
          org_id: org.id,
          plan_id: planId,
          status: currentStatus,
          billing_cycle: Math.random() < 0.4 ? "annual" : "monthly",
          started_at: currentStart,
          cancelled_at: null,
        });

        subscriptionValues.push([
          org.id,
          planId,
          currentStatus,
          Math.random() < 0.4 ? "annual" : "monthly",
          formatDatetime(currentStart),
          null,
        ]);
        subId++;
      } else {
        // Single subscription (may be cancelled)
        const isCancelled = Math.random() < 0.15;
        const status = isCancelled
          ? "cancelled"
          : faker.helpers.weightedArrayElement([
              { value: "active", weight: 0.85 },
              { value: "past_due", weight: 0.1 },
              { value: "trialing", weight: 0.05 },
            ]);

        const cancelledAt = isCancelled
          ? randomDateBetween(
              new Date(subscriptionStart.getTime() + 30 * 24 * 60 * 60 * 1000),
              now
            )
          : null;

        subscriptions.push({
          id: subId,
          org_id: org.id,
          plan_id: planId,
          status,
          billing_cycle: Math.random() < 0.35 ? "annual" : "monthly",
          started_at: subscriptionStart,
          cancelled_at: cancelledAt,
        });

        subscriptionValues.push([
          org.id,
          planId,
          status,
          Math.random() < 0.35 ? "annual" : "monthly",
          formatDatetime(subscriptionStart),
          cancelledAt ? formatDatetime(cancelledAt) : null,
        ]);
        subId++;
      }
    }

    // Batch insert subscriptions
    for (let i = 0; i < subscriptionValues.length; i += CONFIG.BATCH_SIZE) {
      const batch = subscriptionValues.slice(i, i + CONFIG.BATCH_SIZE);
      const placeholders = batch.map(() => "(?, ?, ?, ?, ?, ?)").join(", ");
      const flatValues = batch.flat();
      await connection.query(
        `INSERT INTO subscriptions (organization_id, plan_id, status, billing_cycle, started_at, cancelled_at)
         VALUES ${placeholders}`,
        flatValues
      );
    }
    console.log(`Inserted ${subscriptionValues.length} subscriptions`);

    // ============================================
    // 5. Insert Invoices
    // ============================================
    console.log("Generating invoices...");
    const invoiceValues: Array<Array<string | number | null>> = [];

    for (const sub of subscriptions) {
      if (sub.plan_id === 1) continue; // Free plan has no invoices

      const plan = PLANS[sub.plan_id - 1];
      const isAnnual = sub.billing_cycle === "annual";
      const amount = isAnnual ? plan.annual_price : plan.monthly_price;

      // Generate invoices from subscription start to end (or now)
      const endDate = sub.cancelled_at || now;
      const monthlyInterval = isAnnual ? 12 : 1;

      const invoiceDate = new Date(sub.started_at);
      while (invoiceDate < endDate) {
        const isPaid = Math.random() < 0.95;
        const status = isPaid
          ? "paid"
          : faker.helpers.arrayElement(["pending", "failed", "refunded"]);

        const paidAt = isPaid
          ? new Date(invoiceDate.getTime() + faker.number.int({ min: 0, max: 3 }) * 24 * 60 * 60 * 1000)
          : null;

        invoiceValues.push([
          sub.org_id,
          sub.id,
          amount,
          status,
          formatDatetime(invoiceDate),
          paidAt ? formatDatetime(paidAt) : null,
        ]);

        invoiceDate.setMonth(invoiceDate.getMonth() + monthlyInterval);
      }
    }

    // Batch insert invoices
    for (let i = 0; i < invoiceValues.length; i += CONFIG.BATCH_SIZE) {
      const batch = invoiceValues.slice(i, i + CONFIG.BATCH_SIZE);
      const placeholders = batch.map(() => "(?, ?, ?, ?, ?, ?)").join(", ");
      const flatValues = batch.flat();
      await connection.query(
        `INSERT INTO invoices (organization_id, subscription_id, amount, status, issued_at, paid_at)
         VALUES ${placeholders}`,
        flatValues
      );
      if ((i + CONFIG.BATCH_SIZE) % 5000 === 0 || i + CONFIG.BATCH_SIZE >= invoiceValues.length) {
        console.log(`  Inserted ${Math.min(i + CONFIG.BATCH_SIZE, invoiceValues.length)} invoices`);
      }
    }

    // ============================================
    // 6. Insert Usage Events (high volume)
    // ============================================
    console.log("Generating usage events (this may take a while)...");
    const usageValues: Array<Array<string | number | null>> = [];

    // Pre-build user lookup by org
    const usersByOrg = new Map<number, number[]>();
    for (const user of users) {
      const orgUsers = usersByOrg.get(user.org_id) || [];
      orgUsers.push(user.id);
      usersByOrg.set(user.org_id, orgUsers);
    }

    for (let i = 0; i < CONFIG.USAGE_EVENTS_COUNT; i++) {
      // Weight towards more recent events
      const recencyBias = Math.pow(Math.random(), 0.7); // Bias towards 1 (recent)
      const eventDate = new Date(startDate.getTime() + recencyBias * (now.getTime() - startDate.getTime()));

      // Select organization (bias towards larger, more active orgs)
      const org = organizations[faker.number.int({ min: 0, max: organizations.length - 1 })];
      const orgUsers = usersByOrg.get(org.id) || [];
      if (orgUsers.length === 0) continue;

      const selectedUserId = orgUsers[faker.number.int({ min: 0, max: orgUsers.length - 1 })];
      const eventInfo = weightedRandom(EVENT_TYPES);
      const feature = eventInfo.features[faker.number.int({ min: 0, max: eventInfo.features.length - 1 })];

      const metadata = {
        response_time_ms: faker.number.int({ min: 50, max: 2000 }),
        success: Math.random() < 0.98,
      };

      usageValues.push([
        org.id,
        selectedUserId,
        eventInfo.type,
        feature,
        formatDatetime(eventDate),
        JSON.stringify(metadata),
      ]);

      // Insert in batches to avoid memory issues
      if (usageValues.length >= CONFIG.BATCH_SIZE) {
        const placeholders = usageValues.map(() => "(?, ?, ?, ?, ?, ?)").join(", ");
        const flatValues = usageValues.flat();
        await connection.query(
          `INSERT INTO usage_events (organization_id, user_id, event_type, feature, timestamp, metadata)
           VALUES ${placeholders}`,
          flatValues
        );
        usageValues.length = 0; // Clear array
        if ((i + 1) % 50000 === 0) {
          console.log(`  Inserted ${i + 1} usage events`);
        }
      }
    }

    // Insert remaining usage events
    if (usageValues.length > 0) {
      const placeholders = usageValues.map(() => "(?, ?, ?, ?, ?, ?)").join(", ");
      const flatValues = usageValues.flat();
      await connection.query(
        `INSERT INTO usage_events (organization_id, user_id, event_type, feature, timestamp, metadata)
         VALUES ${placeholders}`,
        flatValues
      );
    }
    console.log(`Inserted ${CONFIG.USAGE_EVENTS_COUNT} usage events`);

    // ============================================
    // 7. Insert Support Tickets
    // ============================================
    console.log("Generating support tickets...");
    const ticketValues: Array<Array<string | number | null>> = [];

    const ticketSubjects: Record<string, string[]> = {
      technical: [
        "API returning 500 errors",
        "Dashboard not loading",
        "Integration sync failing",
        "Export functionality broken",
        "Login issues after password reset",
        "SSO configuration not working",
        "Data not appearing in reports",
        "Webhook delivery failures",
      ],
      billing: [
        "Invoice discrepancy",
        "Need to update payment method",
        "Request for refund",
        "Upgrade plan pricing question",
        "Annual billing inquiry",
        "Tax exemption request",
        "Missing invoice",
        "Charge clarification needed",
      ],
      feature_request: [
        "Request for bulk export feature",
        "Need custom report builder",
        "Slack integration enhancement",
        "Mobile app feature request",
        "API rate limit increase",
        "Additional user roles needed",
        "White-labeling options",
        "Custom domain support",
      ],
      bug: [
        "Data showing incorrect totals",
        "UI glitch on Safari",
        "Notification emails not sending",
        "Timezone handling incorrect",
        "Search not returning results",
        "Charts displaying wrong data",
        "Permission error when accessing reports",
        "CSV export missing columns",
      ],
    };

    for (let i = 0; i < CONFIG.SUPPORT_TICKETS_COUNT; i++) {
      const org = organizations[faker.number.int({ min: 0, max: organizations.length - 1 })];
      const orgUsers = usersByOrg.get(org.id) || [];
      if (orgUsers.length === 0) continue;

      const selectedUserId = orgUsers[faker.number.int({ min: 0, max: orgUsers.length - 1 })];
      const categoryInfo = weightedRandom(TICKET_CATEGORIES);
      const priorityInfo = weightedRandom(TICKET_PRIORITIES);

      const subjects = ticketSubjects[categoryInfo.category];
      const subject = subjects[faker.number.int({ min: 0, max: subjects.length - 1 })];

      const createdAt = randomDateBetween(startDate, now);
      const isResolved = Math.random() < 0.75;
      const status = isResolved
        ? faker.helpers.arrayElement(["resolved", "closed"])
        : faker.helpers.weightedArrayElement([
            { value: "open", weight: 0.6 },
            { value: "in_progress", weight: 0.4 },
          ]);

      // Resolution time based on priority
      let resolutionDays: number;
      switch (priorityInfo.priority) {
        case "urgent":
          resolutionDays = faker.number.int({ min: 0, max: 1 });
          break;
        case "high":
          resolutionDays = faker.number.int({ min: 1, max: 3 });
          break;
        case "medium":
          resolutionDays = faker.number.int({ min: 2, max: 7 });
          break;
        default:
          resolutionDays = faker.number.int({ min: 3, max: 14 });
      }

      const resolvedAt = isResolved
        ? new Date(createdAt.getTime() + resolutionDays * 24 * 60 * 60 * 1000)
        : null;

      ticketValues.push([
        org.id,
        selectedUserId,
        subject,
        priorityInfo.priority,
        status,
        categoryInfo.category,
        formatDatetime(createdAt),
        resolvedAt ? formatDatetime(resolvedAt) : null,
      ]);
    }

    // Batch insert tickets
    for (let i = 0; i < ticketValues.length; i += CONFIG.BATCH_SIZE) {
      const batch = ticketValues.slice(i, i + CONFIG.BATCH_SIZE);
      const placeholders = batch.map(() => "(?, ?, ?, ?, ?, ?, ?, ?)").join(", ");
      const flatValues = batch.flat();
      await connection.query(
        `INSERT INTO support_tickets (organization_id, user_id, subject, priority, status, category, created_at, resolved_at)
         VALUES ${placeholders}`,
        flatValues
      );
    }
    console.log(`Inserted ${ticketValues.length} support tickets`);

    // ============================================
    // 8. Generate Daily MRR Snapshots
    // ============================================
    console.log("Generating daily MRR snapshots...");
    const mrrValues: Array<Array<string | number>> = [];

    for (let dayOffset = 0; dayOffset < CONFIG.TIME_RANGE_DAYS; dayOffset++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + dayOffset);

      for (let planId = 1; planId <= PLANS.length; planId++) {
        const plan = PLANS[planId - 1];
        const growthMult = getGrowthMultiplier(date, startDate);

        // Base subscriber count varies by plan tier
        const baseCounts = [200, 350, 250, 120, 80]; // Free has most, enterprise has least
        const baseCount = baseCounts[planId - 1];
        const subscriberCount = Math.round(baseCount * growthMult * (0.9 + Math.random() * 0.2));

        // Calculate MRR (monthly price * subscriber count, with some annual billing)
        const annualRatio = 0.35;
        const monthlyMrr = plan.monthly_price * subscriberCount * (1 - annualRatio);
        const annualMrr = (plan.annual_price / 12) * subscriberCount * annualRatio;
        const mrr = monthlyMrr + annualMrr;

        // Churn and signups
        const churnRate = 0.02 + (planId === 1 ? 0.03 : 0); // Higher churn on free
        const churnCount = Math.round(subscriberCount * churnRate * (0.5 + Math.random()));
        const newSignups = Math.round(subscriberCount * 0.05 * growthMult * (0.5 + Math.random()));

        mrrValues.push([
          formatDate(date),
          planId,
          Math.round(mrr * 100) / 100,
          subscriberCount,
          churnCount,
          newSignups,
        ]);
      }
    }

    // Batch insert MRR data
    for (let i = 0; i < mrrValues.length; i += CONFIG.BATCH_SIZE) {
      const batch = mrrValues.slice(i, i + CONFIG.BATCH_SIZE);
      const placeholders = batch.map(() => "(?, ?, ?, ?, ?, ?)").join(", ");
      const flatValues = batch.flat();
      await connection.query(
        `INSERT INTO daily_mrr (date, plan_id, mrr, subscriber_count, churn_count, new_signups)
         VALUES ${placeholders}`,
        flatValues
      );
    }
    console.log(`Inserted ${mrrValues.length} daily MRR records`);

    // ============================================
    // 9. Generate Feature Usage Aggregates
    // ============================================
    console.log("Generating feature usage aggregates...");
    const featureUsageValues: Array<Array<string | number>> = [];

    const features = [
      "basic_reports",
      "advanced_reports",
      "custom_dashboards",
      "api_access",
      "csv_export",
      "pdf_export",
      "sso",
      "audit_logs",
      "integrations",
      "scheduled_reports",
    ];

    // Generate for each month in the time range
    const monthStart = new Date(startDate);
    monthStart.setDate(1);

    while (monthStart < now) {
      const monthStr = formatDate(monthStart);
      const growthMult = getGrowthMultiplier(monthStart, startDate);

      for (let planId = 1; planId <= PLANS.length; planId++) {
        for (const feature of features) {
          // Usage varies by plan (higher tiers use more features)
          const planMultiplier = 0.5 + (planId / PLANS.length) * 0.5;
          const baseUsage = 1000 + Math.random() * 5000;
          const usageCount = Math.round(baseUsage * planMultiplier * growthMult);
          const uniqueUsers = Math.round(usageCount * (0.1 + Math.random() * 0.2));

          featureUsageValues.push([
            monthStr,
            planId,
            feature,
            usageCount,
            uniqueUsers,
          ]);
        }
      }

      monthStart.setMonth(monthStart.getMonth() + 1);
    }

    // Batch insert feature usage
    for (let i = 0; i < featureUsageValues.length; i += CONFIG.BATCH_SIZE) {
      const batch = featureUsageValues.slice(i, i + CONFIG.BATCH_SIZE);
      const placeholders = batch.map(() => "(?, ?, ?, ?, ?)").join(", ");
      const flatValues = batch.flat();
      await connection.query(
        `INSERT INTO feature_usage (month, plan_id, feature, usage_count, unique_users)
         VALUES ${placeholders}`,
        flatValues
      );
    }
    console.log(`Inserted ${featureUsageValues.length} feature usage records`);

    // ============================================
    // Summary
    // ============================================
    console.log("\n========================================");
    console.log("MySQL SaaS database seeded successfully!");
    console.log("========================================\n");

    // Verify counts
    const countQueries = [
      "SELECT 'plans' as tbl, COUNT(*) as cnt FROM plans",
      "SELECT 'organizations' as tbl, COUNT(*) as cnt FROM organizations",
      "SELECT 'users' as tbl, COUNT(*) as cnt FROM users",
      "SELECT 'subscriptions' as tbl, COUNT(*) as cnt FROM subscriptions",
      "SELECT 'invoices' as tbl, COUNT(*) as cnt FROM invoices",
      "SELECT 'usage_events' as tbl, COUNT(*) as cnt FROM usage_events",
      "SELECT 'support_tickets' as tbl, COUNT(*) as cnt FROM support_tickets",
      "SELECT 'daily_mrr' as tbl, COUNT(*) as cnt FROM daily_mrr",
      "SELECT 'feature_usage' as tbl, COUNT(*) as cnt FROM feature_usage",
    ];

    console.log("Final row counts:");
    for (const query of countQueries) {
      const [rows] = await connection.query<mysql.RowDataPacket[]>(query);
      console.log(`  ${rows[0].tbl}: ${rows[0].cnt.toLocaleString()}`);
    }

  } finally {
    await connection.end();
    console.log("\nConnection closed");
  }
}

// Run the seeder
seedDatabase().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
