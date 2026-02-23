/**
 * Parquet file parser using parquet-wasm + apache-arrow.
 * Converts Parquet files to row-based format for use with in-memory database.
 */

export interface ParquetColumn {
  name: string;
  type: string;
}

export interface ParsedParquet {
  columns: ParquetColumn[];
  rows: Record<string, unknown>[];
  rowCount: number;
}

/**
 * Map Arrow type to simplified type string.
 */
function mapArrowType(arrowType: { typeId?: number; toString?: () => string }): string {
  if (!arrowType) return "text";

  const typeStr = arrowType.toString?.() ?? "";
  const typeStrLower = typeStr.toLowerCase();

  if (typeStrLower.includes("int") || typeStrLower.includes("float") ||
      typeStrLower.includes("double") || typeStrLower.includes("decimal")) {
    return "number";
  }
  if (typeStrLower.includes("bool")) {
    return "boolean";
  }
  if (typeStrLower.includes("date") || typeStrLower.includes("timestamp") ||
      typeStrLower.includes("time")) {
    return "date";
  }
  if (typeStrLower.includes("binary") || typeStrLower.includes("byte")) {
    return "binary";
  }
  return "text";
}

/**
 * Parse a Parquet file from an ArrayBuffer.
 * @param buffer - ArrayBuffer containing the Parquet file data
 * @returns Parsed data with columns and rows
 */
export async function parseParquetBuffer(buffer: ArrayBuffer): Promise<ParsedParquet> {
  // Dynamic imports for parquet-wasm and apache-arrow
  let parquetWasm: typeof import("parquet-wasm");
  let arrow: typeof import("apache-arrow");

  try {
    parquetWasm = await import("parquet-wasm");
  } catch {
    throw new Error(
      "Parquet support requires the parquet-wasm package. Install it with: pnpm add parquet-wasm"
    );
  }

  try {
    arrow = await import("apache-arrow");
  } catch {
    throw new Error(
      "Parquet support requires the apache-arrow package. Install it with: pnpm add apache-arrow"
    );
  }

  // Initialize parquet-wasm if needed (no-op if already initialized)
  if (typeof parquetWasm.default === "function") {
    await parquetWasm.default();
  }

  // Read the Parquet file into a WASM table
  const uint8Array = new Uint8Array(buffer);
  const wasmTable = parquetWasm.readParquet(uint8Array);

  // Convert to Arrow IPC format and parse with apache-arrow
  const ipcStream = wasmTable.intoIPCStream();
  const arrowTable = arrow.tableFromIPC(ipcStream);

  // Extract schema information
  const schema = arrowTable.schema;
  const columns: ParquetColumn[] = schema.fields.map((field) => ({
    name: field.name,
    type: mapArrowType(field.type),
  }));

  // Convert to row-based format
  const rows: Record<string, unknown>[] = [];
  const numRows = arrowTable.numRows;

  for (let rowIdx = 0; rowIdx < numRows; rowIdx++) {
    const row: Record<string, unknown> = {};
    for (const field of schema.fields) {
      const column = arrowTable.getChild(field.name);
      if (column) {
        row[field.name] = column.get(rowIdx);
      } else {
        row[field.name] = null;
      }
    }
    rows.push(row);
  }

  return {
    columns,
    rows,
    rowCount: numRows,
  };
}

/**
 * Parse a Parquet file from a File object.
 * @param file - File object containing Parquet data
 * @returns Parsed data with columns and rows
 */
export async function parseParquetFile(file: File): Promise<ParsedParquet> {
  const buffer = await file.arrayBuffer();
  return parseParquetBuffer(buffer);
}

/**
 * Check if a file is a Parquet file based on its magic bytes.
 * Parquet files start with "PAR1" magic bytes.
 */
export function isParquetFile(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 4) return false;

  const header = new Uint8Array(buffer, 0, 4);
  // PAR1 magic bytes
  return header[0] === 0x50 && header[1] === 0x41 && header[2] === 0x52 && header[3] === 0x31;
}

/**
 * Check if parquet-wasm is available.
 */
export async function isParquetSupported(): Promise<boolean> {
  try {
    await import("parquet-wasm");
    await import("apache-arrow");
    return true;
  } catch {
    return false;
  }
}
