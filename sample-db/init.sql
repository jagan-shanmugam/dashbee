-- Demo Database
-- Sample e-commerce data for dashboard demos

-- Customers table
CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE,
  region VARCHAR(50),
  state VARCHAR(50),
  country VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Products table
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50),
  price DECIMAL(10,2),
  stock INTEGER DEFAULT 0
);

-- Orders table
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id),
  total_amount DECIMAL(10,2),
  status VARCHAR(20) DEFAULT 'pending',
  state VARCHAR(50),
  country VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Order items
CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id),
  product_id INTEGER REFERENCES products(id),
  quantity INTEGER,
  unit_price DECIMAL(10,2)
);

-- Insert sample customers
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

-- Insert sample products
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

-- Insert sample orders with varying dates
INSERT INTO orders (customer_id, total_amount, status, state, country, created_at) VALUES
  (1, 1500.00, 'completed', 'California', 'United States', NOW() - INTERVAL '30 days'),
  (2, 2300.00, 'completed', NULL, 'Germany', NOW() - INTERVAL '28 days'),
  (3, 890.00, 'completed', 'Texas', 'United States', NOW() - INTERVAL '25 days'),
  (4, 4200.00, 'completed', NULL, 'Japan', NOW() - INTERVAL '22 days'),
  (5, 750.00, 'completed', 'New York', 'United States', NOW() - INTERVAL '20 days'),
  (6, 3100.00, 'completed', 'New York', 'United States', NOW() - INTERVAL '18 days'),
  (7, 560.00, 'completed', 'Washington', 'United States', NOW() - INTERVAL '15 days'),
  (8, 1890.00, 'completed', 'New York', 'United States', NOW() - INTERVAL '12 days'),
  (9, 2450.00, 'completed', NULL, 'United Kingdom', NOW() - INTERVAL '10 days'),
  (10, 980.00, 'completed', 'Illinois', 'United States', NOW() - INTERVAL '8 days'),
  (11, 3300.00, 'completed', NULL, 'France', NOW() - INTERVAL '7 days'),
  (12, 1200.00, 'pending', 'California', 'United States', NOW() - INTERVAL '5 days'),
  (13, 2800.00, 'pending', NULL, 'China', NOW() - INTERVAL '3 days'),
  (14, 670.00, 'pending', 'Florida', 'United States', NOW() - INTERVAL '2 days'),
  (15, 4500.00, 'pending', 'Colorado', 'United States', NOW() - INTERVAL '1 day'),
  (1, 1100.00, 'completed', 'California', 'United States', NOW() - INTERVAL '45 days'),
  (2, 850.00, 'completed', NULL, 'Germany', NOW() - INTERVAL '40 days'),
  (3, 2200.00, 'completed', 'Texas', 'United States', NOW() - INTERVAL '35 days'),
  (4, 1600.00, 'completed', NULL, 'Japan', NOW() - INTERVAL '32 days'),
  (5, 3400.00, 'completed', 'New York', 'United States', NOW() - INTERVAL '29 days'),
  (6, 790.00, 'cancelled', 'New York', 'United States', NOW() - INTERVAL '27 days'),
  (7, 1450.00, 'completed', 'Washington', 'United States', NOW() - INTERVAL '24 days'),
  (8, 2100.00, 'completed', 'New York', 'United States', NOW() - INTERVAL '21 days'),
  (9, 980.00, 'completed', NULL, 'United Kingdom', NOW() - INTERVAL '19 days'),
  (10, 3600.00, 'completed', 'Illinois', 'United States', NOW() - INTERVAL '16 days'),
  (16, 2400.00, 'completed', NULL, 'United Kingdom', NOW() - INTERVAL '14 days'),
  (17, 890.00, 'completed', 'California', 'United States', NOW() - INTERVAL '13 days'),
  (18, 1750.00, 'completed', 'Pennsylvania', 'United States', NOW() - INTERVAL '11 days'),
  (19, 3200.00, 'completed', 'California', 'United States', NOW() - INTERVAL '9 days'),
  (20, 2900.00, 'completed', 'California', 'United States', NOW() - INTERVAL '6 days'),
  (1, 1650.00, 'returned', 'California', 'United States', NOW() - INTERVAL '4 days'),
  (5, 4100.00, 'completed', 'New York', 'United States', NOW() - INTERVAL '3 days'),
  (10, 1280.00, 'shipped', 'Illinois', 'United States', NOW() - INTERVAL '2 days'),
  (3, 920.00, 'shipped', 'Texas', 'United States', NOW() - INTERVAL '1 day');

-- Insert sample order items
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

-- Create indexes for better query performance
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

-- Store locations table for map visualizations
CREATE TABLE store_locations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  state VARCHAR(50),
  country VARCHAR(50),
  lat DECIMAL(10,6),
  lng DECIMAL(10,6),
  avg_daily_orders INTEGER,
  revenue DECIMAL(12,2),
  employees INTEGER
);

-- Insert store locations
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

-- Daily metrics table for time-series visualizations
CREATE TABLE daily_metrics (
  date DATE NOT NULL,
  region VARCHAR(50),
  category VARCHAR(50),
  revenue DECIMAL(12,2),
  orders INTEGER,
  new_customers INTEGER,
  returns INTEGER,
  uptime_pct DECIMAL(5,2)
);

-- Generate 120 days of daily metrics
INSERT INTO daily_metrics (date, region, category, revenue, orders, new_customers, returns, uptime_pct)
SELECT 
  (NOW() - (n || ' days')::INTERVAL)::DATE as date,
  CASE (random() * 4)::INT
    WHEN 0 THEN 'West'
    WHEN 1 THEN 'Northeast'
    WHEN 2 THEN 'South'
    WHEN 3 THEN 'Midwest'
    ELSE 'Europe'
  END as region,
  CASE (random() * 4)::INT
    WHEN 0 THEN 'Electronics'
    WHEN 1 THEN 'Furniture'
    WHEN 2 THEN 'Accessories'
    WHEN 3 THEN 'SaaS'
    ELSE 'Services'
  END as category,
  (5000 + random() * 15000 + 
   CASE WHEN EXTRACT(DOW FROM (NOW() - (n || ' days')::INTERVAL)) IN (0, 6) THEN -2000 ELSE 0 END +
   CASE WHEN n < 30 THEN 3000 ELSE 0 END)::DECIMAL(12,2) as revenue,
  (20 + random() * 80 + 
   CASE WHEN EXTRACT(DOW FROM (NOW() - (n || ' days')::INTERVAL)) IN (0, 6) THEN -10 ELSE 0 END +
   CASE WHEN n < 30 THEN 15 ELSE 0 END)::INT as orders,
  (1 + random() * 10)::INT as new_customers,
  (random() * 5)::INT as returns,
  (97.0 + random() * 3.0)::DECIMAL(5,2) as uptime_pct
FROM generate_series(0, 119) as n;

CREATE INDEX idx_daily_metrics_date ON daily_metrics(date);
CREATE INDEX idx_daily_metrics_region ON daily_metrics(region);
CREATE INDEX idx_daily_metrics_category ON daily_metrics(category);

-- Category-region sales matrix for heatmap visualizations
CREATE TABLE category_region_sales (
  category VARCHAR(50) NOT NULL,
  region VARCHAR(50) NOT NULL,
  revenue DECIMAL(12,2),
  orders INTEGER,
  avg_order_value DECIMAL(10,2)
);

-- Insert matrix data
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

-- KPI snapshots table for metric cards
CREATE TABLE kpi_snapshots (
  date DATE NOT NULL,
  mrr DECIMAL(12,2),
  arpu DECIMAL(10,2),
  churn_rate DECIMAL(5,2),
  nps INTEGER,
  uptime_pct DECIMAL(5,2),
  active_customers INTEGER,
  support_tickets INTEGER
);

-- Insert KPI snapshots for last 90 days
INSERT INTO kpi_snapshots (date, mrr, arpu, churn_rate, nps, uptime_pct, active_customers, support_tickets)
SELECT 
  (NOW() - (n || ' days')::INTERVAL)::DATE as date,
  (450000 + random() * 50000 + n * 1000)::DECIMAL(12,2) as mrr,
  (125 + random() * 25)::DECIMAL(10,2) as arpu,
  (1.5 + random() * 2)::DECIMAL(5,2) as churn_rate,
  (65 + random() * 30)::INT as nps,
  (97.5 + random() * 2.5)::DECIMAL(5,2) as uptime_pct,
  (3500 + (n * 5) + (random() * 100)::INT)::INT as active_customers,
  (15 + random() * 35)::INT as support_tickets
FROM generate_series(0, 89) as n;

CREATE INDEX idx_kpi_snapshots_date ON kpi_snapshots(date);

-- Sales by hour and day of week for matrix heatmap
CREATE TABLE hourly_traffic (
  hour_of_day INTEGER NOT NULL,
  day_of_week INTEGER NOT NULL,
  orders INTEGER,
  revenue DECIMAL(10,2),
  avg_order_value DECIMAL(8,2)
);

-- Insert hourly traffic patterns
INSERT INTO hourly_traffic (hour_of_day, day_of_week, orders, revenue, avg_order_value)
SELECT 
  h as hour_of_day,
  d as day_of_week,
  CASE 
    WHEN h BETWEEN 9 AND 17 THEN 40 + (random() * 60)::INT
    WHEN h BETWEEN 18 AND 21 THEN 30 + (random() * 40)::INT
    ELSE 5 + (random() * 15)::INT
  END as orders,
  CASE 
    WHEN h BETWEEN 9 AND 17 THEN 8000 + (random() * 12000)::INT
    WHEN h BETWEEN 18 AND 21 THEN 6000 + (random() * 8000)::INT
    ELSE 1000 + (random() * 3000)::INT
  END as revenue,
  (150 + random() * 100)::DECIMAL(8,2) as avg_order_value
FROM generate_series(0, 23) as h
CROSS JOIN generate_series(0, 6) as d;

-- Product performance table
CREATE TABLE product_performance (
  product_id INTEGER REFERENCES products(id),
  month DATE NOT NULL,
  units_sold INTEGER,
  revenue DECIMAL(12,2),
  returns INTEGER,
  rating DECIMAL(3,2)
);

-- Insert product performance data for last 6 months
INSERT INTO product_performance (product_id, month, units_sold, revenue, returns, rating)
SELECT 
  p.id,
  (DATE_TRUNC('month', NOW()) - (m || ' months')::INTERVAL)::DATE as month,
  (20 + random() * 200)::INT as units_sold,
  (20 + random() * 200)::INT * p.price as revenue,
  (random() * 10)::INT as returns,
  (3.5 + random() * 1.5)::DECIMAL(3,2) as rating
FROM products p
CROSS JOIN generate_series(0, 5) as m;

CREATE INDEX idx_product_performance_product ON product_performance(product_id);
CREATE INDEX idx_product_performance_month ON product_performance(month);
