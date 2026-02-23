import { getAdapter, DBConfig } from "./db";

export interface TableInfo {
  schema: string;
  name: string;
  columns: { name: string; type: string }[];
}

export async function introspectSchema(
  dbConfig?: DBConfig,
): Promise<TableInfo[]> {
  if (!dbConfig) {
    // Create a default PostgreSQL config from environment
    dbConfig = {
      type: "postgresql",
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5432"),
      database: process.env.DB_NAME || "postgres",
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "",
      ssl: process.env.DATABASE_SSL === "true",
    };
  }

  const adapter = getAdapter(dbConfig);

  // MySQL uses database names instead of schemas
  // Pass an empty array to let the adapter use dbConfig.database as the default
  const dbType = dbConfig.type || "postgresql";
  const schemas = dbType === "mysql" || dbType === "sqlite"
    ? [] // Let adapter use database name
    : (process.env.ALLOWED_SCHEMAS || "public").split(",");

  return adapter.introspectSchema(schemas);
}

export function schemaToPrompt(tables: TableInfo[]): string {
  return tables
    .map(
      (t) =>
        `${t.schema}.${t.name}: ${t.columns.map((c) => c.name).join(", ")}`,
    )
    .join("\n");
}

export async function fetchSampleData(
  tables: TableInfo[],
  dbConfig?: DBConfig,
  limit: number = 10,
): Promise<Record<string, unknown[]>> {
  if (!dbConfig) {
    dbConfig = {
      type: "postgresql",
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5432"),
      database: process.env.DB_NAME || "postgres",
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "",
      ssl: process.env.DATABASE_SSL === "true",
    };
  }

  const adapter = getAdapter(dbConfig);
  const samples: Record<string, unknown[]> = {};

  for (const table of tables) {
    try {
      // Use adapter's query method with appropriate quoting for the database type
      const dbType = dbConfig.type || "postgresql";
      let sql: string;

      if (dbType === "mysql") {
        sql = `SELECT * FROM \`${table.schema}\`.\`${table.name}\` LIMIT ${limit}`;
      } else if (dbType === "sqlite") {
        sql = `SELECT * FROM "${table.name}" LIMIT ${limit}`;
      } else {
        // PostgreSQL
        sql = `SELECT * FROM "${table.schema}"."${table.name}" LIMIT ${limit}`;
      }

      const result = await adapter.query(sql);
      samples[`${table.schema}.${table.name}`] = result.rows;
    } catch (err) {
      // Skip tables we can't read (e.g., permission issues)
      console.warn(
        `Could not fetch sample data from ${table.schema}.${table.name}:`,
        err,
      );
      samples[`${table.schema}.${table.name}`] = [];
    }
  }
  return samples;
}
