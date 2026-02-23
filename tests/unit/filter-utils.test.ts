import { describe, it, expect } from "vitest";
import {
  injectFilterParams,
  hasUnresolvedPlaceholders,
  extractPlaceholders,
  removeUnresolvedConditions,
  stripAllUnresolvedPlaceholders,
} from "@/lib/filter-utils";

describe("filter-utils", () => {
  describe("injectFilterParams", () => {
    it("replaces single placeholder", () => {
      const sql = "SELECT * FROM orders WHERE region = '{{region}}'";
      const result = injectFilterParams(sql, { region: "West" });
      expect(result).toBe("SELECT * FROM orders WHERE region = 'West'");
    });

    it("replaces multiple placeholders", () => {
      const sql =
        "SELECT * FROM orders WHERE date BETWEEN '{{date_from}}' AND '{{date_to}}'";
      const result = injectFilterParams(sql, {
        date_from: "2024-01-01",
        date_to: "2024-01-31",
      });
      expect(result).toBe(
        "SELECT * FROM orders WHERE date BETWEEN '2024-01-01' AND '2024-01-31'",
      );
    });

    it("replaces same placeholder multiple times", () => {
      const sql =
        "SELECT '{{region}}' as filter, * FROM orders WHERE region = '{{region}}'";
      const result = injectFilterParams(sql, { region: "East" });
      expect(result).toBe(
        "SELECT 'East' as filter, * FROM orders WHERE region = 'East'",
      );
    });

    it("escapes single quotes in values", () => {
      const sql = "SELECT * FROM customers WHERE name = '{{name}}'";
      const result = injectFilterParams(sql, { name: "O'Brien" });
      expect(result).toBe("SELECT * FROM customers WHERE name = 'O''Brien'");
    });

    it("leaves unmatched placeholders unchanged", () => {
      const sql = "SELECT * FROM orders WHERE status = '{{status}}'";
      const result = injectFilterParams(sql, { region: "West" });
      expect(result).toBe("SELECT * FROM orders WHERE status = '{{status}}'");
    });

    it("handles empty params object", () => {
      const sql = "SELECT * FROM orders WHERE region = '{{region}}'";
      const result = injectFilterParams(sql, {});
      expect(result).toBe(sql);
    });

    it("handles SQL without placeholders", () => {
      const sql = "SELECT * FROM orders";
      const result = injectFilterParams(sql, { region: "West" });
      expect(result).toBe(sql);
    });
  });

  describe("hasUnresolvedPlaceholders", () => {
    it("returns true for SQL with placeholders", () => {
      const sql = "SELECT * FROM orders WHERE region = '{{region}}'";
      expect(hasUnresolvedPlaceholders(sql)).toBe(true);
    });

    it("returns false for SQL without placeholders", () => {
      const sql = "SELECT * FROM orders WHERE region = 'West'";
      expect(hasUnresolvedPlaceholders(sql)).toBe(false);
    });

    it("returns true for partially resolved SQL", () => {
      const sql =
        "SELECT * FROM orders WHERE region = 'West' AND status = '{{status}}'";
      expect(hasUnresolvedPlaceholders(sql)).toBe(true);
    });
  });

  describe("extractPlaceholders", () => {
    it("extracts single placeholder", () => {
      const sql = "SELECT * FROM orders WHERE region = '{{region}}'";
      expect(extractPlaceholders(sql)).toEqual(["region"]);
    });

    it("extracts multiple placeholders", () => {
      const sql =
        "SELECT * FROM orders WHERE date BETWEEN '{{date_from}}' AND '{{date_to}}'";
      const placeholders = extractPlaceholders(sql);
      expect(placeholders).toContain("date_from");
      expect(placeholders).toContain("date_to");
      expect(placeholders.length).toBe(2);
    });

    it("returns unique placeholders", () => {
      const sql =
        "SELECT '{{region}}' as r, * FROM orders WHERE region = '{{region}}'";
      expect(extractPlaceholders(sql)).toEqual(["region"]);
    });

    it("returns empty array for SQL without placeholders", () => {
      const sql = "SELECT * FROM orders";
      expect(extractPlaceholders(sql)).toEqual([]);
    });
  });

  describe("removeUnresolvedConditions", () => {
    it("removes AND condition with unresolved placeholder", () => {
      const sql =
        "SELECT * FROM orders WHERE date > '2024-01-01' AND region = '{{region}}'";
      const result = removeUnresolvedConditions(sql);
      expect(result).toBe("SELECT * FROM orders WHERE date > '2024-01-01'");
    });

    it("removes multiple AND conditions with unresolved placeholders", () => {
      const sql =
        "SELECT * FROM orders WHERE date > '2024-01-01' AND region = '{{region}}' AND category = '{{category}}'";
      const result = removeUnresolvedConditions(sql);
      expect(result).toBe("SELECT * FROM orders WHERE date > '2024-01-01'");
    });

    it("removes IN condition with unresolved placeholder", () => {
      const sql =
        "SELECT * FROM orders WHERE date > '2024-01-01' AND region IN ({{regions}})";
      const result = removeUnresolvedConditions(sql);
      expect(result).toBe("SELECT * FROM orders WHERE date > '2024-01-01'");
    });

    it("replaces WHERE with unresolved placeholder with WHERE 1=1", () => {
      const sql =
        "SELECT * FROM orders WHERE region = '{{region}}' AND date > '2024-01-01'";
      const result = removeUnresolvedConditions(sql);
      expect(result).toBe(
        "SELECT * FROM orders WHERE 1=1 AND date > '2024-01-01'",
      );
    });

    it("leaves resolved conditions unchanged", () => {
      const sql =
        "SELECT * FROM orders WHERE region = 'West' AND date > '2024-01-01'";
      const result = removeUnresolvedConditions(sql);
      expect(result).toBe(
        "SELECT * FROM orders WHERE region = 'West' AND date > '2024-01-01'",
      );
    });

    it("handles LIKE conditions with unresolved placeholders", () => {
      const sql =
        "SELECT * FROM orders WHERE date > '2024-01-01' AND name LIKE '%{{search}}%'";
      const result = removeUnresolvedConditions(sql);
      expect(result).toBe("SELECT * FROM orders WHERE date > '2024-01-01'");
    });

    it("handles SQL without placeholders", () => {
      const sql = "SELECT * FROM orders WHERE region = 'West'";
      const result = removeUnresolvedConditions(sql);
      expect(result).toBe("SELECT * FROM orders WHERE region = 'West'");
    });

    it("removes AND BETWEEN condition with unresolved placeholders", () => {
      const sql =
        "SELECT * FROM orders WHERE region = 'West' AND created_at BETWEEN '{{created_at_from}}' AND '{{created_at_to}}'";
      const result = removeUnresolvedConditions(sql);
      expect(result).toBe("SELECT * FROM orders WHERE region = 'West'");
    });

    it("replaces WHERE BETWEEN with unresolved placeholders with WHERE 1=1", () => {
      const sql =
        "SELECT * FROM orders WHERE created_at BETWEEN '{{date_from}}' AND '{{date_to}}' AND region = 'West'";
      const result = removeUnresolvedConditions(sql);
      expect(result).toBe("SELECT * FROM orders WHERE 1=1 AND region = 'West'");
    });

    it("handles BETWEEN with only one unresolved placeholder", () => {
      const sql =
        "SELECT * FROM orders WHERE region = 'West' AND created_at BETWEEN '2024-01-01' AND '{{date_to}}'";
      const result = removeUnresolvedConditions(sql);
      // This case is tricky - partial BETWEEN isn't valid SQL, so we leave it for error handling
      expect(hasUnresolvedPlaceholders(result)).toBe(true);
    });

    it("removes multiple unresolved conditions including BETWEEN", () => {
      const sql =
        "SELECT * FROM orders WHERE created_at BETWEEN '{{date_from}}' AND '{{date_to}}' AND region = '{{region}}' AND category = 'Electronics'";
      const result = removeUnresolvedConditions(sql);
      expect(result).toBe(
        "SELECT * FROM orders WHERE 1=1 AND category = 'Electronics'",
      );
    });

    it("handles table-qualified columns with aliases", () => {
      const sql =
        "SELECT * FROM orders o WHERE o.region = 'West' AND o.created_at BETWEEN '{{created_at_from}}' AND '{{created_at_to}}'";
      const result = removeUnresolvedConditions(sql);
      expect(result).toBe("SELECT * FROM orders o WHERE o.region = 'West'");
    });

    it("handles >= operator with unquoted placeholder", () => {
      const sql =
        "SELECT * FROM orders WHERE amount >= {{min_amount}} AND region = 'West'";
      const result = removeUnresolvedConditions(sql);
      // WHERE 1=1 AND ... is semantically equivalent to WHERE ...
      expect(result).toBe("SELECT * FROM orders WHERE 1=1 AND region = 'West'");
    });

    it("handles <= operator", () => {
      const sql =
        "SELECT * FROM orders WHERE total <= '{{max_total}}' AND status = 'complete'";
      const result = removeUnresolvedConditions(sql);
      expect(result).toBe(
        "SELECT * FROM orders WHERE 1=1 AND status = 'complete'",
      );
    });

    it("handles != and <> operators", () => {
      const sql =
        "SELECT * FROM orders WHERE status != '{{exclude_status}}' AND region <> '{{exclude_region}}' AND amount > 100";
      const result = removeUnresolvedConditions(sql);
      expect(result).toBe("SELECT * FROM orders WHERE 1=1 AND amount > 100");
    });

    it("handles NOT IN conditions", () => {
      const sql =
        "SELECT * FROM orders WHERE region NOT IN ({{exclude_regions}}) AND status = 'active'";
      const result = removeUnresolvedConditions(sql);
      expect(result).toBe(
        "SELECT * FROM orders WHERE 1=1 AND status = 'active'",
      );
    });

    it("handles NOT LIKE conditions", () => {
      const sql =
        "SELECT * FROM orders WHERE name NOT LIKE '%{{exclude_pattern}}%' AND active = true";
      const result = removeUnresolvedConditions(sql);
      expect(result).toBe("SELECT * FROM orders WHERE 1=1 AND active = true");
    });

    it("handles OR conditions with unresolved placeholders", () => {
      const sql =
        "SELECT * FROM orders WHERE status = 'active' OR region = '{{optional_region}}'";
      const result = removeUnresolvedConditions(sql);
      expect(result).toBe("SELECT * FROM orders WHERE status = 'active'");
    });

    it("handles multiple table aliases in complex query", () => {
      const sql =
        "SELECT o.id, c.name FROM orders o JOIN customers c ON o.customer_id = c.id WHERE o.status = '{{status}}' AND c.region = 'West' AND o.created_at >= '{{date_from}}'";
      const result = removeUnresolvedConditions(sql);
      expect(result).toBe(
        "SELECT o.id, c.name FROM orders o JOIN customers c ON o.customer_id = c.id WHERE 1=1 AND c.region = 'West'",
      );
    });
  });

  describe("stripAllUnresolvedPlaceholders", () => {
    it("handles LIMIT placeholder", () => {
      const sql = "SELECT * FROM orders LIMIT {{limit}}";
      const result = stripAllUnresolvedPlaceholders(sql);
      expect(result).toBe("SELECT * FROM orders LIMIT 1000");
    });

    it("handles OFFSET placeholder", () => {
      const sql = "SELECT * FROM orders LIMIT 100 OFFSET {{offset}}";
      const result = stripAllUnresolvedPlaceholders(sql);
      expect(result).toBe("SELECT * FROM orders LIMIT 100 OFFSET 0");
    });

    it("handles stubborn placeholders that removeUnresolvedConditions misses", () => {
      // Edge case: partial BETWEEN with one placeholder
      const sql =
        "SELECT * FROM orders WHERE created_at BETWEEN '2024-01-01' AND '{{date_to}}'";
      const result = stripAllUnresolvedPlaceholders(sql);
      expect(hasUnresolvedPlaceholders(result)).toBe(false);
    });

    it("replaces remaining placeholders with NULL as last resort", () => {
      // Very complex case that can't be pattern-matched
      const sql = "SELECT COALESCE(data, '{{default}}') FROM table";
      const result = stripAllUnresolvedPlaceholders(sql);
      expect(hasUnresolvedPlaceholders(result)).toBe(false);
      expect(result).toContain("NULL");
    });

    it("handles multiple different placeholder types", () => {
      const sql =
        "SELECT * FROM orders WHERE status = '{{status}}' AND amount >= {{min}} LIMIT {{limit}}";
      const result = stripAllUnresolvedPlaceholders(sql);
      expect(hasUnresolvedPlaceholders(result)).toBe(false);
    });

    it("cleans up empty WHERE clauses", () => {
      const sql =
        "SELECT * FROM orders WHERE region = '{{region}}' GROUP BY category";
      const result = stripAllUnresolvedPlaceholders(sql);
      // After stripping, WHERE 1=1 is left which is valid, or the WHERE is removed
      expect(hasUnresolvedPlaceholders(result)).toBe(false);
      expect(result).toContain("GROUP BY category");
    });

    // Tests for AI-generated defensive SQL patterns
    it("handles CASE WHEN with ELSE TRUE pattern", () => {
      const sql =
        "SELECT * FROM orders WHERE (CASE WHEN '{{date_from}}' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' THEN date >= '{{date_from}}'::date ELSE TRUE END)";
      const result = stripAllUnresolvedPlaceholders(sql);
      expect(hasUnresolvedPlaceholders(result)).toBe(false);
      // Should not contain invalid date cast
      expect(result).not.toContain("'NULL'::date");
    });

    it("handles CASE WHEN with THEN TRUE ELSE condition pattern", () => {
      const sql =
        "SELECT * FROM orders WHERE (CASE WHEN '{{region}}' LIKE 'NULL' OR '{{region}}' = '' THEN TRUE ELSE region = '{{region}}' END)";
      const result = stripAllUnresolvedPlaceholders(sql);
      expect(hasUnresolvedPlaceholders(result)).toBe(false);
    });

    it("handles quoted placeholder with type cast", () => {
      const sql = "SELECT * FROM orders WHERE date >= '{{date_from}}'::date";
      const result = stripAllUnresolvedPlaceholders(sql);
      expect(hasUnresolvedPlaceholders(result)).toBe(false);
      // Should replace with NULL (SQL keyword), not 'NULL' (string)
      expect(result).not.toContain("'NULL'");
    });

    it("handles to_date function with placeholder", () => {
      const sql =
        "SELECT * FROM orders WHERE date >= to_date('{{date_from}}', 'YYYY-MM-DD')";
      const result = stripAllUnresolvedPlaceholders(sql);
      expect(hasUnresolvedPlaceholders(result)).toBe(false);
    });

    it("handles COALESCE NULLIF pattern", () => {
      const sql =
        "SELECT * FROM orders WHERE region = COALESCE(NULLIF('{{region}}', ''), region)";
      const result = stripAllUnresolvedPlaceholders(sql);
      expect(hasUnresolvedPlaceholders(result)).toBe(false);
    });

    it("handles complex WHERE with multiple CASE WHEN patterns", () => {
      const sql = `SELECT * FROM orders WHERE
        (CASE WHEN '{{date_from}}' ~ '^[0-9]' THEN date >= '{{date_from}}'::date ELSE TRUE END) AND
        (CASE WHEN '{{region}}' LIKE 'NULL' THEN TRUE ELSE region = '{{region}}' END) AND
        status = 'active'`;
      const result = stripAllUnresolvedPlaceholders(sql);
      expect(hasUnresolvedPlaceholders(result)).toBe(false);
      expect(result).toContain("status = 'active'");
    });

    it("cleans up AND TRUE patterns", () => {
      const sql = "SELECT * FROM orders WHERE TRUE AND region = 'West'";
      const result = stripAllUnresolvedPlaceholders(sql);
      expect(result).toBe("SELECT * FROM orders WHERE region = 'West'");
    });

    it("handles real-world AI query pattern", () => {
      // Real pattern from user's error report
      const sql = `SELECT COALESCE(SUM(revenue),0) AS total_revenue FROM public.daily_metrics
        WHERE (CASE WHEN '{{date_from}}' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' THEN date >= '{{date_from}}'::date ELSE TRUE END)
        AND (CASE WHEN '{{date_to}}' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' THEN date <= '{{date_to}}'::date ELSE TRUE END)
        AND (CASE WHEN '{{region}}' IS NULL OR '{{region}}' = '' THEN TRUE ELSE region = '{{region}}' END)`;
      const result = stripAllUnresolvedPlaceholders(sql);
      expect(hasUnresolvedPlaceholders(result)).toBe(false);
      // Should not produce invalid SQL like 'NULL'::date
      expect(result).not.toMatch(/'NULL'::\w+/);
    });
  });
});
