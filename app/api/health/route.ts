export async function GET() {
  // Debug: check if AI provider env vars are loaded (don't expose actual values)
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  return Response.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    aiProviders: {
      openRouter: openRouterKey ? `set (${openRouterKey.length} chars, starts: ${openRouterKey.substring(0, 8)}...)` : 'not set',
      gemini: geminiKey ? `set (${geminiKey.length} chars, starts: ${geminiKey.substring(0, 8)}...)` : 'not set',
    },
  });
}
