/**
 * Data fetching functions for the landing page.
 * Queries are executed server-side against Supabase during static generation.
 */

import { getSupabaseAdapter } from "./db-adapters";

// Types for landing page data
export interface KPIData {
  customers: number;
  orders: number;
  revenue: number;
  products: number;
}

export interface RevenueByRegion {
  region: string;
  revenue: number;
}

export interface DailyRevenue {
  date: string;
  revenue: number;
}

export interface TopProduct {
  name: string;
  category: string;
  units_sold: number;
  revenue: number;
}

export interface StoreLocation {
  name: string;
  state: string | null;
  country: string;
  lat: number;
  lng: number;
  revenue: number;
  employees: number;
}

export interface CategoryRegionSale {
  category: string;
  region: string;
  revenue: number;
}

export interface ProductScatter {
  name: string;
  price: number;
  units_sold: number;
}

export interface LandingPageData {
  kpis: KPIData;
  revenueByRegion: RevenueByRegion[];
  dailyRevenue: DailyRevenue[];
  topProducts: TopProduct[];
  storeLocations: StoreLocation[];
  categoryRegionSales: CategoryRegionSale[];
  productScatter: ProductScatter[];
}

/**
 * Get KPI metrics: customer count, order count, total revenue, products sold
 */
export async function getKPIs(): Promise<KPIData> {
  const adapter = getSupabaseAdapter();

  const [customersResult, ordersResult, revenueResult, productsResult] =
    await Promise.all([
      adapter.query<{ count: string }>(
        "SELECT COUNT(*) as count FROM customers",
      ),
      adapter.query<{ count: string }>("SELECT COUNT(*) as count FROM orders"),
      adapter.query<{ total: string }>(
        "SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE status = 'completed'",
      ),
      adapter.query<{ count: string }>(
        "SELECT COUNT(DISTINCT product_id) as count FROM order_items",
      ),
    ]);

  return {
    customers: parseInt(customersResult.rows[0]?.count ?? "0"),
    orders: parseInt(ordersResult.rows[0]?.count ?? "0"),
    revenue: parseFloat(revenueResult.rows[0]?.total ?? "0"),
    products: parseInt(productsResult.rows[0]?.count ?? "0"),
  };
}

/**
 * Get revenue aggregated by region for bar chart
 */
export async function getRevenueByRegion(): Promise<RevenueByRegion[]> {
  const adapter = getSupabaseAdapter();

  const result = await adapter.query<{ region: string; revenue: string }>(`
    SELECT region, SUM(revenue) as revenue
    FROM category_region_sales
    GROUP BY region
    ORDER BY revenue DESC
  `);

  return result.rows.map((row) => ({
    region: row.region,
    revenue: parseFloat(row.revenue),
  }));
}

/**
 * Get daily revenue trend for the last 30 days for line chart
 */
export async function getDailyRevenueTrend(): Promise<DailyRevenue[]> {
  const adapter = getSupabaseAdapter();

  const result = await adapter.query<{ date: string; revenue: string }>(`
    SELECT date::text, SUM(revenue) as revenue
    FROM daily_metrics
    WHERE date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY date
    ORDER BY date ASC
  `);

  return result.rows.map((row) => ({
    date: row.date,
    revenue: parseFloat(row.revenue),
  }));
}

/**
 * Get top selling products for table
 */
export async function getTopProducts(): Promise<TopProduct[]> {
  const adapter = getSupabaseAdapter();

  const result = await adapter.query<{
    name: string;
    category: string;
    units_sold: string;
    revenue: string;
  }>(`
    SELECT
      p.name,
      p.category,
      SUM(pp.units_sold) as units_sold,
      SUM(pp.revenue) as revenue
    FROM products p
    JOIN product_performance pp ON p.id = pp.product_id
    GROUP BY p.id, p.name, p.category
    ORDER BY revenue DESC
    LIMIT 10
  `);

  return result.rows.map((row) => ({
    name: row.name,
    category: row.category,
    units_sold: parseInt(row.units_sold),
    revenue: parseFloat(row.revenue),
  }));
}

/**
 * Get store locations for map chart
 */
export async function getStoreLocations(): Promise<StoreLocation[]> {
  const adapter = getSupabaseAdapter();

  const result = await adapter.query<{
    name: string;
    state: string | null;
    country: string;
    lat: string;
    lng: string;
    revenue: string;
    employees: string;
  }>(`
    SELECT name, state, country, lat, lng, revenue, employees
    FROM store_locations
    ORDER BY revenue DESC
  `);

  return result.rows.map((row) => ({
    name: row.name,
    state: row.state,
    country: row.country,
    lat: parseFloat(row.lat),
    lng: parseFloat(row.lng),
    revenue: parseFloat(row.revenue),
    employees: parseInt(row.employees),
  }));
}

/**
 * Get category-region sales matrix for heatmap
 */
export async function getCategoryRegionSales(): Promise<CategoryRegionSale[]> {
  const adapter = getSupabaseAdapter();

  const result = await adapter.query<{
    category: string;
    region: string;
    revenue: string;
  }>(`
    SELECT category, region, revenue
    FROM category_region_sales
    ORDER BY category, region
  `);

  return result.rows.map((row) => ({
    category: row.category,
    region: row.region,
    revenue: parseFloat(row.revenue),
  }));
}

/**
 * Get product price vs units sold for scatter plot
 */
export async function getProductPriceVsUnits(): Promise<ProductScatter[]> {
  const adapter = getSupabaseAdapter();

  const result = await adapter.query<{
    name: string;
    price: string;
    units_sold: string;
  }>(`
    SELECT
      p.name,
      p.price,
      COALESCE(SUM(pp.units_sold), 0) as units_sold
    FROM products p
    LEFT JOIN product_performance pp ON p.id = pp.product_id
    WHERE p.price IS NOT NULL
    GROUP BY p.id, p.name, p.price
    ORDER BY p.price ASC
  `);

  return result.rows.map((row) => ({
    name: row.name,
    price: parseFloat(row.price),
    units_sold: parseInt(row.units_sold),
  }));
}

/**
 * Fetch all landing page data in parallel
 */
export async function getLandingPageData(): Promise<LandingPageData> {
  const [
    kpis,
    revenueByRegion,
    dailyRevenue,
    topProducts,
    storeLocations,
    categoryRegionSales,
    productScatter,
  ] = await Promise.all([
    getKPIs(),
    getRevenueByRegion(),
    getDailyRevenueTrend(),
    getTopProducts(),
    getStoreLocations(),
    getCategoryRegionSales(),
    getProductPriceVsUnits(),
  ]);

  return {
    kpis,
    revenueByRegion,
    dailyRevenue,
    topProducts,
    storeLocations,
    categoryRegionSales,
    productScatter,
  };
}
