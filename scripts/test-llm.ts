#!/usr/bin/env tsx
/**
 * Standalone script to test LLM functions
 * Run with: pnpm test:llm
 *
 * Make sure your .env.local file has the required API keys:
 * - OPENAI_API_KEY
 * - OPENAI_BASE_URL
 * - OPENAI_API_VERSION (optional)
 */

import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import {
  explainQueryResults,
  generateSQLSuggestions,
  refineDashboardPrompt,
  generateDataInsights,
} from "../lib/llm-tasks";

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local
dotenv.config({ path: resolve(__dirname, "../.env.local") });

async function testLLMFunctions() {
  console.log("🧪 Testing LLM Functions\n");

  // Print env variables (mask sensitive info)
  console.log("Using the following environment variables:");
  console.log(`- OPENAI_BASE_URL: ${process.env.OPENAI_BASE_URL || "Not Set"}`);
  console.log(
    `- OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? "****" + process.env.OPENAI_API_KEY.slice(-4) : "Not Set"}`,
  );
  console.log(
    `- OPENAI_API_VERSION: ${process.env.OPENAI_API_VERSION || "2024-10-21"}`,
  );
  console.log("");

  try {
    // Test 1: Prompt Refinement
    console.log("1️⃣ Testing Dashboard Prompt Refinement...");
    const originalPrompt = "Show me sales data";
    console.log(`Original: "${originalPrompt}"`);

    const refinedPromptGPT5 = await refineDashboardPrompt(
      originalPrompt,
      "gpt-5",
    );
    console.log(`✅ Refined (GPT-5): "${refinedPromptGPT5}"`);
    console.log("");

    const refinedPromptGPT4o = await refineDashboardPrompt(
      originalPrompt,
      "gpt-4o",
    );
    console.log(`✅ Refined (GPT-4o): "${refinedPromptGPT4o}"`);
    console.log("");

    // Test 2: SQL Suggestions Generation
    console.log("2️⃣ Testing SQL Suggestions Generation...");
    const userRequest = "Show me revenue by region";
    const schema = [
      "Tables:",
      "- orders (id, customer_id, total_amount, status, created_at)",
      "- customers (id, name, region, email)",
    ].join("\\n");

    const sqlSuggestions = await generateSQLSuggestions(
      userRequest,
      schema,
      "gpt-5",
    );
    console.log(`Request: "${userRequest}"`);
    console.log(`Schema: ${schema.split("\\n").join(", ")}`);
    console.log("✅ SQL Suggestions:");
    sqlSuggestions.forEach((sql, i) => console.log(`   ${i + 1}. ${sql}`));
    console.log("");

    // Test 3: Query Results Explanation
    console.log("3️⃣ Testing Query Results Explanation...");
    const query =
      "SELECT region, SUM(total_amount) as revenue FROM orders o JOIN customers c ON o.customer_id = c.id GROUP BY region";
    const results = [
      { region: "North", revenue: 125000 },
      { region: "South", revenue: 98000 },
      { region: "East", revenue: 110000 },
      { region: "West", revenue: 87000 },
    ];

    const explanation = await explainQueryResults(query, results, "gpt-5");
    console.log(`Query: ${query.substring(0, 80)}...`);
    console.log(`Results: ${results.length} rows`);
    console.log(`✅ Explanation: "${explanation}"`);
    console.log("");

    // Test 4: Data Insights Generation
    console.log("4️⃣ Testing Data Insights Generation...");
    const dashboardDescription = "Sales Revenue Dashboard";
    const dashboardData = {
      "total-revenue": [{ total: 420000 }],
      "revenue-by-region": results,
    };

    const insights = await generateDataInsights(
      dashboardData,
      dashboardDescription,
      "gpt-5",
    );

    console.log(`Dashboard: ${dashboardDescription}`);
    console.log("✅ Generated Insights:");
    insights.forEach((insight, i) => console.log(`   ${i + 1}. ${insight}`));
    console.log("");

    console.log("🎉 All LLM function tests completed successfully!");
  } catch (error) {
    console.error("❌ Error testing LLM functions:", error);

    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Stack trace:", error.stack);
    }

    console.log("\n🔧 Troubleshooting tips:");
    console.log("1. Make sure your .env.local file has the required API keys");
    console.log(
      "2. Check that your API keys are valid and have sufficient credits",
    );
    console.log("3. Verify your network connection");
    console.log("4. Ensure the AI services are accessible");
    console.log("5. Check your OPENAI_BASE_URL and OPENAI_API_KEY are correct");

    process.exit(1);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
const shouldRun = args.length === 0 || args.includes("--run");

// Only run if explicitly requested or no arguments provided
if (shouldRun) {
  testLLMFunctions().catch(console.error);
} else {
  console.log("📋 LLM Test Script");
  console.log("Usage: pnpm test:llm [--run]");
  console.log("");
  console.log("Options:");
  console.log("  --run    Actually execute the LLM calls (requires API keys)");
  console.log("");
  console.log("This script tests all LLM functions with sample data.");
  console.log("Without --run flag, it shows what would be tested.");
}
