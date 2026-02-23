import { describe, it, expect } from "vitest";
import { validateQuery } from "@/lib/query-validator";

describe("validateQuery", () => {
  describe("valid queries", () => {
    it("allows simple SELECT queries", () => {
      const result = validateQuery("SELECT * FROM users");
      expect(result.valid).toBe(true);
    });

    it("allows SELECT queries with conditions", () => {
      const result = validateQuery(
        "SELECT name, email FROM users WHERE id = 1",
      );
      expect(result.valid).toBe(true);
    });

    it("allows SELECT queries with joins", () => {
      const result = validateQuery(
        "SELECT u.name, o.total FROM users u JOIN orders o ON u.id = o.user_id",
      );
      expect(result.valid).toBe(true);
    });

    it("allows WITH (CTE) queries", () => {
      const result = validateQuery(
        "WITH totals AS (SELECT SUM(amount) FROM orders) SELECT * FROM totals",
      );
      expect(result.valid).toBe(true);
    });

    it("allows lowercase select", () => {
      const result = validateQuery("select * from users");
      expect(result.valid).toBe(true);
    });

    it("allows aggregate functions", () => {
      const result = validateQuery(
        "SELECT COUNT(*), SUM(amount), AVG(price) FROM orders",
      );
      expect(result.valid).toBe(true);
    });

    it("allows GROUP BY and ORDER BY", () => {
      const result = validateQuery(
        "SELECT category, COUNT(*) FROM products GROUP BY category ORDER BY COUNT(*) DESC",
      );
      expect(result.valid).toBe(true);
    });
  });

  describe("disallowed operations", () => {
    it("rejects INSERT statements", () => {
      const result = validateQuery("INSERT INTO users (name) VALUES ('test')");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("disallowed");
    });

    it("rejects UPDATE statements", () => {
      const result = validateQuery("UPDATE users SET name = 'test'");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("disallowed");
    });

    it("rejects DELETE statements", () => {
      const result = validateQuery("DELETE FROM users");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("disallowed");
    });

    it("rejects DROP statements", () => {
      const result = validateQuery("DROP TABLE users");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("disallowed");
    });

    it("rejects CREATE statements", () => {
      const result = validateQuery("CREATE TABLE test (id INT)");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("disallowed");
    });

    it("rejects ALTER statements", () => {
      const result = validateQuery("ALTER TABLE users ADD COLUMN age INT");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("disallowed");
    });

    it("rejects TRUNCATE statements", () => {
      const result = validateQuery("TRUNCATE TABLE users");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("disallowed");
    });

    it("rejects EXECUTE statements", () => {
      const result = validateQuery("EXECUTE some_procedure()");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("disallowed");
    });
  });

  describe("SQL injection prevention", () => {
    it("rejects SQL comments", () => {
      const result = validateQuery("SELECT * FROM users -- WHERE id = 1");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("disallowed");
    });

    it("rejects block comments", () => {
      const result = validateQuery("SELECT * FROM users /* comment */");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("disallowed");
    });

    it("rejects multiple statements", () => {
      const result = validateQuery("SELECT * FROM users; DROP TABLE users");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("disallowed");
    });

    it("rejects pg_sleep function", () => {
      const result = validateQuery("SELECT pg_sleep(10)");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("disallowed");
    });

    it("rejects pg_read_file function", () => {
      const result = validateQuery("SELECT pg_read_file('/etc/passwd')");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("disallowed");
    });
  });

  describe("query validation", () => {
    it("rejects empty queries", () => {
      const result = validateQuery("");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("length");
    });

    it("rejects very long queries", () => {
      const longQuery = "SELECT * FROM users WHERE name = '" + "a".repeat(5001);
      const result = validateQuery(longQuery);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("length");
    });

    it("rejects non-SELECT queries", () => {
      const result = validateQuery("SHOW TABLES");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Only SELECT queries allowed");
    });
  });
});
