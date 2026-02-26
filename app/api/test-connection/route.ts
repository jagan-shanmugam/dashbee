import { NextResponse } from "next/server";
import { testConnection } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { dbConfig } = await req.json();

    if (!dbConfig) {
      return NextResponse.json(
        { error: "Database configuration is required" },
        { status: 400 },
      );
    }

    // Handle demo database type specially
    if (dbConfig.type === "demo") {
      // Demo type uses server-side SUPABASE_CONNECTION_STRING
      if (!process.env.SUPABASE_CONNECTION_STRING) {
        return NextResponse.json(
          { error: "Demo database is not configured on this server" },
          { status: 503 },
        );
      }

      // Test connection using the demo config
      await testConnection(dbConfig);

      return NextResponse.json({
        success: true,
        message: "Connected to demo database",
      });
    }

    // For other database types, require full configuration
    if (!dbConfig.host || !dbConfig.database || !dbConfig.user) {
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
