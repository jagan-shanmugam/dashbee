/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock html2canvas
vi.mock("html2canvas", () => ({
  default: vi.fn(),
}));

import { sanitizeFilename, exportToCsv } from "@/lib/export-utils";

describe("export-utils", () => {
  describe("sanitizeFilename", () => {
    it("converts to lowercase", () => {
      expect(sanitizeFilename("MyChart")).toBe("mychart");
    });

    it("replaces spaces with hyphens", () => {
      expect(sanitizeFilename("My Chart Name")).toBe("my-chart-name");
    });

    it("removes special characters", () => {
      expect(sanitizeFilename("Chart@#$%123")).toBe("chart-123");
    });

    it("removes leading and trailing hyphens", () => {
      expect(sanitizeFilename("---My Chart---")).toBe("my-chart");
    });

    it("handles multiple consecutive special chars", () => {
      expect(sanitizeFilename("Chart!!!Name")).toBe("chart-name");
    });

    it("handles empty string", () => {
      expect(sanitizeFilename("")).toBe("");
    });

    it("handles string with only special characters", () => {
      expect(sanitizeFilename("@#$%")).toBe("");
    });

    it("handles numbers correctly", () => {
      expect(sanitizeFilename("Chart 2024 Q1")).toBe("chart-2024-q1");
    });
  });

  describe("exportToCsv", () => {
    let mockCreateObjectURL: ReturnType<typeof vi.fn>;
    let mockRevokeObjectURL: ReturnType<typeof vi.fn>;
    let mockClick: ReturnType<typeof vi.fn>;
    let createdLink: HTMLAnchorElement;

    beforeEach(() => {
      mockCreateObjectURL = vi.fn(() => "blob:test-url");
      mockRevokeObjectURL = vi.fn();
      mockClick = vi.fn();

      // Mock URL methods
      global.URL.createObjectURL = mockCreateObjectURL;
      global.URL.revokeObjectURL = mockRevokeObjectURL;

      // Store created links
      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, "createElement").mockImplementation(
        (tagName: string) => {
          const element = originalCreateElement(tagName);
          if (tagName === "a") {
            createdLink = element as HTMLAnchorElement;
            vi.spyOn(createdLink, "click").mockImplementation(mockClick);
          }
          return element;
        },
      );
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("creates CSV with headers from data keys", () => {
      const data = [
        { name: "Alice", age: 30 },
        { name: "Bob", age: 25 },
      ];

      exportToCsv(data, "test.csv");

      expect(mockCreateObjectURL).toHaveBeenCalled();
      const blob = mockCreateObjectURL.mock.calls[0][0] as Blob;
      expect(blob.type).toBe("text/csv;charset=utf-8;");
    });

    it("handles empty data array", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      exportToCsv([], "test.csv");

      expect(consoleSpy).toHaveBeenCalledWith("No data to export");
      expect(mockCreateObjectURL).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("triggers download with correct filename", () => {
      const data = [{ name: "Alice" }];

      exportToCsv(data, "my-data.csv");

      expect(mockClick).toHaveBeenCalled();
      expect(createdLink.download).toBe("my-data.csv");
    });

    it("handles null and undefined values", () => {
      const data = [
        { name: "Alice", value: null },
        { name: "Bob", value: undefined },
      ];

      // Should not throw
      expect(() => exportToCsv(data, "test.csv")).not.toThrow();
    });

    it("escapes values containing commas", () => {
      const data = [{ name: "Doe, John", city: "NYC" }];

      exportToCsv(data, "test.csv");

      expect(mockCreateObjectURL).toHaveBeenCalled();
      // The CSV should handle the comma in "Doe, John" by quoting
    });

    it("escapes values containing quotes", () => {
      const data = [{ quote: 'He said "hello"' }];

      exportToCsv(data, "test.csv");

      expect(mockCreateObjectURL).toHaveBeenCalled();
    });

    it("cleans up URL after download", () => {
      const data = [{ name: "Alice" }];

      exportToCsv(data, "test.csv");

      expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:test-url");
    });
  });
});
