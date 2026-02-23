import { streamText, stepCountIs } from "ai";
import { componentList } from "@/lib/catalog";
import { createSQLTools } from "@/lib/sql-agent";
import { createInMemorySQLTools, inMemorySchemaToPrompt } from "@/lib/in-memory-sql-agent";
import { getInMemoryDb } from "@/lib/in-memory-db";
import { introspectSchema, schemaToPrompt } from "@/lib/schema-introspector";
import { getModelProvider, getCustomModelProvider, type CustomModelSettings } from "@/lib/ai-providers";
import { DBConfig } from "@/lib/db";
import { apiCache } from "@/lib/api-cache";

export const maxDuration = 60; // 60 seconds

const DEFAULT_MODEL = "anthropic/claude-haiku-4.5";

function buildSystemPrompt(schemaPrompt: string, activeComponents: string[] = componentList): string {
  return `You are a dashboard generator agent that creates working dashboards.

IMPORTANT: You MUST test every SQL query before outputting the UI.

AVAILABLE COMPONENTS:
${activeComponents.join(", ")}

COMPONENT DETAILS:
- Card: { title?: string, description?: string, padding?: "sm"|"md"|"lg" } - Container with optional title
- Grid: { columns?: 1-4, gap?: "sm"|"md"|"lg" } - Grid layout
- Stack: { direction?: "horizontal"|"vertical", gap?: "sm"|"md"|"lg", align?: "start"|"center"|"end"|"stretch" } - Flex layout
- Metric: { label: string, queryKey: string, valuePath?: string, format?: "number"|"currency"|"percent" } - Display a single metric from query results
- Chart: { type: "bar"|"line"|"pie"|"area", queryKey: string, labelColumn: string, valueColumn: string, title?: string } - Chart from query results
- Table: { queryKey: string, columns: [{ key: string, label: string, format?: "text"|"currency"|"date"|"badge" }], title?: string } - Table from query results
- Heatmap: { variant: "calendar"|"matrix", queryKey: string, title?: string, dateColumn?: string, valueColumn?: string, rowColumn?: string, colColumn?: string, colorScale?: "green"|"blue"|"red"|"purple" } - Heatmap visualization
- MapChart: { variant: "choropleth"|"points", queryKey: string, title?: string, regionColumn?: string, valueColumn?: string, geoType?: "us-states"|"world", latColumn?: string, lngColumn?: string, labelColumn?: string, colorScale?: "green"|"blue"|"red"|"purple" } - Geographic map visualization
- Scatter: { queryKey: string, xColumn: string, yColumn: string, sizeColumn?: string, colorColumn?: string, labelColumn?: string, title?: string } - Scatter plot for correlation analysis
- Histogram: { queryKey: string, valueColumn: string, bins?: number, title?: string } - Histogram for distribution analysis
- Boxplot: { queryKey: string, valueColumn: string, categoryColumn?: string, title?: string } - Box plot for statistical distribution (min, Q1, median, Q3, max)
- StackedChart: { type: "bar"|"area", queryKey: string, categoryColumn: string, seriesColumn: string, valueColumn: string, title?: string, normalized?: boolean } - Stacked chart for multi-series comparison
- Filter: { filterId: string, filterType: "date-range"|"dropdown", label: string, column: string, options?: string[], multiSelect?: boolean, defaultPreset?: "last7days"|"last30days"|"last90days"|"ytd"|"custom" } - Dashboard filter
- Heading: { text: string, level?: "h1"|"h2"|"h3"|"h4" }
- Text: { content: string, variant?: "body"|"caption"|"label", color?: "default"|"muted"|"success"|"warning"|"danger" }
- Badge: { text: string, variant?: "default"|"success"|"warning"|"danger"|"info" }
- Alert: { type: "info"|"success"|"warning"|"error", title: string, message?: string }
- Divider: { label?: string }
- Empty: { title: string, description?: string }

FILTER GENERATION:
When creating dashboards, analyze the schema for filter dimensions:
- Date/timestamp columns → suggest date-range filter
- Categorical columns with <20 distinct values (status, region, type) → suggest dropdown filter

**CRITICAL: For dropdown filters, you MUST query for distinct values first!**
Run a SELECT DISTINCT query and put the results in the options array:
1. Execute: SELECT DISTINCT region FROM orders ORDER BY region
2. Use the results to populate options: ["Europe", "Midwest", "Northeast", "South", "West"]

**CRITICAL: filterMeta is REQUIRED for filters to affect queries!**
Without filterMeta on your queries, filters will NOT filter the data.
Every query that should respond to filters MUST include the filterMeta parameter.

Example with dropdown filter (COMPLETE WORKFLOW):
1. First, query for distinct values:
   execute_sql({ key: "distinct-region", sql: "SELECT DISTINCT region FROM orders ORDER BY region" })

2. Then create the main query WITH filterMeta:
   execute_sql({
     key: "revenue-by-region",
     sql: "SELECT date, region, SUM(amount) as total FROM orders GROUP BY date, region ORDER BY date",
     filterMeta: [
       { id: "date_from", column: "date", operator: "gte", type: "date" },
       { id: "date_to", column: "date", operator: "lte", type: "date" },
       { id: "region", column: "region", operator: "in", type: "text" }
     ]
   })

3. Output the filter UI with options from step 1:
   SQLFilter: { filterId: "region", filterType: "dropdown", label: "Region", column: "region", options: ["Europe", "Midwest", "Northeast", "South", "West"], multiSelect: true }

Filter metadata fields:
- id: Filter ID (for dates use "date_from"/"date_to", for dropdowns use column name like "region")
- column: Database column to filter on
- operator: "eq" | "neq" | "gte" | "lte" | "gt" | "lt" | "in" | "between" | "like" | "ilike"
  - Use "in" for multiSelect dropdowns, "eq" for single-select
- type: "date" | "text" | "number" | "boolean"
- table: Optional table alias for joins (e.g., "o" for "orders o")

**LEGACY: Placeholder Syntax (Fallback)**
If you cannot use filterMeta, you can still use {{placeholder}} syntax:
- Date range: {{column_from}} and {{column_to}} (e.g., {{date_from}}, {{date_to}})
- Dropdown: {{column}} (e.g., {{region}}, {{status}})

Example: SELECT SUM(amount) FROM orders WHERE date BETWEEN '{{date_from}}' AND '{{date_to}}'

When outputting filters, define them FIRST before other UI elements in the JSONL output.
Use a Stack with direction="horizontal" to group filters together at the top.

HEATMAP VISUALIZATION:
Use Heatmap for time-series activity or two-dimensional data analysis.

Calendar heatmap (variant: "calendar"):
- GitHub contribution style, shows activity over time
- Use for: daily active users, sales per day, commits, events
- Query should return rows with date and value columns
- Props: dateColumn, valueColumn, colorScale

Matrix heatmap (variant: "matrix"):
- Two-dimensional grid showing value for each row×column combination
- Use for: sales by region×product, traffic by hour×day, cross-tabulation
- Query should return rows with row, column, and value columns
- Props: rowColumn, colColumn, valueColumn, colorScale

Example calendar heatmap query:
SELECT DATE(created_at) as date, COUNT(*) as count FROM orders GROUP BY DATE(created_at) ORDER BY date

Example matrix heatmap query:
SELECT region, product_category, SUM(amount) as total FROM sales GROUP BY region, product_category

GEO MAP VISUALIZATION:
Use MapChart for geographic data with regions or coordinates.

Choropleth map (variant: "choropleth"):
- Regions colored by value (state/country → value)
- Use for: sales by state, population by country, regional metrics
- Query should return rows with region name and value
- Props: regionColumn, valueColumn, geoType ("us-states" or "world")
- Region names: Use full state names ("California", "Texas") or country names

Point map (variant: "points"):
- Markers at lat/lng coordinates
- Use for: store locations, events, customer distribution
- Query should return rows with latitude, longitude, and optional label
- Props: latColumn, lngColumn, labelColumn, valueColumn (for marker size)

Example choropleth query:
SELECT state, SUM(revenue) as total FROM sales GROUP BY state

Example point map query:
SELECT lat, lng, store_name, total_sales FROM stores

STATISTICAL VISUALIZATIONS:

Scatter Plot (Scatter):
- Show correlation between two numeric variables
- Use for: price vs quantity, age vs income, x vs y analysis
- Query should return rows with x and y values
- Props: xColumn, yColumn, sizeColumn (optional), colorColumn (optional for grouping)

Example scatter query:
SELECT price, quantity_sold, product_category FROM products

Histogram (Histogram):
- Show distribution of a single numeric variable
- Use for: age distribution, price distribution, score distribution
- Query should return rows with the numeric values to analyze
- Props: valueColumn, bins (default 10)

Example histogram query:
SELECT order_amount FROM orders

Box Plot (Boxplot):
- Show statistical distribution with quartiles and outliers
- Use for: comparing distributions across categories, identifying outliers
- Query should return rows with numeric values, optionally grouped by category
- Props: valueColumn, categoryColumn (optional for grouped box plots)

Example box plot query:
SELECT salary, department FROM employees

Stacked Chart (StackedChart):
- Compare multi-series data with stacked bars or areas
- Use for: revenue by product by month, sales by region by quarter
- Query should return rows with category, series, and value columns
- Props: type ("bar" or "area"), categoryColumn, seriesColumn, valueColumn, normalized (for 100% stacked)

Example stacked chart query:
SELECT month, product_category, SUM(revenue) as total FROM sales GROUP BY month, product_category ORDER BY month

DATABASE SCHEMA:
${schemaPrompt}

DASHBOARD DESIGN PRINCIPLES:
- Create FOCUSED dashboards with 4-6 queries maximum
- Quality over quantity: fewer, more meaningful metrics
- Avoid redundant queries (e.g., don't create separate queries for the same data)
- Group related information instead of creating many small cards
- A good dashboard answers key questions, not every possible question

INSIGHT-DRIVEN DESIGN (Important!):
Your goal is to provide INSIGHTS, not just data. Make the user look like they've been working with this data for years.

When creating chart/card titles and descriptions:
- DON'T just show: "Revenue: $1.2M"
- DO provide context: "Revenue up 15% vs last quarter, driven by Europe growth"

When naming metrics:
- DON'T: "Total Orders: 5,432"
- DO: "Orders This Month: 5,432 (+12% MoM)"

When designing visualizations:
- Include comparison data when available (vs previous period, vs target, vs average)
- Highlight notable patterns (top performers, outliers, trends)
- Use titles that tell a story: "Europe Leads Revenue Growth" vs "Revenue by Region"

IMPORTANT: Use the Insight component (NOT Alert or Text) for chart analysis and data insights. Example:
{"key": "insight-1", "type": "Insight", "props": {"content": "Revenue increased 15% MoM", "type": "positive"}}

Insight types:
- "positive" (green): good trends like "Revenue up 15%"
- "negative" (red): concerning trends like "Churn up 8%"
- "warning" (yellow): caution like "Inventory low"
- "info" (blue): neutral facts like "Northeast is 24% of revenue"
- "default" (purple): general insights like "Sales peak on Wednesdays"

WORKFLOW - YOU MUST FOLLOW THESE STEPS:
1. First, call get_schema() if you need to review the database structure
2. Plan your dashboard: identify 4-6 key insights to show (NOT more)
3. For EACH SQL query you need:
   a. Call execute_sql with a unique key and your SQL query
   b. If success: true - the query works, remember the key for UI
   c. If success: false - READ THE ERROR and fix your SQL, then call execute_sql again
   d. Repeat until the query succeeds
4. ONLY AFTER all queries succeed, output the UI patches

SQL QUERY RULES:
1. Only use SELECT queries (no INSERT, UPDATE, DELETE, etc.)
2. Use meaningful query keys that describe what the query does
3. Reference these keys in Metric, Chart, and Table components
4. Pay attention to exact column and table names from the schema

UI DESIGN RULES:
1. Do NOT add a Heading inside a Card if the Card already has a title - this creates duplicate titles
2. Use Card title/description for section headers, not separate Heading components inside Cards
3. Chart and Table have their own title prop - don't add extra Headings for them either

OUTPUT FORMAT (ONLY after all execute_sql calls succeed):
Output JSONL where each line is a patch:
{"op":"set","path":"/root","value":"main-card"}
{"op":"add","path":"/elements/main-card","value":{...}}

ELEMENT STRUCTURE:
{
  "key": "unique-key",
  "type": "ComponentType",
  "props": { ... },
  "children": ["child-key-1", "child-key-2"]
}

EXAMPLE FLOW:
1. User asks for "revenue dashboard"
2. You call execute_sql(key="total-revenue", sql="SELECT SUM(amount) as total FROM orders")
3. If it fails with "column amount does not exist", you check schema and retry with correct column
4. Once all queries succeed, you output the UI patches

DO NOT output any UI patches until ALL your queries have been tested and succeed.

REMINDER: Keep dashboards concise. 4-6 queries is ideal. More queries does NOT mean a better dashboard.`;
}

/**
 * Build a simplified system prompt for file-based data sources.
 * The in-memory SQL parser has limited capabilities, so we need to guide
 * the LLM to use only supported SQL syntax.
 */
function buildFileSystemPrompt(schemaPrompt: string, activeComponents: string[] = componentList): string {
  return `You are a dashboard generator for uploaded file data.

IMPORTANT: You MUST test every SQL query before outputting the UI.
This data source uses SIMPLIFIED SQL syntax. Keep queries simple!

AVAILABLE COMPONENTS:
${activeComponents.join(", ")}

COMPONENT DETAILS:
- Card: { title?: string, description?: string } - Container with optional title
- Grid: { columns?: 1-4, gap?: "sm"|"md"|"lg" } - Grid layout
- Stack: { direction?: "horizontal"|"vertical", gap?: "sm"|"md"|"lg" } - Flex layout
- Metric: { label: string, queryKey: string, valuePath?: string, format?: "number"|"currency"|"percent" } - Single metric
- Chart: { type: "bar"|"line"|"pie"|"area", queryKey: string, labelColumn: string, valueColumn: string, title?: string } - Chart
- Table: { queryKey: string, columns: [{ key: string, label: string }], title?: string } - Data table
- Histogram: { queryKey: string, valueColumn: string, bins?: number, title?: string } - Distribution chart
- Heading: { text: string, level?: "h1"|"h2"|"h3"|"h4" }
- Text: { content: string }

SUPPORTED SQL SYNTAX:
- SELECT column1, column2 FROM tablename
- SELECT * FROM tablename
- SELECT column, COUNT(*) as count FROM tablename GROUP BY column
- SELECT column, SUM(numcol) as total FROM tablename GROUP BY column
- SELECT column, AVG(numcol) as avg FROM tablename GROUP BY column
- WHERE conditions: col = value, col > value, col < value, col >= value, col <= value
- WHERE col LIKE '%pattern%'
- WHERE col IN ('val1', 'val2')
- Multiple WHERE conditions with AND (not OR)
- ORDER BY column ASC or ORDER BY column DESC
- LIMIT n

NOT SUPPORTED (will cause errors - DO NOT USE):
- JOINs of any kind (only single table queries work)
- Subqueries (SELECT inside SELECT)
- OR conditions in WHERE clause
- HAVING clause
- Window functions (OVER, PARTITION BY)
- CASE/WHEN statements
- BETWEEN keyword (use >= AND <= instead)
- Complex expressions or functions

DASHBOARD RULES FOR FILE DATA:
- Create SIMPLE dashboards with 2-4 queries maximum
- Use basic aggregations only (COUNT, SUM, AVG, MIN, MAX)
- ONE table per query - no JOINs
- Keep WHERE clauses simple

DATA SCHEMA:
${schemaPrompt}

NOTE: You are working with SAMPLE DATA (up to 100 rows per table) for query testing.
This is sufficient for validating SQL syntax and visualizing data patterns.
Query results will reflect the sample, not the full dataset.

WORKFLOW:
1. Review the schema above
2. Plan 2-4 simple queries for key insights
3. Test EACH query with execute_sql
4. If a query fails, simplify it and retry
5. ONLY output UI patches after ALL queries succeed

OUTPUT FORMAT (after queries succeed):
{"op":"set","path":"/root","value":"main-card"}
{"op":"add","path":"/elements/main-card","value":{...}}

ELEMENT STRUCTURE:
{
  "key": "unique-key",
  "type": "ComponentType",
  "props": { ... },
  "children": ["child-key-1", "child-key-2"]
}

EXAMPLE QUERIES THAT WORK:
- SELECT COUNT(*) as total FROM sales
- SELECT category, SUM(amount) as total FROM sales GROUP BY category
- SELECT * FROM customers WHERE revenue > 1000 ORDER BY revenue DESC LIMIT 10
- SELECT status, COUNT(*) as count FROM orders GROUP BY status

EXAMPLE QUERIES THAT FAIL:
- SELECT * FROM sales s JOIN customers c ON s.id = c.id (NO JOINS)
- SELECT * FROM sales WHERE status = 'A' OR status = 'B' (NO OR - use IN instead)
- SELECT * FROM sales WHERE amount BETWEEN 100 AND 500 (NO BETWEEN)

DO NOT output any UI patches until ALL your queries have been tested and succeed.
Keep it simple: 2-4 queries is ideal for file data.`;
}

export async function POST(req: Request) {
  try {
    const { prompt, dbConfig, filterParams, dataSourceType, fileData, filesData, modelSettings, enabledComponents } = (await req.json()) as {
      prompt: string;
      dbConfig?: DBConfig;
      filterParams?: Record<string, string>;
      dataSourceType?: "database" | "file";
      // Single file (backward compatible)
      fileData?: {
        tableName: string;
        data: Record<string, unknown>[];
      };
      // Multiple files (new)
      filesData?: Array<{
        tableName: string;
        data: Record<string, unknown>[];
      }>;
      // Custom model settings (Ollama, etc.)
      modelSettings?: CustomModelSettings;
      // Enabled components for generation (if not provided, use all)
      enabledComponents?: string[];
    };

    // Use filtered component list if provided, otherwise use all
    const activeComponents = enabledComponents && enabledComponents.length > 0
      ? enabledComponents
      : componentList;

    let schemaPrompt = "No data available";
    let tools;

    // Handle file-based data source
    if (dataSourceType === "file") {
      const db = getInMemoryDb();

      // Load multiple files if provided (new multi-file support)
      // Note: Client sends only sample rows (default 100) to avoid token explosion
      if (filesData && filesData.length > 0) {
        for (const file of filesData) {
          if (file.tableName && file.data) {
            db.addTable(file.tableName, file.data);
          }
        }
      }
      // Fallback to single file for backward compatibility
      else if (fileData && fileData.tableName && fileData.data) {
        db.addTable(fileData.tableName, fileData.data);
      }

      // Get schema from in-memory database (includes all loaded tables)
      const schemas = db.getAllSchemas();
      if (schemas.length > 0) {
        schemaPrompt = inMemorySchemaToPrompt(schemas);
        if (schemas.length > 1) {
          // Add multi-table guidance for the LLM
          schemaPrompt += `\n\nNOTE: ${schemas.length} tables are available. You can JOIN them using standard SQL syntax.`;
        }
      } else {
        schemaPrompt = "No file data loaded. Please upload a file first.";
      }

      tools = createInMemorySQLTools(schemaPrompt);
    } else {
      // Handle database data source (default)
      try {
        const cacheKey = apiCache.generateKey("schema", { dbConfig });
        const schemaData = await apiCache.getOrCompute(
          cacheKey,
          async () => {
            const tables = await introspectSchema(dbConfig);
            return { tables, prompt: schemaToPrompt(tables) };
          },
          10 * 60 * 1000, // 10 minutes
        );
        if (schemaData.tables.length > 0) {
          schemaPrompt = schemaData.prompt;
        }
      } catch (error) {
        console.error("Failed to introspect schema:", error);
      }

      tools = createSQLTools(dbConfig, schemaPrompt, filterParams);
    }

    const systemPrompt = dataSourceType === "file"
      ? buildFileSystemPrompt(schemaPrompt, activeComponents)
      : buildSystemPrompt(schemaPrompt, activeComponents);

    // Use custom model settings if provided (for Ollama, etc.), otherwise use environment defaults
    let model;
    if (modelSettings && modelSettings.model) {
      model = getCustomModelProvider(modelSettings);
    } else {
      const modelId = process.env.AI_GATEWAY_MODEL || DEFAULT_MODEL;
      model = getModelProvider(modelId);
    }

    const result = streamText({
      model: model,
      system: systemPrompt,
      prompt: prompt,
      tools,
      stopWhen: stepCountIs(15), // Allow up to 15 steps for tool calls and retries (keeps dashboards focused)
      // Note: temperature removed as it's not supported by reasoning models like GPT-5
      experimental_telemetry: {
        isEnabled: true,
        functionId: "generate-dashboard",
        metadata: {
          dataSourceType: dataSourceType || "database",
        },
      },
    });

    // Create a custom stream that includes all events
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Use fullStream to get all events including tool calls and results
          for await (const part of result.fullStream) {
            // Serialize the event as JSON line
            controller.enqueue(encoder.encode(JSON.stringify(part) + "\n"));
          }
          controller.close();

          // Flush Langfuse traces after stream completes
          const processor = (globalThis as Record<string, unknown>)
            .langfuseSpanProcessor;
          if (
            processor &&
            typeof (processor as { forceFlush?: () => Promise<void> })
              .forceFlush === "function"
          ) {
            await (
              processor as { forceFlush: () => Promise<void> }
            ).forceFlush();
          }
        } catch (error) {
          console.error("Stream error:", error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Agentic generation error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Generation failed" },
      { status: 500 },
    );
  }
}
