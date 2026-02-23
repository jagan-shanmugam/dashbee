import { describe, it, expect } from "vitest";
import {
  buildFilteredQuery,
  buildAutoFilteredQuery,
  inferFilterMeta,
  validateFilterMeta,
  createDateRangeFilterMeta,
  createEqualityFilterMeta,
  FilterMeta,
} from "@/lib/filter-metadata";

describe("filter-metadata", () => {
  describe("buildFilteredQuery", () => {
    it("builds query with single equality filter", () => {
      const baseQuery =
        "SELECT region, SUM(revenue) FROM daily_metrics GROUP BY region";
      const filterMeta: FilterMeta[] = [
        { id: "region", column: "region", operator: "eq", type: "text" },
      ];
      const filterValues = { region: "West" };

      const result = buildFilteredQuery(baseQuery, filterMeta, filterValues);

      expect(result.sql).toContain("WHERE region = $1");
      expect(result.params).toEqual(["West"]);
    });

    it("builds query with date range filters", () => {
      const baseQuery = "SELECT date, revenue FROM daily_metrics";
      const filterMeta: FilterMeta[] = [
        { id: "date_from", column: "date", operator: "gte", type: "date" },
        { id: "date_to", column: "date", operator: "lte", type: "date" },
      ];
      const filterValues = { date_from: "2024-01-01", date_to: "2024-01-31" };

      const result = buildFilteredQuery(baseQuery, filterMeta, filterValues);

      expect(result.sql).toContain("WHERE date >= $1 AND date <= $2");
      expect(result.params).toEqual(["2024-01-01", "2024-01-31"]);
    });

    it("builds query with IN clause", () => {
      const baseQuery = "SELECT * FROM orders";
      const filterMeta: FilterMeta[] = [
        { id: "status", column: "status", operator: "in", type: "text" },
      ];
      const filterValues = { status: ["pending", "processing", "shipped"] };

      const result = buildFilteredQuery(baseQuery, filterMeta, filterValues);

      expect(result.sql).toContain("WHERE status IN ($1, $2, $3)");
      expect(result.params).toEqual(["pending", "processing", "shipped"]);
    });

    it("builds query with BETWEEN operator", () => {
      const baseQuery = "SELECT * FROM products";
      const filterMeta: FilterMeta[] = [
        {
          id: "price_range",
          column: "price",
          operator: "between",
          type: "number",
        },
      ];
      const filterValues = { price_range: ["10", "100"] };

      const result = buildFilteredQuery(baseQuery, filterMeta, filterValues);

      expect(result.sql).toContain("WHERE price BETWEEN $1 AND $2");
      expect(result.params).toEqual([10, 100]);
    });

    it("builds query with table-qualified column", () => {
      const baseQuery =
        "SELECT dm.region FROM daily_metrics dm JOIN stores s ON dm.store_id = s.id";
      const filterMeta: FilterMeta[] = [
        {
          id: "region",
          column: "region",
          operator: "eq",
          type: "text",
          table: "dm",
        },
      ];
      const filterValues = { region: "East" };

      const result = buildFilteredQuery(baseQuery, filterMeta, filterValues);

      expect(result.sql).toContain("WHERE dm.region = $1");
      expect(result.params).toEqual(["East"]);
    });

    it("skips empty filter values", () => {
      const baseQuery = "SELECT * FROM orders";
      const filterMeta: FilterMeta[] = [
        { id: "region", column: "region", operator: "eq", type: "text" },
        { id: "status", column: "status", operator: "eq", type: "text" },
      ];
      const filterValues = { region: "West", status: "" };

      const result = buildFilteredQuery(baseQuery, filterMeta, filterValues);

      expect(result.sql).toContain("WHERE region = $1");
      expect(result.params).toEqual(["West"]);
      expect(result.sql).not.toContain("status");
    });

    it("skips undefined filter values", () => {
      const baseQuery = "SELECT * FROM orders";
      const filterMeta: FilterMeta[] = [
        { id: "region", column: "region", operator: "eq", type: "text" },
        { id: "status", column: "status", operator: "eq", type: "text" },
      ];
      const filterValues = { region: "West" };

      const result = buildFilteredQuery(baseQuery, filterMeta, filterValues);

      expect(result.sql).toContain("WHERE region = $1");
      expect(result.params).toEqual(["West"]);
    });

    it("skips empty array filter values", () => {
      const baseQuery = "SELECT * FROM orders";
      const filterMeta: FilterMeta[] = [
        { id: "categories", column: "category", operator: "in", type: "text" },
      ];
      const filterValues = { categories: [] };

      const result = buildFilteredQuery(baseQuery, filterMeta, filterValues);

      expect(result.whereClause).toBe("");
      expect(result.params).toEqual([]);
    });

    it("returns query without WHERE when no filters apply", () => {
      const baseQuery = "SELECT * FROM orders";
      const filterMeta: FilterMeta[] = [
        { id: "region", column: "region", operator: "eq", type: "text" },
      ];
      const filterValues = {};

      const result = buildFilteredQuery(baseQuery, filterMeta, filterValues);

      expect(result.whereClause).toBe("");
      expect(result.sql).toBe("SELECT * FROM orders");
      expect(result.params).toEqual([]);
    });

    it("strips trailing semicolons from base query", () => {
      const baseQuery = "SELECT * FROM orders;";
      const filterMeta: FilterMeta[] = [
        { id: "region", column: "region", operator: "eq", type: "text" },
      ];
      const filterValues = { region: "West" };

      const result = buildFilteredQuery(baseQuery, filterMeta, filterValues);

      expect(result.sql).not.toContain(";");
      expect(result.sql).toContain("WHERE region = $1");
    });

    // New tests for WHERE injection behavior
    it("injects WHERE before GROUP BY in aggregate queries", () => {
      const baseQuery =
        "SELECT region, SUM(revenue) as total FROM daily_metrics GROUP BY region";
      const filterMeta: FilterMeta[] = [
        { id: "date_from", column: "date", operator: "gte", type: "date" },
        { id: "date_to", column: "date", operator: "lte", type: "date" },
      ];
      const filterValues = { date_from: "2024-01-01", date_to: "2024-12-31" };

      const result = buildFilteredQuery(baseQuery, filterMeta, filterValues);

      // The WHERE should be injected BEFORE GROUP BY, not as a subquery wrapper
      expect(result.sql).toContain("WHERE date >= $1 AND date <= $2 GROUP BY region");
      expect(result.params).toEqual(["2024-01-01", "2024-12-31"]);
    });

    it("injects WHERE before ORDER BY in queries without GROUP BY", () => {
      const baseQuery = "SELECT id, name FROM products ORDER BY name";
      const filterMeta: FilterMeta[] = [
        { id: "category", column: "category", operator: "eq", type: "text" },
      ];
      const filterValues = { category: "Electronics" };

      const result = buildFilteredQuery(baseQuery, filterMeta, filterValues);

      expect(result.sql).toContain("WHERE category = $1 ORDER BY name");
      expect(result.params).toEqual(["Electronics"]);
    });

    it("injects WHERE before LIMIT", () => {
      const baseQuery = "SELECT * FROM orders LIMIT 10";
      const filterMeta: FilterMeta[] = [
        { id: "status", column: "status", operator: "eq", type: "text" },
      ];
      const filterValues = { status: "pending" };

      const result = buildFilteredQuery(baseQuery, filterMeta, filterValues);

      expect(result.sql).toContain("WHERE status = $1 LIMIT 10");
      expect(result.params).toEqual(["pending"]);
    });

    it("adds AND to existing WHERE clause", () => {
      const baseQuery = "SELECT * FROM orders WHERE status = 'active'";
      const filterMeta: FilterMeta[] = [
        { id: "region", column: "region", operator: "eq", type: "text" },
      ];
      const filterValues = { region: "West" };

      const result = buildFilteredQuery(baseQuery, filterMeta, filterValues);

      expect(result.sql).toContain("WHERE status = 'active' AND region = $1");
      expect(result.params).toEqual(["West"]);
    });

    it("adds AND to existing WHERE clause before GROUP BY", () => {
      const baseQuery =
        "SELECT region, COUNT(*) FROM orders WHERE status = 'completed' GROUP BY region";
      const filterMeta: FilterMeta[] = [
        { id: "date_from", column: "created_at", operator: "gte", type: "date" },
      ];
      const filterValues = { date_from: "2024-01-01" };

      const result = buildFilteredQuery(baseQuery, filterMeta, filterValues);

      expect(result.sql).toContain("WHERE status = 'completed' AND created_at >= $1 GROUP BY region");
      expect(result.params).toEqual(["2024-01-01"]);
    });

    it("handles complex aggregate query with date filter on non-output column", () => {
      // This was the original bug - filtering by 'date' on a query that aggregates without date in output
      const baseQuery = `SELECT
        COALESCE(SUM(revenue), 0) AS total_revenue,
        COALESCE(SUM(orders), 0) AS total_orders
      FROM daily_metrics`;
      const filterMeta: FilterMeta[] = [
        { id: "date_from", column: "date", operator: "gte", type: "date" },
        { id: "date_to", column: "date", operator: "lte", type: "date" },
      ];
      const filterValues = { date_from: "2024-01-01", date_to: "2024-12-31" };

      const result = buildFilteredQuery(baseQuery, filterMeta, filterValues);

      // Should inject WHERE into the query, not wrap in subquery
      expect(result.sql).toContain("FROM daily_metrics WHERE date >= $1 AND date <= $2");
      expect(result.params).toEqual(["2024-01-01", "2024-12-31"]);
    });

    it("handles LIKE operator", () => {
      const baseQuery = "SELECT * FROM products";
      const filterMeta: FilterMeta[] = [
        { id: "name", column: "name", operator: "like", type: "text" },
      ];
      const filterValues = { name: "%widget%" };

      const result = buildFilteredQuery(baseQuery, filterMeta, filterValues);

      expect(result.sql).toContain("WHERE name LIKE $1");
      expect(result.params).toEqual(["%widget%"]);
    });

    it("handles ILIKE operator for case-insensitive search", () => {
      const baseQuery = "SELECT * FROM products";
      const filterMeta: FilterMeta[] = [
        { id: "name", column: "name", operator: "ilike", type: "text" },
      ];
      const filterValues = { name: "%WIDGET%" };

      const result = buildFilteredQuery(baseQuery, filterMeta, filterValues);

      expect(result.sql).toContain("WHERE name ILIKE $1");
      expect(result.params).toEqual(["%WIDGET%"]);
    });

    it("handles NOT IN operator", () => {
      const baseQuery = "SELECT * FROM orders";
      const filterMeta: FilterMeta[] = [
        { id: "status", column: "status", operator: "not_in", type: "text" },
      ];
      const filterValues = { status: ["cancelled", "refunded"] };

      const result = buildFilteredQuery(baseQuery, filterMeta, filterValues);

      expect(result.sql).toContain("WHERE status NOT IN ($1, $2)");
      expect(result.params).toEqual(["cancelled", "refunded"]);
    });

    it("casts number type correctly", () => {
      const baseQuery = "SELECT * FROM products";
      const filterMeta: FilterMeta[] = [
        { id: "min_price", column: "price", operator: "gte", type: "number" },
      ];
      const filterValues = { min_price: "99.99" };

      const result = buildFilteredQuery(baseQuery, filterMeta, filterValues);

      expect(result.params).toEqual([99.99]);
      expect(typeof result.params[0]).toBe("number");
    });

    it("casts boolean type correctly", () => {
      const baseQuery = "SELECT * FROM products";
      const filterMeta: FilterMeta[] = [
        { id: "active", column: "is_active", operator: "eq", type: "boolean" },
      ];
      const filterValues = { active: "true" };

      const result = buildFilteredQuery(baseQuery, filterMeta, filterValues);

      expect(result.params).toEqual([true]);
      expect(typeof result.params[0]).toBe("boolean");
    });

    it("handles multiple filters with mixed operators", () => {
      const baseQuery = "SELECT * FROM orders";
      const filterMeta: FilterMeta[] = [
        {
          id: "date_from",
          column: "created_at",
          operator: "gte",
          type: "date",
        },
        { id: "date_to", column: "created_at", operator: "lte", type: "date" },
        { id: "region", column: "region", operator: "eq", type: "text" },
        { id: "min_amount", column: "amount", operator: "gte", type: "number" },
      ];
      const filterValues = {
        date_from: "2024-01-01",
        date_to: "2024-12-31",
        region: "West",
        min_amount: "100",
      };

      const result = buildFilteredQuery(baseQuery, filterMeta, filterValues);

      expect(result.sql).toContain("WHERE");
      expect(result.sql).toContain("created_at >= $1");
      expect(result.sql).toContain("created_at <= $2");
      expect(result.sql).toContain("region = $3");
      expect(result.sql).toContain("amount >= $4");
      expect(result.params).toEqual(["2024-01-01", "2024-12-31", "West", 100]);
    });
  });

  describe("validateFilterMeta", () => {
    it("returns valid for correct filter metadata", () => {
      const filterMeta: FilterMeta[] = [
        { id: "region", column: "region", operator: "eq", type: "text" },
        { id: "date_from", column: "date", operator: "gte", type: "date" },
      ];

      const result = validateFilterMeta(filterMeta);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("detects duplicate filter IDs", () => {
      const filterMeta: FilterMeta[] = [
        { id: "region", column: "region", operator: "eq", type: "text" },
        { id: "region", column: "country", operator: "eq", type: "text" },
      ];

      const result = validateFilterMeta(filterMeta);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Duplicate filter ID: region");
    });

    it("detects missing required fields", () => {
      const filterMeta = [
        { id: "", column: "region", operator: "eq", type: "text" },
      ] as FilterMeta[];

      const result = validateFilterMeta(filterMeta);

      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.includes("missing required 'id'")),
      ).toBe(true);
    });

    it("returns valid for empty array", () => {
      const result = validateFilterMeta([]);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe("createDateRangeFilterMeta", () => {
    it("creates date range filter metadata", () => {
      const result = createDateRangeFilterMeta("created_at");

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: "date_from",
        column: "created_at",
        operator: "gte",
        type: "date",
        table: undefined,
      });
      expect(result[1]).toEqual({
        id: "date_to",
        column: "created_at",
        operator: "lte",
        type: "date",
        table: undefined,
      });
    });

    it("includes table alias when provided", () => {
      const result = createDateRangeFilterMeta("date", "dm");

      expect(result[0].table).toBe("dm");
      expect(result[1].table).toBe("dm");
    });
  });

  describe("createEqualityFilterMeta", () => {
    it("creates equality filter metadata with defaults", () => {
      const result = createEqualityFilterMeta("region", "region");

      expect(result).toEqual({
        id: "region",
        column: "region",
        operator: "eq",
        type: "text",
        table: undefined,
      });
    });

    it("creates equality filter with custom type", () => {
      const result = createEqualityFilterMeta("min_qty", "quantity", "number");

      expect(result.type).toBe("number");
    });

    it("creates equality filter with table alias", () => {
      const result = createEqualityFilterMeta("region", "region", "text", "dm");

      expect(result.table).toBe("dm");
    });
  });

  describe("inferFilterMeta", () => {
    it("infers date_from as date gte filter", () => {
      const result = inferFilterMeta({ date_from: "2024-01-01" });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: "date_from",
        column: "date",
        operator: "gte",
        type: "date",
      });
    });

    it("infers date_to as date lte filter", () => {
      const result = inferFilterMeta({ date_to: "2024-12-31" });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: "date_to",
        column: "date",
        operator: "lte",
        type: "date",
      });
    });

    it("infers category as equality filter", () => {
      const result = inferFilterMeta({ category: "Electronics" });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: "category",
        column: "category",
        operator: "eq",
        type: "text",
      });
    });

    it("infers category array as IN filter", () => {
      const result = inferFilterMeta({ category: ["Electronics", "Clothing"] });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: "category",
        column: "category",
        operator: "in",
        type: "text",
      });
    });

    it("infers _id suffix as number equality filter", () => {
      const result = inferFilterMeta({ customer_id: "123" });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: "customer_id",
        column: "customer_id",
        operator: "eq",
        type: "number",
      });
    });

    it("infers _min suffix as gte filter", () => {
      const result = inferFilterMeta({ price_min: "10" });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: "price_min",
        column: "price",
        operator: "gte",
        type: "number",
      });
    });

    it("infers _max suffix as lte filter", () => {
      const result = inferFilterMeta({ price_max: "100" });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: "price_max",
        column: "price",
        operator: "lte",
        type: "number",
      });
    });

    it("skips empty values", () => {
      const result = inferFilterMeta({
        date_from: "2024-01-01",
        category: "",
        region: undefined as unknown as string,
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("date_from");
    });

    it("skips empty arrays", () => {
      const result = inferFilterMeta({ category: [] });

      expect(result).toHaveLength(0);
    });

    it("infers multiple filters at once", () => {
      const result = inferFilterMeta({
        date_from: "2024-01-01",
        date_to: "2024-12-31",
        region: "West",
        category: ["A", "B"],
      });

      expect(result).toHaveLength(4);
      expect(result.map((m: FilterMeta) => m.id).sort()).toEqual([
        "category",
        "date_from",
        "date_to",
        "region",
      ]);
    });

    it("handles common filter names", () => {
      const filterNames = [
        "region",
        "status",
        "type",
        "department",
        "product",
        "customer",
        "country",
        "state",
        "city",
      ];

      for (const name of filterNames) {
        const result = inferFilterMeta({ [name]: "test" });
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(name);
        expect(result[0].column).toBe(name);
      }
    });

    it("returns empty array for unknown filter names", () => {
      const result = inferFilterMeta({ unknown_filter: "value" });

      expect(result).toHaveLength(0);
    });
  });

  describe("buildAutoFilteredQuery", () => {
    it("builds filtered query with inferred metadata", () => {
      // SQL must contain a recognized date column for date filters to be inferred
      const baseQuery = "SELECT date, category, amount FROM daily_metrics";
      const filterParams = { date_from: "2024-01-01", category: "Electronics" };

      const result = buildAutoFilteredQuery(baseQuery, filterParams);

      expect(result).not.toBeNull();
      expect(result.sql).toContain("WHERE");
      expect(result.sql).toContain("date >= $1");
      expect(result.sql).toContain("category = $2");
      expect(result.params).toContain("2024-01-01");
      expect(result.params).toContain("Electronics");
    });

    it("returns null when no filters can be inferred", () => {
      const baseQuery = "SELECT * FROM orders";
      const filterParams = { unknown_filter: "value" };

      const result = buildAutoFilteredQuery(baseQuery, filterParams);

      expect(result).toBeNull();
    });

    it("returns null for empty filter params", () => {
      const baseQuery = "SELECT * FROM orders";
      const filterParams = {};

      const result = buildAutoFilteredQuery(baseQuery, filterParams);

      expect(result).toBeNull();
    });

    it("handles array values for IN clause", () => {
      const baseQuery = "SELECT * FROM products";
      const filterParams = { category: ["A", "B", "C"] };

      const result = buildAutoFilteredQuery(baseQuery, filterParams);

      expect(result).not.toBeNull();
      expect(result.sql).toContain("IN ($1, $2, $3)");
      expect(result.params).toEqual(["A", "B", "C"]);
    });

    it("strips trailing semicolons", () => {
      // SQL must contain a recognized date column for date filters to be inferred
      const baseQuery = "SELECT date, order_id FROM orders;";
      const filterParams = { date_from: "2024-01-01" };

      const result = buildAutoFilteredQuery(baseQuery, filterParams);

      expect(result).not.toBeNull();
      expect(result!.sql).not.toContain(";");
      expect(result!.sql).toContain("WHERE date >= $1");
    });

    it("handles aggregate queries by injecting WHERE before GROUP BY", () => {
      // SQL must contain a recognized date column for date filters to be inferred
      const baseQuery = "SELECT date, category, SUM(amount) as total FROM sales GROUP BY date, category";
      const filterParams = { date_from: "2024-01-01", date_to: "2024-12-31" };

      const result = buildAutoFilteredQuery(baseQuery, filterParams);

      expect(result).not.toBeNull();
      // Should inject WHERE before GROUP BY
      expect(result!.sql).toContain("WHERE date >= $1 AND date <= $2 GROUP BY date, category");
    });
  });
});
