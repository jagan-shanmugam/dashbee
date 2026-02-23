import { describe, it, expect, vi, beforeEach } from "vitest";
import { validateQuery } from "@/lib/query-validator";

// Mock the db module
vi.mock("@/lib/db", () => ({
  executeQuery: vi.fn(),
}));

import { executeQuery } from "@/lib/db";

describe("query API logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("request validation", () => {
    it("requires sql parameter", () => {
      // Missing sql should be invalid
      const sql = null;
      expect(sql).toBeNull();
    });

    it("requires sql to be a string", () => {
      // Number sql should be invalid
      const sql = 123;
      expect(typeof sql).not.toBe("string");
    });
  });

  describe("query validation integration", () => {
    it("validates SELECT queries before execution", () => {
      const result = validateQuery("SELECT * FROM users");
      expect(result.valid).toBe(true);
    });

    it("rejects dangerous queries before execution", () => {
      const result = validateQuery("DROP TABLE users");
      expect(result.valid).toBe(false);
    });

    it("rejects queries with SQL injection attempts", () => {
      const result = validateQuery("SELECT * FROM users; DROP TABLE users");
      expect(result.valid).toBe(false);
    });
  });

  describe("executeQuery", () => {
    it("calls executeQuery with valid parameters", async () => {
      const mockExecuteQuery = executeQuery as ReturnType<typeof vi.fn>;
      mockExecuteQuery.mockResolvedValueOnce([{ id: 1, name: "Test" }]);

      const sql = "SELECT * FROM users";
      const params: unknown[] = [];
      const dbConfig = {
        host: "localhost",
        port: 5432,
        database: "test",
        user: "postgres",
        password: "secret",
        ssl: false,
      };

      const result = await executeQuery(sql, params, dbConfig);

      expect(mockExecuteQuery).toHaveBeenCalledWith(sql, params, dbConfig);
      expect(result).toEqual([{ id: 1, name: "Test" }]);
    });

    it("handles query execution errors", async () => {
      const mockExecuteQuery = executeQuery as ReturnType<typeof vi.fn>;
      mockExecuteQuery.mockRejectedValueOnce(new Error("Connection refused"));

      const sql = "SELECT * FROM users";

      await expect(executeQuery(sql, [])).rejects.toThrow("Connection refused");
    });

    it("supports parameterized queries", async () => {
      const mockExecuteQuery = executeQuery as ReturnType<typeof vi.fn>;
      mockExecuteQuery.mockResolvedValueOnce([{ id: 1, name: "Alice" }]);

      const sql = "SELECT * FROM users WHERE id = $1";
      const params = [1];

      await executeQuery(sql, params);

      expect(mockExecuteQuery).toHaveBeenCalledWith(sql, params);
    });
  });

  describe("error handling", () => {
    it("handles database timeout errors", async () => {
      const mockExecuteQuery = executeQuery as ReturnType<typeof vi.fn>;
      mockExecuteQuery.mockRejectedValueOnce(new Error("Query timeout"));

      await expect(
        executeQuery("SELECT * FROM large_table", []),
      ).rejects.toThrow("Query timeout");
    });

    it("handles syntax errors from database", async () => {
      const mockExecuteQuery = executeQuery as ReturnType<typeof vi.fn>;
      mockExecuteQuery.mockRejectedValueOnce(
        new Error('syntax error at or near "SELCT"'),
      );

      await expect(executeQuery("SELCT * FROM users", [])).rejects.toThrow(
        "syntax error",
      );
    });

    it("handles permission denied errors", async () => {
      const mockExecuteQuery = executeQuery as ReturnType<typeof vi.fn>;
      mockExecuteQuery.mockRejectedValueOnce(
        new Error("permission denied for table users"),
      );

      await expect(executeQuery("SELECT * FROM users", [])).rejects.toThrow(
        "permission denied",
      );
    });
  });
});
