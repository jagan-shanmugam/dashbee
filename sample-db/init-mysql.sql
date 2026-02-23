-- SaaS/Subscription Demo Database for MySQL
-- Sample subscription analytics data for dashboard demos
-- Schema only - data is seeded via scripts/seed-mysql.ts

-- Organizations table (SaaS customers)
CREATE TABLE organizations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  industry VARCHAR(50),
  company_size VARCHAR(20),  -- 'startup', 'smb', 'enterprise'
  country VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Subscription plans
CREATE TABLE plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  monthly_price DECIMAL(10,2),
  annual_price DECIMAL(10,2),
  max_users INT,
  max_api_calls INT,
  features JSON
);

-- Users within organizations
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organization_id INT,
  email VARCHAR(100) UNIQUE,
  name VARCHAR(100),
  role VARCHAR(30),  -- 'admin', 'member', 'viewer'
  status VARCHAR(20),  -- 'active', 'inactive', 'invited'
  last_login TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

-- Organization subscriptions
CREATE TABLE subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organization_id INT,
  plan_id INT,
  status VARCHAR(20),  -- 'active', 'cancelled', 'past_due', 'trialing'
  billing_cycle VARCHAR(10),  -- 'monthly', 'annual'
  started_at TIMESTAMP,
  cancelled_at TIMESTAMP NULL,
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (plan_id) REFERENCES plans(id)
);

-- Monthly invoices
CREATE TABLE invoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organization_id INT,
  subscription_id INT,
  amount DECIMAL(10,2),
  status VARCHAR(20),  -- 'paid', 'pending', 'failed', 'refunded'
  issued_at TIMESTAMP,
  paid_at TIMESTAMP NULL,
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (subscription_id) REFERENCES subscriptions(id)
);

-- High-volume usage events (API calls, logins, exports, etc.)
CREATE TABLE usage_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organization_id INT,
  user_id INT,
  event_type VARCHAR(50),  -- 'api_call', 'login', 'export', 'report_generated'
  feature VARCHAR(50),
  timestamp TIMESTAMP,
  metadata JSON,
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Customer support tickets
CREATE TABLE support_tickets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organization_id INT,
  user_id INT,
  subject VARCHAR(200),
  priority VARCHAR(20),  -- 'low', 'medium', 'high', 'urgent'
  status VARCHAR(20),  -- 'open', 'in_progress', 'resolved', 'closed'
  category VARCHAR(50),  -- 'billing', 'technical', 'feature_request', 'bug'
  created_at TIMESTAMP,
  resolved_at TIMESTAMP NULL,
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Daily MRR snapshot for time series analysis
CREATE TABLE daily_mrr (
  id INT AUTO_INCREMENT PRIMARY KEY,
  date DATE NOT NULL,
  plan_id INT,
  mrr DECIMAL(12,2),
  subscriber_count INT,
  churn_count INT,
  new_signups INT,
  FOREIGN KEY (plan_id) REFERENCES plans(id)
);

-- Aggregated feature usage by plan and month
CREATE TABLE feature_usage (
  id INT AUTO_INCREMENT PRIMARY KEY,
  month DATE NOT NULL,
  plan_id INT,
  feature VARCHAR(50),
  usage_count INT,
  unique_users INT,
  FOREIGN KEY (plan_id) REFERENCES plans(id)
);

-- Indexes for query performance
CREATE INDEX idx_users_organization ON users(organization_id);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_last_login ON users(last_login);

CREATE INDEX idx_subscriptions_organization ON subscriptions(organization_id);
CREATE INDEX idx_subscriptions_plan ON subscriptions(plan_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_started ON subscriptions(started_at);

CREATE INDEX idx_invoices_organization ON invoices(organization_id);
CREATE INDEX idx_invoices_subscription ON invoices(subscription_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_issued ON invoices(issued_at);

CREATE INDEX idx_usage_events_organization ON usage_events(organization_id);
CREATE INDEX idx_usage_events_user ON usage_events(user_id);
CREATE INDEX idx_usage_events_type ON usage_events(event_type);
CREATE INDEX idx_usage_events_timestamp ON usage_events(timestamp);
CREATE INDEX idx_usage_events_feature ON usage_events(feature);

CREATE INDEX idx_support_tickets_organization ON support_tickets(organization_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX idx_support_tickets_category ON support_tickets(category);
CREATE INDEX idx_support_tickets_created ON support_tickets(created_at);

CREATE INDEX idx_daily_mrr_date ON daily_mrr(date);
CREATE INDEX idx_daily_mrr_plan ON daily_mrr(plan_id);

CREATE INDEX idx_feature_usage_month ON feature_usage(month);
CREATE INDEX idx_feature_usage_plan ON feature_usage(plan_id);
CREATE INDEX idx_feature_usage_feature ON feature_usage(feature);
