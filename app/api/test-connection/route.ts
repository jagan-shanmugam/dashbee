import { NextResponse } from "next/server";
import { testConnection } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { dbConfig } = await req.json();

    if (!dbConfig || !dbConfig.host || !dbConfig.database || !dbConfig.user) {
      return NextResponse.json(
        { error: "Database configuration is incomplete" },
        { status: 400 },
      );
    }

    // Test the connection
    await testConnection(dbConfig);

    return NextResponse.json({
      success: true,
      message: "Connection successful",
    });
  } catch (error) {
    console.error("Connection test error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Connection failed" },
      { status: 500 },
    );
  }
}
