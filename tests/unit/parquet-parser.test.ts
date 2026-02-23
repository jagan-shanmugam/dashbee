import { describe, it, expect, vi, beforeEach } from "vitest";
import { isParquetFile } from "@/lib/parquet-parser";

// Note: Full parquet parsing tests require WASM initialization which is complex in vitest.
// We test the utility functions that don't require WASM here.
// Integration tests for actual parquet parsing should be done in e2e tests.

describe("parquet-parser", () => {
  describe("isParquetFile", () => {
    it("returns true for valid PAR1 magic bytes", () => {
      // PAR1 = 0x50 0x41 0x52 0x31
      const buffer = new Uint8Array([0x50, 0x41, 0x52, 0x31, 0x00, 0x00]).buffer;
      expect(isParquetFile(buffer)).toBe(true);
    });

    it("returns false for non-parquet data", () => {
      const buffer = new Uint8Array([0x00, 0x00, 0x00, 0x00]).buffer;
      expect(isParquetFile(buffer)).toBe(false);
    });

    it("returns false for buffer too short", () => {
      const buffer = new Uint8Array([0x50, 0x41, 0x52]).buffer;
      expect(isParquetFile(buffer)).toBe(false);
    });

    it("returns false for empty buffer", () => {
      const buffer = new ArrayBuffer(0);
      expect(isParquetFile(buffer)).toBe(false);
    });

    it("returns false for CSV-like data", () => {
      const csvData = "name,age\nAlice,30\n";
      const encoder = new TextEncoder();
      const buffer = encoder.encode(csvData).buffer;
      expect(isParquetFile(buffer)).toBe(false);
    });

    it("returns false for JSON-like data", () => {
      const jsonData = '{"name": "Alice"}';
      const encoder = new TextEncoder();
      const buffer = encoder.encode(jsonData).buffer;
      expect(isParquetFile(buffer)).toBe(false);
    });

    it("returns false for partial PAR1 match", () => {
      // Only first 3 bytes match
      const buffer = new Uint8Array([0x50, 0x41, 0x52, 0x00]).buffer;
      expect(isParquetFile(buffer)).toBe(false);
    });
  });

  describe("parseParquetBuffer - mock tests", () => {
    beforeEach(() => {
      vi.resetModules();
    });

    it("throws error when parquet-wasm is not available", async () => {
      // Mock the dynamic import to fail
      vi.doMock("parquet-wasm", () => {
        throw new Error("Module not found");
      });

      // Re-import to get the mocked version
      const { parseParquetBuffer } = await import("@/lib/parquet-parser");

      const buffer = new Uint8Array([0x50, 0x41, 0x52, 0x31]).buffer;

      await expect(parseParquetBuffer(buffer)).rejects.toThrow(
        "Parquet support requires the parquet-wasm package"
      );
    });
  });
});

describe("parquet-parser integration", () => {
  // These tests use the actual parquet file and parquet-wasm
  // They are skipped by default due to WASM initialization complexity
  // Run with: pnpm test -- --run parquet-parser.test.ts

  describe.skip("parseParquetFile with real file", () => {
    it("parses flights parquet file", async () => {
      const fs = await import("fs/promises");
      const path = await import("path");
      const { parseParquetBuffer } = await import("@/lib/parquet-parser");

      const filePath = path.join(
        process.cwd(),
        "sample-db/data/flights-1m.parquet"
      );

      const fileBuffer = await fs.readFile(filePath);
      const arrayBuffer = fileBuffer.buffer.slice(
        fileBuffer.byteOffset,
        fileBuffer.byteOffset + fileBuffer.byteLength
      );

      const result = await parseParquetBuffer(arrayBuffer);

      expect(result.columns.length).toBeGreaterThan(0);
      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.rowCount).toBeGreaterThan(0);
    });
  });
});
