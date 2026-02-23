import { generateText } from "ai";
import {
  introspectSchema,
  schemaToPrompt,
  fetchSampleData,
  TableInfo,
} from "@/lib/schema-introspector";
import { getModelProvider } from "@/lib/ai-providers";
import { DBConfig } from "@/lib/db";
import { apiCache } from "@/lib/api-cache";

export const maxDuration = 30;

const DEFAULT_MODEL = "anthropic/claude-haiku-4.5";

/**
 * File schema for generating questions from uploaded files
 */
export interface FileSchemaInput {
  tableName: string;
  columns: { name: string; type: string }[];
  sampleData: Record<string, unknown>[];
  fileName?: string;
  fileType?: string;
}

/**
 * Request body for generate-questions API
 */
interface GenerateQuestionsRequest {
  dbConfig?: DBConfig;
  fileSchema?: FileSchemaInput;
}

function buildPrompt(
  schemaPrompt: string,
  sampleData: Record<string, unknown[]>,
  isFileSource: boolean = false,
): string {
  // Format sample data concisely
  const sampleDataStr = Object.entries(sampleData)
    .filter(([, rows]) => rows.length > 0)
    .map(([table, rows]) => {
      const sample = rows.slice(0, 3); // Show first 3 rows as example
      return `${table}:\n${JSON.stringify(sample, null, 2)}`;
    })
    .join("\n\n");

  const sourceType = isFileSource ? "data file" : "database";

  return `Given this ${sourceType} schema and sample data, generate 4-6 natural language questions a user might ask to create a dashboard. Focus on:
- Aggregations (totals, counts, averages)
- Top N queries
- Time-based trends (if date columns exist)
- Comparisons and breakdowns by category
- Distribution analysis
Questions should be about business insights that can be answered with the data.
DATA SCHEMA:
${schemaPrompt}

SAMPLE DATA (first 3 rows):
${sampleDataStr || "No sample data available"}

Return ONLY a JSON array of question strings. Each question should be concise (under 60 characters) and actionable. Reference actual column names from the schema.
Focus on business-relevant questions.
IMPORTANT: End each question with "with key insights" to trigger analysis generation.
Example output format:
["Total sales by region with key insights", "Top products by return rate with key insights", "Monthly active users trend with key insights"]`;
}

/**
 * Convert file schema to TableInfo format for consistency
 */
function fileSchemaToTableInfo(fileSchema: FileSchemaInput): TableInfo[] {
  return [
    {
      schema: "file",
      name: fileSchema.tableName,
      columns: fileSchema.columns,
    },
  ];
}

/**
 * Convert file schema to sample data format
 */
function fileSchemaToSampleData(
  fileSchema: FileSchemaInput,
): Record<string, unknown[]> {
  return {
    [fileSchema.tableName]: fileSchema.sampleData.slice(0, 10),
  };
}

export async function POST(req: Request) {
  try {
    const { dbConfig, fileSchema } =
      (await req.json()) as GenerateQuestionsRequest;

    // Determine if this is a file or database request
    const isFileSource = !!fileSchema;

    // Generate cache key based on source type
    const cacheKey = isFileSource
      ? apiCache.generateKey("generate-questions-file", {
          tableName: fileSchema.tableName,
          columns: fileSchema.columns.map((c) => `${c.name}:${c.type}`).join(","),
        })
      : apiCache.generateKey("generate-questions", { dbConfig });

    // Check cache first (questions don't change often for same schema)
    const cachedQuestions = apiCache.get<{ questions: string[] }>(cacheKey);
    if (cachedQuestions) {
      return Response.json(cachedQuestions);
    }

    let tables: TableInfo[];
    let sampleData: Record<string, unknown[]>;

    if (isFileSource) {
      // Use file schema directly
      tables = fileSchemaToTableInfo(fileSchema);
      sampleData = fileSchemaToSampleData(fileSchema);
    } else {
      // Introspect database schema
      tables = await introspectSchema(dbConfig);
      if (tables.length === 0) {
        return Response.json({ questions: [] });
      }
      // Fetch sample data (10 rows per table)
      sampleData = await fetchSampleData(tables, dbConfig, 10);
    }

    const schemaPrompt = schemaToPrompt(tables);
    const prompt = buildPrompt(schemaPrompt, sampleData, isFileSource);

    const modelId = process.env.AI_GATEWAY_MODEL || DEFAULT_MODEL;
    const model = getModelProvider(modelId);

    let llmResult;
    // if model is gpt-5, remove temperature setting
    if (modelId.includes("gpt-5")) {
      llmResult = await generateText({
        model: model,
        prompt,
        experimental_telemetry: {
          isEnabled: true,
          functionId: "generate-questions",
        },
      });
    } else {
      llmResult = await generateText({
        model: model,
        prompt,
        temperature: 0.0,
        experimental_telemetry: {
          isEnabled: true,
          functionId: "generate-questions",
        },
      });
    }

    // Flush Langfuse traces
    const processor = (globalThis as Record<string, unknown>)
      .langfuseSpanProcessor;
    if (
      processor &&
      typeof (processor as { forceFlush?: () => Promise<void> }).forceFlush ===
        "function"
    ) {
      await (processor as { forceFlush: () => Promise<void> }).forceFlush();
    }

    // Parse the JSON array from the response
    const text = llmResult.text.trim();

    // Extract JSON array from response (handle potential markdown code blocks)
    let jsonStr = text;
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    const questions = JSON.parse(jsonStr) as string[];

    // Validate and filter questions
    const validQuestions = questions
      .filter((q): q is string => typeof q === "string" && q.length > 0)
      .slice(0, 6); // Max 6 questions

    const result = { questions: validQuestions };

    // Cache for 15 minutes (questions don't change often)
    apiCache.set(cacheKey, result, 15 * 60 * 1000);

    return Response.json(result);
  } catch (error) {
    console.error("Failed to generate questions:", error);
    return Response.json(
      { error: "Failed to generate questions", questions: [] },
      { status: 500 },
    );
  }
}
