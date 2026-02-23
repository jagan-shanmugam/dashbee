import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DBConfig, DatabaseAdapter } from "@/lib/db-adapters/types";

// Test the adapter interface and factory functions
// Actual database connections are tested in integration/e2e tests

describe("db-adapters", () => {
  describe("DBConfig type", () => {
    it("supports postgresql config", () => {
      const config: DBConfig = {
        type: "postgresql",
        host: "localhost",
        port: 5432,
        database: "test",
        user: "postgres",
        password: "password",
        ssl: false,
      };

      expect(config.type).toBe("postgresql");
      expect(config.port).toBe(5432);
    });

    it("supports mysql config", () => {
      const config: DBConfig = {
        type: "mysql",
        host: "localhost",
        port: 3306,
        database: "test",
        user: "root",
        password: "password",
        ssl: false,
      };

      expect(config.type).toBe("mysql");
      expect(config.port).toBe(3306);
    });

    it("supports sqlite config with filename", () => {
      const config: DBConfig = {
        type: "sqlite",
        host: "",
        port: 0,
        database: "",
        user: "",
        password: "",
        ssl: false,
        filename: "/path/to/database.db",
      };

      expect(config.type).toBe("sqlite");
      expect(config.filename).toBe("/path/to/database.db");
    });
  });

  describe("PostgreSQL adapter", () => {
    beforeEach(() => {
      vi.resetModules();
    });

    it("creates adapter with correct type", async () => {
      // Mock pg module with a proper class constructor
      vi.doMock("pg", () => {
        return {
          Pool: class MockPool {
            query = vi.fn().mockResolvedValue({ rows: [] });
            end = vi.fn();
            on = vi.fn(); // Required for error handler setup
          },
        };
      });

      const { PostgresAdapter } = await import("@/lib/db-adapters/postgres");

      const config: DBConfig = {
        type: "postgresql",
        host: "localhost",
        port: 5432,
        database: "test",
        user: "postgres",
        password: "password",
        ssl: false,
      };

      const adapter = new PostgresAdapter(config);
      expect(adapter.type).toBe("postgresql");
    });
  });

  describe("MySQL adapter", () => {
    beforeEach(() => {
      vi.resetModules();
    });

    it("throws error when mysql2 is not installed", async () => {
      vi.doMock("mysql2/promise", () => {
        throw new Error("Module not found");
      });

      const { MySQLAdapter } = await import("@/lib/db-adapters/mysql");

      const config: DBConfig = {
        type: "mysql",
        host: "localhost",
        port: 3306,
        database: "test",
        user: "root",
        password: "password",
        ssl: false,
      };

      const adapter = new MySQLAdapter(config);

      await expect(adapter.testConnection()).rejects.toThrow(
        "MySQL support requires the mysql2 package"
      );
    });
  });

  describe("SQLite adapter", () => {
    beforeEach(() => {
      vi.resetModules();
    });

    it("throws error when better-sqlite3 is not installed", async () => {
      vi.doMock("better-sqlite3", () => {
        throw new Error("Module not found");
      });

      const { SQLiteAdapter } = await import("@/lib/db-adapters/sqlite");

      const config: DBConfig = {
        type: "sqlite",
        host: "",
        port: 0,
        database: "",
        user: "",
        password: "",
        ssl: false,
        filename: "/path/to/test.db",
      };

      const adapter = new SQLiteAdapter(config);

      await expect(adapter.testConnection()).rejects.toThrow(
        "SQLite support requires the better-sqlite3 package"
      );
    });

    it("throws error when filename is not provided", async () => {
      // Mock better-sqlite3 to return successfully
      const mockDb = {
        prepare: vi.fn().mockReturnValue({
          get: vi.fn(),
          all: vi.fn().mockReturnValue([]),
        }),
        close: vi.fn(),
      };

      vi.doMock("better-sqlite3", () => ({
        default: vi.fn().mockImplementation(() => mockDb),
      }));

      const { SQLiteAdapter } = await import("@/lib/db-adapters/sqlite");

      const config: DBConfig = {
        type: "sqlite",
        host: "",
        port: 0,
        database: "",
        user: "",
        password: "",
        ssl: false,
        // No filename provided
      };

      const adapter = new SQLiteAdapter(config);

      await expect(adapter.testConnection()).rejects.toThrow(
        "SQLite requires a database filename"
      );
    });
  });

  describe("createAdapter factory", () => {
    beforeEach(() => {
      vi.resetModules();
    });

    it("creates PostgreSQL adapter for postgresql type", async () => {
      vi.doMock("pg", () => {
        return {
          Pool: class MockPool {
            query = vi.fn().mockResolvedValue({ rows: [] });
            end = vi.fn();
            on = vi.fn(); // Required for error handler setup
          },
        };
      });

      const { createAdapter } = await import("@/lib/db-adapters/index");

      const config: DBConfig = {
        type: "postgresql",
        host: "localhost",
        port: 5432,
        database: "test",
        user: "postgres",
        password: "password",
        ssl: false,
      };

      const adapter = createAdapter(config);
      expect(adapter.type).toBe("postgresql");
    });

    it("caches adapters for same config", async () => {
      vi.doMock("pg", () => {
        return {
          Pool: class MockPool {
            query = vi.fn().mockResolvedValue({ rows: [] });
            end = vi.fn();
            on = vi.fn(); // Required for error handler setup
          },
        };
      });

      const { createAdapter, closeAllAdapters } = await import("@/lib/db-adapters/index");

      // Clear cache first
      await closeAllAdapters();

      const config: DBConfig = {
        type: "postgresql",
        host: "localhost",
        port: 5432,
        database: "test",
        user: "postgres",
        password: "password",
        ssl: false,
      };

      const adapter1 = createAdapter(config);
      const adapter2 = createAdapter(config);

      expect(adapter1).toBe(adapter2);
    });
  });

  describe("adapter interface compliance", () => {
    it("DatabaseAdapter interface has required methods", () => {
      // This is a compile-time check - if it compiles, the interface is correct
      const mockAdapter: DatabaseAdapter = {
        type: "postgresql",
        query: async () => ({ rows: [], rowCount: 0 }),
        introspectSchema: async () => [],
        testConnection: async () => {},
        close: async () => {},
      };

      expect(mockAdapter.type).toBeDefined();
      expect(typeof mockAdapter.query).toBe("function");
      expect(typeof mockAdapter.introspectSchema).toBe("function");
      expect(typeof mockAdapter.testConnection).toBe("function");
      expect(typeof mockAdapter.close).toBe("function");
    });
  });
});
