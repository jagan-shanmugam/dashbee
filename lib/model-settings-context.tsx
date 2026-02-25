"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

export type ModelProvider = "openai" | "ollama" | "anthropic" | "azure" | "openrouter" | "gemini";

export interface ModelSettings {
  /** Model provider type */
  provider: ModelProvider;
  /** Model name/ID */
  model: string;
  /** API base URL (for Ollama or custom endpoints) */
  baseUrl?: string;
  /** API key (optional for Ollama) */
  apiKey?: string;
  /** Whether to use the configured settings (vs environment defaults) */
  useCustomSettings: boolean;
}

const DEFAULT_MODEL_SETTINGS: ModelSettings = {
  provider: "openai",
  model: "",
  baseUrl: "",
  apiKey: "",
  useCustomSettings: false,
};

interface ModelSettingsContextValue {
  /** Current model settings */
  settings: ModelSettings;
  /** Update model settings */
  setSettings: (settings: Partial<ModelSettings>) => void;
  /** Reset to defaults */
  resetSettings: () => void;
  /** Get settings for API call */
  getApiSettings: () => {
    provider?: ModelProvider;
    model?: string;
    baseUrl?: string;
    apiKey?: string;
  } | null;
}

const ModelSettingsContext = createContext<ModelSettingsContextValue | null>(null);

interface ModelSettingsProviderProps {
  children: ReactNode;
}

export function ModelSettingsProvider({ children }: ModelSettingsProviderProps) {
  const [settings, setSettingsState] = useState<ModelSettings>(DEFAULT_MODEL_SETTINGS);

  const setSettings = useCallback((newSettings: Partial<ModelSettings>) => {
    setSettingsState((prev) => ({
      ...prev,
      ...newSettings,
    }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettingsState(DEFAULT_MODEL_SETTINGS);
  }, []);

  const getApiSettings = useCallback(() => {
    if (!settings.useCustomSettings) {
      return null;
    }
    return {
      provider: settings.provider,
      model: settings.model || undefined,
      baseUrl: settings.baseUrl || undefined,
      apiKey: settings.apiKey || undefined,
    };
  }, [settings]);

  return (
    <ModelSettingsContext.Provider
      value={{
        settings,
        setSettings,
        resetSettings,
        getApiSettings,
      }}
    >
      {children}
    </ModelSettingsContext.Provider>
  );
}

export function useModelSettings(): ModelSettingsContextValue {
  const context = useContext(ModelSettingsContext);
  if (!context) {
    throw new Error("useModelSettings must be used within a ModelSettingsProvider");
  }
  return context;
}

/**
 * Predefined Ollama models for quick selection
 */
export const OLLAMA_MODELS = [
  { id: "glm-4.7-flash:latest", name: "GLM 4.7 Flash", description: "Fast Chinese-English model" },
  { id: "llama3.2:latest", name: "Llama 3.2", description: "Meta's latest Llama model" },
  { id: "llama3.1:latest", name: "Llama 3.1", description: "Meta's Llama 3.1" },
  { id: "mistral:latest", name: "Mistral", description: "Mistral AI model" },
  { id: "codellama:latest", name: "Code Llama", description: "Code-focused model" },
  { id: "qwen2.5-coder:latest", name: "Qwen 2.5 Coder", description: "Alibaba's coding model" },
  { id: "deepseek-coder-v2:latest", name: "DeepSeek Coder v2", description: "DeepSeek coding model" },
];

/**
 * Predefined OpenRouter models for quick selection
 * Format: provider/model-name (OpenRouter's model ID convention)
 */
export const OPENROUTER_MODELS = [
  { id: "meta-llama/llama-3.1-8b-instruct", name: "Llama 3.1 8B", description: "Meta's efficient instruct model" },
  { id: "meta-llama/llama-3.1-70b-instruct", name: "Llama 3.1 70B", description: "Meta's powerful instruct model" },
  { id: "meta-llama/llama-3.3-70b-instruct", name: "Llama 3.3 70B", description: "Meta's latest Llama model" },
  { id: "mistralai/mistral-7b-instruct", name: "Mistral 7B", description: "Mistral AI's efficient model" },
  { id: "mistralai/mixtral-8x7b-instruct", name: "Mixtral 8x7B", description: "Mistral's MoE model" },
  { id: "google/gemma-2-9b-it", name: "Gemma 2 9B", description: "Google's open-weight model" },
  { id: "qwen/qwen-2.5-coder-32b-instruct", name: "Qwen 2.5 Coder", description: "Alibaba's coding model" },
  { id: "deepseek/deepseek-chat", name: "DeepSeek Chat", description: "DeepSeek's chat model" },
];

/**
 * Predefined Gemini models for quick selection
 * Uses Google's official model IDs
 */
export const GEMINI_MODELS = [
  { id: "gemini-3-flash-preview", name: "Gemini 3 Flash", description: "Frontier-class at lower cost (Recommended)" },
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", description: "Best price-performance" },
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", description: "Most advanced reasoning" },
  { id: "gemini-3-pro-preview", name: "Gemini 3 Pro", description: "State-of-the-art reasoning" },
];

/**
 * Default base URLs for providers
 */
export const PROVIDER_BASE_URLS: Record<ModelProvider, string> = {
  openai: "https://api.openai.com/v1",
  ollama: "http://localhost:11434/v1",
  anthropic: "https://api.anthropic.com",
  azure: "", // Configured via environment
  openrouter: "https://openrouter.ai/api/v1",
  gemini: "https://generativelanguage.googleapis.com/v1beta",
};
