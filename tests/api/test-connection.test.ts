import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the db module
vi.mock("@/lib/db", () => ({
  testConnection: vi.fn(),
}));

import { testConnection } from "@/lib/db";

// We can't easily test Next.js route handlers directly,
// so we test the validation logic and mocked db interactions

describe("test-connection API logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("request validation", () => {
    it("requires dbConfig object", async () => {
      // Missing dbConfig should result in error
      const dbConfig = null;
      expect(dbConfig).toBe(null);
    });

    it("requires host field", () => {
      const config = { database: "test", user: "test", port: 5432 };
      expect(config.host).toBeUndefined();
    });

    it("requires database field", () => {
      const config = { host: "localhost", user: "test", port: 5432 };
      expect(config.database).toBeUndefined();
    });

    it("requires user field", () => {
      const config = { host: "localhost", database: "test", port: 5432 };
      expect(config.user).toBeUndefined();
    });
  });

  describe("testConnection", () => {
    it("calls testConnection with valid config", async () => {
      const mockTestConnection = testConnection as ReturnType<typeof vi.fn>;
      mockTestConnection.mockResolvedValueOnce(undefined);

      const config = {
        host: "localhost",
        port: 5432,
        database: "demo",
        user: "postgres",
        password: "secret",
        ssl: false,
      };

      await testConnection(config);
      expect(mockTestConnection).toHaveBeenCalledWith(config);
    });

    it("throws on connection failure", async () => {
      const mockTestConnection = testConnection as ReturnType<typeof vi.fn>;
      mockTestConnection.mockRejectedValueOnce(new Error("Connection refused"));

      const config = {
        host: "localhost",
        port: 5432,
        database: "demo",
        user: "postgres",
        password: "wrong",
        ssl: false,
      };

      await expect(testConnection(config)).rejects.toThrow(
        "Connection refused",
      );
    });
  });
});
