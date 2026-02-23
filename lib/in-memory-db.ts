/**
 * In-memory data source for uploaded files (CSV, Excel, JSON).
 * Provides a simple SQL-like query interface without a real database.
 */

export interface TableSchema {
  name: string;
  columns: ColumnInfo[];
  rowCount: number;
}

export interface ColumnInfo {
  name: string;
  type: "text" | "number" | "boolean" | "date" | "unknown";
  nullable: boolean;
}

export interface InMemoryTable {
  name: string;
  data: Record<string, unknown>[];
  columns: ColumnInfo[];
}

/**
 * Infer the column type from sample values
 */
function inferColumnType(values: unknown[]): ColumnInfo["type"] {
  const nonNullValues = values.filter((v) => v !== null && v !== undefined && v !== "");

  if (nonNullValues.length === 0) return "unknown";

  // Sample up to 100 values for type inference
  const sample = nonNullValues.slice(0, 100);

  let numberCount = 0;
  let booleanCount = 0;
  let dateCount = 0;

  for (const value of sample) {
    if (typeof value === "number" || (typeof value === "string" && !isNaN(Number(value)) && value.trim() !== "")) {
      numberCount++;
    } else if (typeof value === "boolean" || value === "true" || value === "false") {
      booleanCount++;
    } else if (typeof value === "string") {
      // Check for date patterns
      const datePattern = /^\d{4}-\d{2}-\d{2}|^\d{1,2}\/\d{1,2}\/\d{2,4}/;
      if (datePattern.test(value) && !isNaN(Date.parse(value))) {
        dateCount++;
      }
    }
  }

  const threshold = sample.length * 0.8; // 80% threshold

  if (numberCount >= threshold) return "number";
  if (booleanCount >= threshold) return "boolean";
  if (dateCount >= threshold) return "date";

  return "text";
}

/**
 * Create column info from data
 */
function createColumnInfo(data: Record<string, unknown>[], columnNames: string[]): ColumnInfo[] {
  return columnNames.map((name) => {
    const values = data.map((row) => row[name]);
    const hasNull = values.some((v) => v === null || v === undefined || v === "");

    return {
      name,
      type: inferColumnType(values),
      nullable: hasNull,
    };
  });
}

/**
 * In-memory database that stores uploaded file data
 */
export class InMemoryDatabase {
  private tables: Map<string, InMemoryTable> = new Map();

  /**
   * Add a table from uploaded data
   */
  addTable(name: string, data: Record<string, unknown>[], columnNames?: string[]): TableSchema {
    const columns = columnNames || (data.length > 0 ? Object.keys(data[0]!) : []);
    const columnInfo = createColumnInfo(data, columns);

    this.tables.set(name, {
      name,
      data,
      columns: columnInfo,
    });

    return {
      name,
      columns: columnInfo,
      rowCount: data.length,
    };
  }

  /**
   * Remove a table
   */
  removeTable(name: string): boolean {
    return this.tables.delete(name);
  }

  /**
   * Get table schema
   */
  getTableSchema(name: string): TableSchema | null {
    const table = this.tables.get(name);
    if (!table) return null;

    return {
      name: table.name,
      columns: table.columns,
      rowCount: table.data.length,
    };
  }

  /**
   * Get all table schemas
   */
  getAllSchemas(): TableSchema[] {
    return Array.from(this.tables.values()).map((table) => ({
      name: table.name,
      columns: table.columns,
      rowCount: table.data.length,
    }));
  }

  /**
   * Get table data by name
   */
  getTableData(name: string): Record<string, unknown>[] | null {
    const table = this.tables.get(name) || this.tables.get(name.toLowerCase());
    return table ? table.data : null;
  }

  /**
   * Execute a simple SQL-like query.
   * Supports: SELECT columns FROM table [WHERE conditions] [ORDER BY column [ASC|DESC]] [LIMIT n]
   */
  query(sql: string): { rows: Record<string, unknown>[]; columns: string[] } {
    // Parse SELECT query
    const selectMatch = sql.match(
      /SELECT\s+(.+?)\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+?))?(?:\s+ORDER\s+BY\s+(\w+)(?:\s+(ASC|DESC))?)?(?:\s+LIMIT\s+(\d+))?$/i
    );

    if (!selectMatch) {
      throw new Error("Only SELECT queries are supported. Format: SELECT columns FROM table [WHERE ...] [ORDER BY ...] [LIMIT n]");
    }

    const [, columnsStr, tableName, whereClause, orderBy, orderDir, limitStr] = selectMatch;
    const table = this.tables.get(tableName!.toLowerCase()) || this.tables.get(tableName!);

    if (!table) {
      const available = Array.from(this.tables.keys()).join(", ") || "none";
      throw new Error(`Table "${tableName}" not found. Available tables: ${available}`);
    }

    // Parse column selection
    let selectedColumns: string[];
    if (columnsStr!.trim() === "*") {
      selectedColumns = table.columns.map((c) => c.name);
    } else {
      selectedColumns = columnsStr!.split(",").map((c) => {
        // Handle aggregate functions and aliases
        const col = c.trim();
        const aliasMatch = col.match(/(.+?)\s+AS\s+(\w+)$/i);
        if (aliasMatch) {
          return aliasMatch[2]!;
        }
        // Handle aggregate functions
        const aggMatch = col.match(/^(COUNT|SUM|AVG|MIN|MAX)\s*\(\s*(.+?)\s*\)$/i);
        if (aggMatch) {
          return col; // Return the full expression
        }
        return col;
      });
    }

    // Filter rows
    let rows = [...table.data];

    if (whereClause) {
      rows = this.applyWhere(rows, whereClause);
    }

    // Apply aggregations if present
    const hasAggregation = columnsStr!.match(/(COUNT|SUM|AVG|MIN|MAX)\s*\(/i);
    const groupByMatch = sql.match(/GROUP\s+BY\s+(\w+)/i);

    if (hasAggregation) {
      if (groupByMatch) {
        rows = this.applyGroupBy(rows, columnsStr!, groupByMatch[1]!);
        selectedColumns = this.parseAggregateColumns(columnsStr!, groupByMatch[1]!);
      } else {
        rows = this.applyAggregation(rows, columnsStr!);
        selectedColumns = this.parseAggregateColumns(columnsStr!);
      }
    }

    // Sort rows
    if (orderBy) {
      const dir = orderDir?.toUpperCase() === "DESC" ? -1 : 1;
      rows.sort((a, b) => {
        const aVal = a[orderBy];
        const bVal = b[orderBy];
        if (aVal === bVal) return 0;
        if (aVal === null || aVal === undefined) return dir;
        if (bVal === null || bVal === undefined) return -dir;
        if (typeof aVal === "number" && typeof bVal === "number") {
          return (aVal - bVal) * dir;
        }
        return String(aVal).localeCompare(String(bVal)) * dir;
      });
    }

    // Apply limit
    if (limitStr) {
      rows = rows.slice(0, parseInt(limitStr, 10));
    }

    // Project selected columns (for non-aggregate queries)
    if (!hasAggregation && columnsStr!.trim() !== "*") {
      const rawColumns = columnsStr!.split(",").map((c) => c.trim());
      rows = rows.map((row) => {
        const projected: Record<string, unknown> = {};
        for (const col of rawColumns) {
          const aliasMatch = col.match(/(.+?)\s+AS\s+(\w+)$/i);
          if (aliasMatch) {
            projected[aliasMatch[2]!] = row[aliasMatch[1]!.trim()];
          } else {
            projected[col] = row[col];
          }
        }
        return projected;
      });
    }

    return { rows, columns: selectedColumns };
  }

  /**
   * Apply WHERE clause filtering
   */
  private applyWhere(rows: Record<string, unknown>[], whereClause: string): Record<string, unknown>[] {
    // Simple WHERE parsing: column = value, column > value, etc.
    // Support AND/OR would require more complex parsing

    const conditions = whereClause.split(/\s+AND\s+/i);

    return rows.filter((row) => {
      return conditions.every((condition) => {
        const match = condition.match(/(\w+)\s*(=|!=|<>|>=|<=|>|<|LIKE|IN)\s*(.+)/i);
        if (!match) return true;

        const [, column, operator, valueStr] = match;
        const rowValue = row[column!];
        let compareValue: unknown = valueStr!.trim();

        // Remove quotes from string values
        if (typeof compareValue === "string" && (compareValue.startsWith("'") || compareValue.startsWith('"'))) {
          compareValue = compareValue.slice(1, -1);
        }

        // Type coercion for comparison
        if (typeof rowValue === "number" && typeof compareValue === "string") {
          compareValue = parseFloat(compareValue);
        }

        switch (operator!.toUpperCase()) {
          case "=":
            return rowValue == compareValue;
          case "!=":
          case "<>":
            return rowValue != compareValue;
          case ">":
            return (rowValue as number) > (compareValue as number);
          case "<":
            return (rowValue as number) < (compareValue as number);
          case ">=":
            return (rowValue as number) >= (compareValue as number);
          case "<=":
            return (rowValue as number) <= (compareValue as number);
          case "LIKE": {
            const pattern = String(compareValue).replace(/%/g, ".*");
            return new RegExp(`^${pattern}$`, "i").test(String(rowValue));
          }
          case "IN": {
            const inValues = String(compareValue)
              .replace(/^\(|\)$/g, "")
              .split(",")
              .map((v) => v.trim().replace(/^['"]|['"]$/g, ""));
            return inValues.includes(String(rowValue));
          }
          default:
            return true;
        }
      });
    });
  }

  /**
   * Apply aggregation without GROUP BY
   */
  private applyAggregation(rows: Record<string, unknown>[], columnsStr: string): Record<string, unknown>[] {
    const result: Record<string, unknown> = {};
    const columns = columnsStr.split(",").map((c) => c.trim());

    for (const col of columns) {
      const match = col.match(/^(COUNT|SUM|AVG|MIN|MAX)\s*\(\s*(.+?)\s*\)(?:\s+AS\s+(\w+))?$/i);
      if (match) {
        const [, func, field, alias] = match;
        const key = alias || col;
        const isCount = func!.toUpperCase() === "COUNT";
        const values = isCount && field === "*"
          ? rows.length
          : rows.map((r) => r[field!]).filter((v) => v !== null && v !== undefined);

        switch (func!.toUpperCase()) {
          case "COUNT":
            result[key] = isCount && field === "*" ? rows.length : (values as unknown[]).length;
            break;
          case "SUM":
            result[key] = (values as number[]).reduce((a, b) => a + (Number(b) || 0), 0);
            break;
          case "AVG": {
            const nums = values as number[];
            result[key] = nums.length > 0 ? nums.reduce((a, b) => a + (Number(b) || 0), 0) / nums.length : 0;
            break;
          }
          case "MIN":
            result[key] = Math.min(...(values as number[]).map(Number));
            break;
          case "MAX":
            result[key] = Math.max(...(values as number[]).map(Number));
            break;
        }
      }
    }

    return [result];
  }

  /**
   * Apply GROUP BY
   */
  private applyGroupBy(
    rows: Record<string, unknown>[],
    columnsStr: string,
    groupByColumn: string
  ): Record<string, unknown>[] {
    const groups = new Map<string, Record<string, unknown>[]>();

    for (const row of rows) {
      const key = String(row[groupByColumn]);
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(row);
    }

    const results: Record<string, unknown>[] = [];

    for (const [_groupKey, groupRows] of groups) {
      const result: Record<string, unknown> = { [groupByColumn]: groupRows[0]![groupByColumn] };
      const columns = columnsStr.split(",").map((c) => c.trim());

      for (const col of columns) {
        if (col.toLowerCase() === groupByColumn.toLowerCase()) continue;

        const match = col.match(/^(COUNT|SUM|AVG|MIN|MAX)\s*\(\s*(.+?)\s*\)(?:\s+AS\s+(\w+))?$/i);
        if (match) {
          const [, func, field, alias] = match;
          const key = alias || col;
          const values = field === "*"
            ? groupRows
            : groupRows.map((r) => r[field!]).filter((v) => v !== null && v !== undefined);

          switch (func!.toUpperCase()) {
            case "COUNT":
              result[key] = field === "*" ? groupRows.length : (values as unknown[]).length;
              break;
            case "SUM":
              result[key] = (values as number[]).reduce((a, b) => a + (Number(b) || 0), 0);
              break;
            case "AVG": {
              const nums = values as number[];
              result[key] = nums.length > 0 ? nums.reduce((a, b) => a + (Number(b) || 0), 0) / nums.length : 0;
              break;
            }
            case "MIN":
              result[key] = Math.min(...(values as number[]).map(Number));
              break;
            case "MAX":
              result[key] = Math.max(...(values as number[]).map(Number));
              break;
          }
        }
      }

      results.push(result);
    }

    return results;
  }

  /**
   * Parse column names from aggregate expressions
   */
  private parseAggregateColumns(columnsStr: string, groupByColumn?: string): string[] {
    const columns: string[] = [];

    if (groupByColumn) {
      columns.push(groupByColumn);
    }

    const cols = columnsStr.split(",").map((c) => c.trim());
    for (const col of cols) {
      if (groupByColumn && col.toLowerCase() === groupByColumn.toLowerCase()) continue;

      const aliasMatch = col.match(/AS\s+(\w+)$/i);
      if (aliasMatch) {
        columns.push(aliasMatch[1]!);
      } else {
        columns.push(col);
      }
    }

    return columns;
  }

  /**
   * Clear all tables
   */
  clear(): void {
    this.tables.clear();
  }

  /**
   * Check if database has any tables
   */
  isEmpty(): boolean {
    return this.tables.size === 0;
  }
}

// Singleton instance for the app
let globalDb: InMemoryDatabase | null = null;

export function getInMemoryDb(): InMemoryDatabase {
  if (!globalDb) {
    globalDb = new InMemoryDatabase();
  }
  return globalDb;
}

export function resetInMemoryDb(): void {
  if (globalDb) {
    globalDb.clear();
  }
  globalDb = null;
}
