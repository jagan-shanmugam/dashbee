import { NextResponse } from "next/server";
import { introspectSchema, schemaToPrompt } from "@/lib/schema-introspector";
import { apiCache } from "@/lib/api-cache";

export async function GET() {
  try {
    const cacheKey = apiCache.generateKey("schema", { default: true });

    const result = await apiCache.getOrCompute(
      cacheKey,
      async () => {
        const tables = await introspectSchema();
        const prompt = schemaToPrompt(tables);
        return { tables, prompt };
      },
      10 * 60 * 1000, // 10 minutes - schema doesn't change often
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Schema introspection error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to introspect schema",
      },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const { dbConfig } = await req.json();

    const cacheKey = apiCache.generateKey("schema", { dbConfig });

    const result = await apiCache.getOrCompute(
      cacheKey,
      async () => {
        const tables = await introspectSchema(dbConfig);
        const prompt = schemaToPrompt(tables);
        return { tables, prompt };
      },
      10 * 60 * 1000, // 10 minutes
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Schema introspection error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to introspect schema",
      },
      { status: 500 },
    );
  }
}
