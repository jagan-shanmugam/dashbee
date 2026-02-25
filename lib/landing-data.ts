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
 * Fallback data for when database is unreachable (e.g., during Vercel build)
 */
const FALLBACK_DATA: LandingPageData = {
  kpis: { customers: 1250, orders: 3847, revenue: 284650, products: 45 },
  revenueByRegion: [
    { region: "West", revenue: 82500 },
    { region: "Northeast", revenue: 71200 },
    { region: "South", revenue: 58400 },
    { region: "Midwest", revenue: 42300 },
    { region: "Europe", revenue: 18500 },
    { region: "Asia", revenue: 11750 },
  ],
  dailyRevenue: Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split("T")[0]!,
    revenue: 8000 + Math.random() * 4000,
  })),
  topProducts: [
    { name: "Premium Widget", category: "Electronics", units_sold: 342, revenue: 34200 },
    { name: "Deluxe Gadget", category: "Electronics", units_sold: 256, revenue: 25600 },
    { name: "Pro Tool Set", category: "Tools", units_sold: 189, revenue: 18900 },
    { name: "Smart Device", category: "Electronics", units_sold: 167, revenue: 16700 },
    { name: "Basic Kit", category: "Tools", units_sold: 145, revenue: 7250 },
  ],
  storeLocations: [
    { name: "San Francisco HQ", state: "California", country: "United States", lat: 37.7749, lng: -122.4194, revenue: 45000, employees: 25 },
    { name: "New York Store", state: "New York", country: "United States", lat: 40.7128, lng: -74.006, revenue: 38000, employees: 18 },
    { name: "Chicago Branch", state: "Illinois", country: "United States", lat: 41.8781, lng: -87.6298, revenue: 28000, employees: 12 },
    { name: "Austin Office", state: "Texas", country: "United States", lat: 30.2672, lng: -97.7431, revenue: 22000, employees: 10 },
  ],
  categoryRegionSales: [
    { category: "Electronics", region: "Asia", revenue: 4500 },
    { category: "Electronics", region: "Europe", revenue: 8200 },
    { category: "Electronics", region: "Midwest", revenue: 12400 },
    { category: "Electronics", region: "Northeast", revenue: 28500 },
    { category: "Electronics", region: "South", revenue: 18200 },
    { category: "Electronics", region: "West", revenue: 32100 },
    { category: "Clothing", region: "Asia", revenue: 3200 },
    { category: "Clothing", region: "Europe", revenue: 5100 },
    { category: "Clothing", region: "Midwest", revenue: 8900 },
    { category: "Clothing", region: "Northeast", revenue: 15400 },
    { category: "Clothing", region: "South", revenue: 12800 },
    { category: "Clothing", region: "West", revenue: 18700 },
    { category: "Tools", region: "Asia", revenue: 2100 },
    { category: "Tools", region: "Europe", revenue: 3400 },
    { category: "Tools", region: "Midwest", revenue: 11200 },
    { category: "Tools", region: "Northeast", revenue: 14800 },
    { category: "Tools", region: "South", revenue: 16500 },
    { category: "Tools", region: "West", revenue: 19200 },
    { category: "Home", region: "Asia", revenue: 1950 },
    { category: "Home", region: "Europe", revenue: 1800 },
    { category: "Home", region: "Midwest", revenue: 9800 },
    { category: "Home", region: "Northeast", revenue: 12500 },
    { category: "Home", region: "South", revenue: 10900 },
    { category: "Home", region: "West", revenue: 12500 },
  ],
  productScatter: [
    { name: "Budget Item", price: 9.99, units_sold: 520 },
    { name: "Standard Product", price: 29.99, units_sold: 340 },
    { name: "Quality Goods", price: 59.99, units_sold: 180 },
    { name: "Premium Option", price: 99.99, units_sold: 95 },
    { name: "Luxury Edition", price: 199.99, units_sold: 42 },
    { name: "Economy Pack", price: 14.99, units_sold: 410 },
    { name: "Value Bundle", price: 39.99, units_sold: 245 },
    { name: "Pro Version", price: 149.99, units_sold: 68 },
  ],
};

/**
 * Fetch all landing page data in parallel (with fallback for build failures)
 */
export async function getLandingPageData(): Promise<LandingPageData> {
  try {
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
  } catch (error) {
    console.warn("Failed to fetch landing page data from database, using fallback:", error);
    return FALLBACK_DATA;
  }
}
