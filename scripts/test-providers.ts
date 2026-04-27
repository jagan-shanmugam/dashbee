import "dotenv/config";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";

// Try V2 key if V1 fails
const OPENROUTER_V2_KEY = process.env.OPENROUTER_V2_KEY ?? "";

async function testOpenRouter(apiKey: string, label: string) {
  console.log(`🧪 Testing OpenRouter (${label})...`);
  const openrouter = createOpenRouter({ apiKey });
  
  const { text } = await generateText({
    model: openrouter("anthropic/claude-haiku-4.5"),
    prompt: "Say 'OpenRouter works!' in exactly 3 words",
    maxTokens: 20,
  });
  console.log("✅ OpenRouter response:", text.trim());
  return true;
}

async function testGemini() {
  console.log("🧪 Testing Gemini...");
  const gemini = createGoogleGenerativeAI({ 
    apiKey: process.env.GEMINI_API_KEY 
  });
  
  const { text } = await generateText({
    model: gemini("gemini-2.5-flash"),
    prompt: "Say 'Gemini works!' in exactly 3 words",
    maxTokens: 20,
  });
  console.log("✅ Gemini response:", text.trim());
}

async function main() {
  // Test V1 key first
  try {
    await testOpenRouter(process.env.OPENROUTER_API_KEY!, "V1 key");
  } catch (e: unknown) {
    const error = e as Error;
    console.log("❌ OpenRouter V1 failed:", error.message);
    
    // Try V2 key
    try {
      await testOpenRouter(OPENROUTER_V2_KEY, "V2 key");
      console.log("💡 V2 key works!");
    } catch (e2: unknown) {
      const error2 = e2 as Error;
      console.log("❌ OpenRouter V2 also failed:", error2.message);
    }
  }
  
  try {
    await testGemini();
  } catch (e: unknown) {
    const error = e as Error;
    console.log("❌ Gemini failed:", error.message);
  }
}

main();
