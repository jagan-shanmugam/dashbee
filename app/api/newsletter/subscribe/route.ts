import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdapter } from "@/lib/db-adapters/supabase";

/**
 * Newsletter subscription API endpoint.
 * Validates email, checks for duplicates, and inserts into Supabase.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, source = "landing_hero" } = body;

    // Validate email format
    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    // Normalize email (lowercase, trim)
    const normalizedEmail = email.toLowerCase().trim();

    // Get request metadata
    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    // Get Supabase adapter
    const db = getSupabaseAdapter();

    // Check if email already exists
    const existingResult = await db.query<{ email: string }>(
      "SELECT email FROM newsletter_subscribers WHERE email = $1 LIMIT 1",
      [normalizedEmail]
    );

    if (existingResult.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: "You're already subscribed!" },
        { status: 409 }
      );
    }

    // Insert new subscriber
    await db.query(
      `INSERT INTO newsletter_subscribers (email, source, ip_address, user_agent)
       VALUES ($1, $2, $3, $4)`,
      [normalizedEmail, source, ipAddress, userAgent]
    );

    return NextResponse.json({
      success: true,
      message: "Thanks for subscribing! We'll keep you updated.",
    });
  } catch (error) {
    console.error("Newsletter subscription error:", error);

    // Handle unique constraint violation (race condition)
    if (
      error instanceof Error &&
      error.message.includes("unique constraint")
    ) {
      return NextResponse.json(
        { success: false, error: "You're already subscribed!" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
