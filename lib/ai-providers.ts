import { createOpenAI } from "@ai-sdk/openai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

const CUSTOM_OPENAI_MODELS = [
  "gpt-4o",
  "gpt-4o-mini",
  "gpt-5",
  "gpt-5-mini",
  "gpt-5.1",
];

export type ModelProvider = "openai" | "ollama" | "anthropic" | "azure" | "openrouter" | "gemini";

export interface CustomModelSettings {
  provider: ModelProvider;
  model: string;
  baseUrl?: string;
  apiKey?: string;
}

/**
 * Create OpenAI provider with custom configuration for corporate API gateway
 * baseURL must include the deployment name (model) per the Azure OpenAI API convention
 */
function createCustomOpenAIProvider(model: string) {
  const apiKey = process.env.OPENAI_API_KEY!;
  const baseURLPrefix = process.env.OPENAI_BASE_URL!;
  const apiVersion = process.env.OPENAI_API_VERSION || "2024-10-21";

  // Include the model/deployment name in the baseURL
  const baseURL = `${baseURLPrefix}/${model}/`;

  return createOpenAI({
    baseURL,
    headers: {
      "api-key": apiKey,
    },
    apiKey: apiKey,
    fetch: (input: string | Request | URL, init?: RequestInit) => {
      return fetch(
        input + "?" + new URLSearchParams({ "api-version": apiVersion }),
        init,
      );
    },
  });
}

// Cache providers per model
const providers = new Map<string, ReturnType<typeof createOpenAI>>();

function getOpenAIProvider(model: string) {
  if (!providers.has(model)) {
    providers.set(model, createCustomOpenAIProvider(model));
  }
  return providers.get(model)!;
}

/**
 * Get the appropriate model provider based on the model name
 * Returns a custom OpenAI model or passes through the model string for other providers
 */
export function getModelProvider(
  model: string,
): ReturnType<ReturnType<typeof createOpenAI>["chat"]> | string {
  if (CUSTOM_OPENAI_MODELS.includes(model)) {
    const provider = getOpenAIProvider(model);
    return provider.chat(model);
  }
  // Fallback to the model string for other providers (e.g., AI Gateway models)
  return model;
}

/**
 * Create an Ollama provider using OpenAI-compatible API
 * Ollama exposes /v1/chat/completions endpoint compatible with OpenAI SDK
 */
function createOllamaProvider(baseUrl: string = "http://localhost:11434/v1") {
  return createOpenAI({
    baseURL: baseUrl,
    apiKey: "ollama", // Ollama doesn't require API key, but SDK needs one
  });
}

/**
 * Create an OpenRouter provider using the official OpenRouter AI SDK
 * This is the recommended approach for proper tool calling support
 * Requires API key for authentication
 */
function createOpenRouterProvider(apiKey: string) {
  return createOpenRouter({
    apiKey,
  });
}

/**
 * Create a Gemini provider using Google's AI SDK
 * Requires API key for authentication
 */
function createGeminiProvider(apiKey: string) {
  return createGoogleGenerativeAI({ apiKey });
}

/**
 * Create provider from custom model settings
 * Used when user configures a custom model in the UI
 */
export function getCustomModelProvider(
  settings: CustomModelSettings,
): ReturnType<ReturnType<typeof createOpenAI>["chat"]> {
  if (settings.provider === "ollama") {
    const provider = createOllamaProvider(settings.baseUrl);
    return provider.chat(settings.model);
  }

  if (settings.provider === "openrouter") {
    const apiKey = settings.apiKey || process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error("OpenRouter requires an API key. Provide one in settings or set OPENROUTER_API_KEY.");
    }
    const provider = createOpenRouterProvider(apiKey);
    // OpenRouter SDK uses provider(model) directly, not provider.chat(model)
    return provider(settings.model);
  }

  if (settings.provider === "gemini") {
    const apiKey = settings.apiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Gemini requires an API key. Provide one in settings or set GEMINI_API_KEY.");
    }
    const provider = createGeminiProvider(apiKey);
    return provider(settings.model);
  }

  if (settings.provider === "openai" && settings.apiKey) {
    const provider = createOpenAI({
      apiKey: settings.apiKey,
      baseURL: settings.baseUrl || "https://api.openai.com/v1",
    });
    return provider.chat(settings.model);
  }

  // Fallback to default provider
  throw new Error(`Unsupported provider: ${settings.provider}`);
}

export { CUSTOM_OPENAI_MODELS };
