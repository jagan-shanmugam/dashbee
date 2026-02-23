import { LangfuseSpanProcessor, ShouldExportSpan } from "@langfuse/otel";
import { NodeSDK } from "@opentelemetry/sdk-node";

/**
 * Filter out Next.js infrastructure spans to keep Langfuse traces clean.
 * Only exports AI SDK spans (model calls, tool executions).
 */
const shouldExportSpan: ShouldExportSpan = (span) => {
  return span.otelSpan.instrumentationScope.name !== "next.js";
};

/**
 * Next.js instrumentation hook - runs on server startup.
 * Initializes OpenTelemetry with Langfuse for LLM observability.
 *
 * This setup automatically traces:
 * - All generateText and streamText calls
 * - All tool executions (including SQL queries!)
 * - Token usage and latency
 * - Multi-step agent workflows
 */
export async function register() {
  // Only initialize if Langfuse credentials are configured
  if (!process.env.LANGFUSE_SECRET_KEY || !process.env.LANGFUSE_PUBLIC_KEY) {
    console.log(
      "Langfuse credentials not configured, skipping telemetry setup"
    );
    return;
  }

  const langfuseSpanProcessor = new LangfuseSpanProcessor({
    secretKey: process.env.LANGFUSE_SECRET_KEY,
    publicKey: process.env.LANGFUSE_PUBLIC_KEY,
    baseUrl: process.env.LANGFUSE_BASE_URL || "https://cloud.langfuse.com",
    shouldExportSpan,
  });

  const sdk = new NodeSDK({
    spanProcessors: [langfuseSpanProcessor],
  });

  sdk.start();

  // Export for use in API routes (for forceFlush on request completion)
  (globalThis as Record<string, unknown>).langfuseSpanProcessor =
    langfuseSpanProcessor;

  console.log("Langfuse OpenTelemetry tracing initialized");
}
