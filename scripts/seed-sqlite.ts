#!/usr/bin/env tsx
/**
 * SQLite Database Seeder
 *
 * Creates a pre-seeded SQLite database with sample e-commerce data
 * matching the PostgreSQL/MySQL demo databases.
 *
 * Usage: pnpm db:seed-sqlite
 */

import Database from "better-sqlite3";
import { resolve, dirname } from "path";
import { existsSync, unlinkSync } from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = resolve(__dirname, "../sample-db/demo.sqlite");

// Delete existing file if present
if (existsSync(dbPath)) {
  unlinkSync(dbPath);
  console.log("Removed existing database");
}

const db = new Database(dbPath);

console.log("Creating SQLite database:", dbPath);

// Create tables (SQLite syntax)
db.exec(`
  -- Customers table
  CREATE TABLE customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    region TEXT,
    state TEXT,
    country TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Products table
  CREATE TABLE products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT,
    price REAL,
    stock INTEGER DEFAULT 0
  );

  -- Orders table
  CREATE TABLE orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER REFERENCES customers(id),
    total_amount REAL,
    status TEXT DEFAULT 'pending',
    state TEXT,
    country TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Order items
  CREATE TABLE order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER REFERENCES orders(id),
    product_id INTEGER REFERENCES products(id),
    quantity INTEGER,
    unit_price REAL
  );

  -- Store locations table for map visualizations
  CREATE TABLE store_locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    state TEXT,
    country TEXT,
    lat REAL,
    lng REAL,
    avg_daily_orders INTEGER,
    revenue REAL,
    employees INTEGER
  );

  -- Daily metrics table for time-series visualizations
  CREATE TABLE daily_metrics (
    date TEXT NOT NULL,
    region TEXT,
    category TEXT,
    revenue REAL,
    orders INTEGER,
    new_customers INTEGER,
    returns INTEGER,
    uptime_pct REAL
  );

  -- Category-region sales matrix for heatmap visualizations
  CREATE TABLE category_region_sales (
    category TEXT NOT NULL,
    region TEXT NOT NULL,
    revenue REAL,
    orders INTEGER,
    avg_order_value REAL
  );

  -- KPI snapshots table for metric cards
  CREATE TABLE kpi_snapshots (
    date TEXT NOT NULL,
    mrr REAL,
    arpu REAL,
    churn_rate REAL,
    nps INTEGER,
    uptime_pct REAL,
    active_customers INTEGER,
    support_tickets INTEGER
  );

  -- Sales by hour and day of week for matrix heatmap
  CREATE TABLE hourly_traffic (
    hour_of_day INTEGER NOT NULL,
    day_of_week INTEGER NOT NULL,
    orders INTEGER,
    revenue REAL,
    avg_order_value REAL
  );

  -- Product performance table
  CREATE TABLE product_performance (
    product_id INTEGER REFERENCES products(id),
    month TEXT NOT NULL,
    units_sold INTEGER,
    revenue REAL,
    returns INTEGER,
    rating REAL
  );
`);

console.log("Tables created");

// Insert sample customers
db.exec(`
  INSERT INTO customers (name, email, region, state, country) VALUES
    ('Acme Corp', 'sales@acme.com', 'West', 'California', 'United States'),
    ('Globex Inc', 'info@globex.com', 'Europe', NULL, 'Germany'),
    ('Initech', 'contact@initech.com', 'South', 'Texas', 'United States'),
    ('Umbrella Co', 'orders@umbrella.com', 'Asia', NULL, 'Japan'),
    ('Stark Industries', 'tony@stark.com', 'Northeast', 'New York', 'United States'),
    ('Wayne Enterprises', 'bruce@wayne.com', 'Northeast', 'New York', 'United States'),
    ('Cyberdyne Systems', 'info@cyberdyne.com', 'West', 'Washington', 'United States'),
    ('Oscorp', 'norman@oscorp.com', 'Northeast', 'New York', 'United States'),
    ('Massive Dynamic', 'walter@massive.com', 'Europe', NULL, 'United Kingdom'),
    ('Aperture Science', 'glados@aperture.com', 'Midwest', 'Illinois', 'United States'),
    ('Weyland Corp', 'info@weyland.com', 'Europe', NULL, 'France'),
    ('InGen', 'hammond@ingen.com', 'West', 'California', 'United States'),
    ('Tyrell Corp', 'tyrell@replicants.com', 'Asia', NULL, 'China'),
    ('Soylent Corp', 'green@soylent.com', 'South', 'Florida', 'United States'),
    ('Omni Consumer Products', 'ocp@robocop.com', 'Midwest', 'Colorado', 'United States'),
    ('Wonka Industries', 'charlie@wonka.com', 'Europe', NULL, 'United Kingdom'),
    ('Bluth Company', 'gob@bluth.com', 'West', 'California', 'United States'),
    ('Dunder Mifflin', 'michael@dundermifflin.com', 'Northeast', 'Pennsylvania', 'United States'),
    ('Pied Piper', 'richard@piedpiper.com', 'West', 'California', 'United States'),
    ('Hooli', 'gavin@hooli.com', 'West', 'California', 'United States');
`);

console.log("Customers inserted");

// Insert sample products
db.exec(`
  INSERT INTO products (name, category, price, stock) VALUES
    ('Widget Pro', 'Electronics', 299.99, 150),
    ('Gadget Plus', 'Electronics', 149.99, 300),
    ('Office Chair', 'Furniture', 399.00, 45),
    ('Standing Desk', 'Furniture', 599.00, 30),
    ('Monitor 27"', 'Electronics', 449.99, 85),
    ('Keyboard Mech', 'Electronics', 129.99, 200),
    ('Mouse Wireless', 'Electronics', 79.99, 350),
    ('Laptop Stand', 'Accessories', 59.99, 180),
    ('USB Hub', 'Accessories', 39.99, 400),
    ('Webcam HD', 'Electronics', 99.99, 120),
    ('Headphones Pro', 'Electronics', 249.99, 75),
    ('Desk Lamp', 'Furniture', 89.99, 160),
    ('Cable Manager', 'Accessories', 19.99, 500),
    ('Monitor Arm', 'Accessories', 149.99, 65),
    ('Ergonomic Mouse', 'Electronics', 89.99, 220),
    ('Cloud Backup Pro', 'SaaS', 29.99, 9999),
    ('Analytics Suite', 'SaaS', 99.99, 9999),
    ('Email Marketing', 'SaaS', 49.99, 9999),
    ('CRM Platform', 'SaaS', 79.99, 9999),
    ('Web Hosting', 'Services', 19.99, 9999),
    ('Consulting Hour', 'Services', 150.00, 9999),
    ('Training Session', 'Services', 299.00, 9999),
    ('Laptop Pro 15"', 'Electronics', 1299.99, 40),
    ('Tablet 10"', 'Electronics', 399.99, 90),
    ('Smartwatch', 'Electronics', 249.99, 110),
    ('Bluetooth Speaker', 'Electronics', 89.99, 200),
    ('Desk Organizer', 'Accessories', 24.99, 300),
    ('Phone Stand', 'Accessories', 14.99, 450),
    ('Conference Table', 'Furniture', 1299.00, 15),
    ('Bookshelf', 'Furniture', 199.00, 35);
`);

console.log("Products inserted");

// Helper to format date for SQLite (returns ISO date string)
function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 19).replace("T", " ");
}

// Insert sample orders with varying dates
const insertOrder = db.prepare(`
  INSERT INTO orders (customer_id, total_amount, status, state, country, created_at)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const orders = [
  [1, 1500.0, "completed", "California", "United States", daysAgo(30)],
  [2, 2300.0, "completed", null, "Germany", daysAgo(28)],
  [3, 890.0, "completed", "Texas", "United States", daysAgo(25)],
  [4, 4200.0, "completed", null, "Japan", daysAgo(22)],
  [5, 750.0, "completed", "New York", "United States", daysAgo(20)],
  [6, 3100.0, "completed", "New York", "United States", daysAgo(18)],
  [7, 560.0, "completed", "Washington", "United States", daysAgo(15)],
  [8, 1890.0, "completed", "New York", "United States", daysAgo(12)],
  [9, 2450.0, "completed", null, "United Kingdom", daysAgo(10)],
  [10, 980.0, "completed", "Illinois", "United States", daysAgo(8)],
  [11, 3300.0, "completed", null, "France", daysAgo(7)],
  [12, 1200.0, "pending", "California", "United States", daysAgo(5)],
  [13, 2800.0, "pending", null, "China", daysAgo(3)],
  [14, 670.0, "pending", "Florida", "United States", daysAgo(2)],
  [15, 4500.0, "pending", "Colorado", "United States", daysAgo(1)],
  [1, 1100.0, "completed", "California", "United States", daysAgo(45)],
  [2, 850.0, "completed", null, "Germany", daysAgo(40)],
  [3, 2200.0, "completed", "Texas", "United States", daysAgo(35)],
  [4, 1600.0, "completed", null, "Japan", daysAgo(32)],
  [5, 3400.0, "completed", "New York", "United States", daysAgo(29)],
  [6, 790.0, "cancelled", "New York", "United States", daysAgo(27)],
  [7, 1450.0, "completed", "Washington", "United States", daysAgo(24)],
  [8, 2100.0, "completed", "New York", "United States", daysAgo(21)],
  [9, 980.0, "completed", null, "United Kingdom", daysAgo(19)],
  [10, 3600.0, "completed", "Illinois", "United States", daysAgo(16)],
  [16, 2400.0, "completed", null, "United Kingdom", daysAgo(14)],
  [17, 890.0, "completed", "California", "United States", daysAgo(13)],
  [18, 1750.0, "completed", "Pennsylvania", "United States", daysAgo(11)],
  [19, 3200.0, "completed", "California", "United States", daysAgo(9)],
  [20, 2900.0, "completed", "California", "United States", daysAgo(6)],
  [1, 1650.0, "returned", "California", "United States", daysAgo(4)],
  [5, 4100.0, "completed", "New York", "United States", daysAgo(3)],
  [10, 1280.0, "shipped", "Illinois", "United States", daysAgo(2)],
  [3, 920.0, "shipped", "Texas", "United States", daysAgo(1)],
];

for (const order of orders) {
  insertOrder.run(...order);
}

console.log("Orders inserted");

// Insert sample order items
db.exec(`
  INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES
    (1, 1, 2, 299.99),
    (1, 6, 3, 129.99),
    (1, 9, 5, 39.99),
    (2, 3, 2, 399.00),
    (2, 4, 2, 599.00),
    (2, 12, 1, 89.99),
    (3, 2, 3, 149.99),
    (3, 8, 2, 59.99),
    (3, 13, 10, 19.99),
    (4, 5, 4, 449.99),
    (4, 10, 5, 99.99),
    (4, 11, 3, 249.99),
    (5, 7, 5, 79.99),
    (5, 9, 8, 39.99),
    (6, 1, 5, 299.99),
    (6, 3, 2, 399.00),
    (6, 14, 3, 149.99),
    (7, 6, 2, 129.99),
    (7, 8, 3, 59.99),
    (7, 13, 5, 19.99),
    (8, 2, 6, 149.99),
    (8, 5, 2, 449.99),
    (9, 4, 3, 599.00),
    (9, 11, 2, 249.99),
    (10, 1, 1, 299.99),
    (10, 7, 4, 79.99),
    (10, 10, 3, 99.99);
`);

console.log("Order items inserted");

// Insert store locations
db.exec(`
  INSERT INTO store_locations (name, state, country, lat, lng, avg_daily_orders, revenue, employees) VALUES
    ('San Francisco HQ', 'California', 'United States', 37.7749, -122.4194, 145, 2500000, 250),
    ('Los Angeles Store', 'California', 'United States', 34.0522, -118.2437, 120, 1800000, 180),
    ('New York City', 'New York', 'United States', 40.7128, -74.0060, 180, 3200000, 320),
    ('Chicago', 'Illinois', 'United States', 41.8781, -87.6298, 95, 1500000, 150),
    ('Houston', 'Texas', 'United States', 29.7604, -95.3698, 88, 1400000, 140),
    ('Seattle', 'Washington', 'United States', 47.6062, -122.3321, 102, 1750000, 175),
    ('Denver', 'Colorado', 'United States', 39.7392, -104.9903, 67, 980000, 98),
    ('Miami', 'Florida', 'United States', 25.7617, -80.1918, 75, 1200000, 120),
    ('Boston', 'Massachusetts', 'United States', 42.3601, -71.0589, 92, 1600000, 160),
    ('Austin', 'Texas', 'United States', 30.2672, -97.7431, 80, 1350000, 135),
    ('Phoenix', 'Arizona', 'United States', 33.4484, -112.0740, 71, 1100000, 110),
    ('Philadelphia', 'Pennsylvania', 'United States', 39.9526, -75.1652, 85, 1450000, 145),
    ('London Office', NULL, 'United Kingdom', 51.5074, -0.1278, 110, 2200000, 220),
    ('Berlin Branch', NULL, 'Germany', 52.5200, 13.4050, 95, 1800000, 180),
    ('Paris Store', NULL, 'France', 48.8566, 2.3522, 88, 1650000, 165),
    ('Tokyo Center', NULL, 'Japan', 35.6762, 139.6503, 130, 2800000, 280),
    ('Shanghai', NULL, 'China', 31.2304, 121.4737, 115, 2400000, 240),
    ('Sydney', NULL, 'Australia', -33.8688, 151.2093, 78, 1350000, 135);
`);

console.log("Store locations inserted");

// Insert category-region sales matrix
db.exec(`
  INSERT INTO category_region_sales (category, region, revenue, orders, avg_order_value) VALUES
    ('Electronics', 'West', 2500000, 8500, 294.12),
    ('Electronics', 'Northeast', 2800000, 9200, 304.35),
    ('Electronics', 'South', 1900000, 6800, 279.41),
    ('Electronics', 'Midwest', 1600000, 5500, 290.91),
    ('Electronics', 'Europe', 2200000, 7200, 305.56),
    ('Electronics', 'Asia', 1800000, 6100, 295.08),
    ('Furniture', 'West', 1800000, 4200, 428.57),
    ('Furniture', 'Northeast', 2100000, 4800, 437.50),
    ('Furniture', 'South', 1400000, 3500, 400.00),
    ('Furniture', 'Midwest', 1200000, 3000, 400.00),
    ('Furniture', 'Europe', 1650000, 3900, 423.08),
    ('Furniture', 'Asia', 980000, 2400, 408.33),
    ('Accessories', 'West', 890000, 12000, 74.17),
    ('Accessories', 'Northeast', 1100000, 14500, 75.86),
    ('Accessories', 'South', 720000, 10000, 72.00),
    ('Accessories', 'Midwest', 650000, 9200, 70.65),
    ('Accessories', 'Europe', 850000, 11800, 72.03),
    ('Accessories', 'Asia', 680000, 9500, 71.58),
    ('SaaS', 'West', 1950000, 6800, 286.76),
    ('SaaS', 'Northeast', 2200000, 7500, 293.33),
    ('SaaS', 'South', 1450000, 5200, 278.85),
    ('SaaS', 'Midwest', 1250000, 4500, 277.78),
    ('SaaS', 'Europe', 1800000, 6200, 290.32),
    ('SaaS', 'Asia', 1550000, 5400, 287.04),
    ('Services', 'West', 1650000, 3800, 434.21),
    ('Services', 'Northeast', 1900000, 4200, 452.38),
    ('Services', 'South', 1200000, 2900, 413.79),
    ('Services', 'Midwest', 980000, 2400, 408.33),
    ('Services', 'Europe', 1450000, 3300, 439.39),
    ('Services', 'Asia', 1100000, 2600, 423.08);
`);

console.log("Category-region sales inserted");

// Helper to format date as YYYY-MM-DD for SQLite
function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Generate 120 days of daily metrics
const insertDailyMetric = db.prepare(`
  INSERT INTO daily_metrics (date, region, category, revenue, orders, new_customers, returns, uptime_pct)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const regions = ["West", "Northeast", "South", "Midwest", "Europe"];
const categories = ["Electronics", "Furniture", "Accessories", "SaaS", "Services"];

for (let i = 0; i < 120; i++) {
  const date = new Date();
  date.setDate(date.getDate() - i);
  const dayOfWeek = date.getDay();
  const region = regions[Math.floor(Math.random() * regions.length)];
  const category = categories[Math.floor(Math.random() * categories.length)];

  let revenue = 5000 + Math.random() * 15000;
  let orders = 20 + Math.floor(Math.random() * 80);

  // Weekend dip
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    revenue -= 2000;
    orders -= 10;
  }

  // Recent boost (last 30 days)
  if (i < 30) {
    revenue += 3000;
    orders += 15;
  }

  insertDailyMetric.run(
    formatDate(date),
    region,
    category,
    Math.round(revenue * 100) / 100,
    orders,
    1 + Math.floor(Math.random() * 10),
    Math.floor(Math.random() * 5),
    Math.round((97 + Math.random() * 3) * 100) / 100
  );
}

console.log("Daily metrics inserted (120 days)");

// Generate KPI snapshots for last 90 days
const insertKpiSnapshot = db.prepare(`
  INSERT INTO kpi_snapshots (date, mrr, arpu, churn_rate, nps, uptime_pct, active_customers, support_tickets)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

for (let i = 0; i < 90; i++) {
  const date = new Date();
  date.setDate(date.getDate() - i);

  insertKpiSnapshot.run(
    formatDate(date),
    Math.round((450000 + Math.random() * 50000 + i * 1000) * 100) / 100,
    Math.round((125 + Math.random() * 25) * 100) / 100,
    Math.round((1.5 + Math.random() * 2) * 100) / 100,
    65 + Math.floor(Math.random() * 30),
    Math.round((97.5 + Math.random() * 2.5) * 100) / 100,
    3500 + i * 5 + Math.floor(Math.random() * 100),
    15 + Math.floor(Math.random() * 35)
  );
}

console.log("KPI snapshots inserted (90 days)");

// Generate hourly traffic patterns
const insertHourlyTraffic = db.prepare(`
  INSERT INTO hourly_traffic (hour_of_day, day_of_week, orders, revenue, avg_order_value)
  VALUES (?, ?, ?, ?, ?)
`);

for (let h = 0; h < 24; h++) {
  for (let d = 0; d < 7; d++) {
    let orders: number;
    let revenue: number;

    if (h >= 9 && h <= 17) {
      orders = 40 + Math.floor(Math.random() * 60);
      revenue = 8000 + Math.floor(Math.random() * 12000);
    } else if (h >= 18 && h <= 21) {
      orders = 30 + Math.floor(Math.random() * 40);
      revenue = 6000 + Math.floor(Math.random() * 8000);
    } else {
      orders = 5 + Math.floor(Math.random() * 15);
      revenue = 1000 + Math.floor(Math.random() * 3000);
    }

    insertHourlyTraffic.run(
      h,
      d,
      orders,
      revenue,
      Math.round((150 + Math.random() * 100) * 100) / 100
    );
  }
}

console.log("Hourly traffic inserted (168 rows)");

// Generate product performance data for last 6 months
const insertProductPerformance = db.prepare(`
  INSERT INTO product_performance (product_id, month, units_sold, revenue, returns, rating)
  VALUES (?, ?, ?, ?, ?, ?)
`);

// Get product prices
interface ProductPrice {
  id: number;
  price: number;
}

const products = db.prepare("SELECT id, price FROM products").all() as ProductPrice[];

for (const product of products) {
  for (let m = 0; m < 6; m++) {
    const date = new Date();
    date.setMonth(date.getMonth() - m);
    date.setDate(1);
    const monthStr = formatDate(date);

    const units = 20 + Math.floor(Math.random() * 200);
    const revenue = units * product.price;

    insertProductPerformance.run(
      product.id,
      monthStr,
      units,
      Math.round(revenue * 100) / 100,
      Math.floor(Math.random() * 10),
      Math.round((3.5 + Math.random() * 1.5) * 100) / 100
    );
  }
}

console.log("Product performance inserted (180 rows)");

// Create indexes for better query performance
db.exec(`
  CREATE INDEX idx_orders_customer ON orders(customer_id);
  CREATE INDEX idx_orders_status ON orders(status);
  CREATE INDEX idx_orders_created ON orders(created_at);
  CREATE INDEX idx_orders_state ON orders(state);
  CREATE INDEX idx_orders_country ON orders(country);
  CREATE INDEX idx_customers_region ON customers(region);
  CREATE INDEX idx_customers_state ON customers(state);
  CREATE INDEX idx_customers_country ON customers(country);
  CREATE INDEX idx_products_category ON products(category);
  CREATE INDEX idx_order_items_order ON order_items(order_id);
  CREATE INDEX idx_order_items_product ON order_items(product_id);
  CREATE INDEX idx_daily_metrics_date ON daily_metrics(date);
  CREATE INDEX idx_daily_metrics_region ON daily_metrics(region);
  CREATE INDEX idx_daily_metrics_category ON daily_metrics(category);
  CREATE INDEX idx_kpi_snapshots_date ON kpi_snapshots(date);
  CREATE INDEX idx_product_performance_product ON product_performance(product_id);
  CREATE INDEX idx_product_performance_month ON product_performance(month);
`);

console.log("Indexes created");

db.close();

console.log("\nSQLite database seeded successfully!");
console.log("Location:", dbPath);
