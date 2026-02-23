"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, RefreshCw, Cpu, AlertCircle } from "lucide-react";
import {
  useModelSettings,
  OLLAMA_MODELS,
  OPENROUTER_MODELS,
  PROVIDER_BASE_URLS,
  type ModelProvider,
} from "@/lib/model-settings-context";

/**
 * Model settings dropdown for configuring AI provider
 *
 * Settings are stored in memory only - they reset on page refresh.
 * No API keys or sensitive data are persisted.
 */
export function ModelSettings() {
  const { settings, setSettings, resetSettings } = useModelSettings();
  const [isOpen, setIsOpen] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "success" | "error">("idle");
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Test Ollama connection
  const testConnection = async () => {
    if (settings.provider !== "ollama") return;

    setTestingConnection(true);
    setConnectionStatus("idle");
    setConnectionError(null);

    try {
      const baseUrl = settings.baseUrl || PROVIDER_BASE_URLS.ollama;
      const response = await fetch(`${baseUrl.replace("/v1", "")}/api/tags`, {
        method: "GET",
      });

      if (response.ok) {
        setConnectionStatus("success");
      } else {
        setConnectionStatus("error");
        setConnectionError("Failed to connect to Ollama");
      }
    } catch (err) {
      setConnectionStatus("error");
      setConnectionError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setTestingConnection(false);
    }
  };

  const handleProviderChange = (provider: ModelProvider) => {
    setSettings({
      provider,
      baseUrl: PROVIDER_BASE_URLS[provider],
      model: "",
      apiKey: "",
    });
    setConnectionStatus("idle");
  };

  const handleModelSelect = (modelId: string) => {
    setSettings({ model: modelId });
  };

  const isConfigured = settings.useCustomSettings && settings.model;

  return (
    <div ref={dropdownRef} style={{ position: "relative" }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 12px",
          background: isConfigured ? "rgba(34, 197, 94, 0.1)" : "transparent",
          border: isConfigured
            ? "1px solid rgba(34, 197, 94, 0.3)"
            : "1px solid var(--border)",
          borderRadius: "var(--radius)",
          fontSize: 14,
          color: "var(--foreground)",
          cursor: "pointer",
          transition: "all 0.15s ease",
        }}
        title="AI Model Settings"
      >
        <Cpu size={16} style={{ color: isConfigured ? "var(--success)" : undefined }} />
        <span>
          {isConfigured
            ? settings.model.split(":")[0]
            : "Model"}
        </span>
        <ChevronDown size={14} />
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: 8,
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)",
            minWidth: 320,
            maxHeight: 500,
            overflowY: "auto",
            zIndex: 101,
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <span style={{ fontWeight: 600, fontSize: 14 }}>AI Model Settings</span>
              <p
                style={{
                  margin: "4px 0 0 0",
                  fontSize: 11,
                  color: "var(--muted)",
                }}
              >
                Settings reset on page refresh
              </p>
            </div>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
              }}
            >
              <span style={{ fontSize: 12, color: "var(--muted)" }}>Enable</span>
              <input
                type="checkbox"
                checked={settings.useCustomSettings}
                onChange={(e) => setSettings({ useCustomSettings: e.target.checked })}
                style={{ cursor: "pointer" }}
              />
            </label>
          </div>

          {/* Provider selection */}
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 500,
                color: "var(--muted)",
                marginBottom: 8,
              }}
            >
              Provider
            </label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(["ollama", "openrouter", "openai"] as ModelProvider[]).map((provider) => (
                <button
                  key={provider}
                  onClick={() => handleProviderChange(provider)}
                  disabled={!settings.useCustomSettings}
                  style={{
                    flex: "1 1 auto",
                    minWidth: 80,
                    padding: "8px 12px",
                    background:
                      settings.provider === provider ? "var(--accent)" : "transparent",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    fontSize: 13,
                    color: "var(--foreground)",
                    cursor: settings.useCustomSettings ? "pointer" : "not-allowed",
                    opacity: settings.useCustomSettings ? 1 : 0.5,
                    textTransform: provider === "openrouter" ? "none" : "capitalize",
                  }}
                >
                  {provider === "openrouter" ? "OpenRouter" : provider}
                </button>
              ))}
            </div>
          </div>

          {/* Ollama configuration */}
          {settings.provider === "ollama" && (
            <>
              {/* Base URL */}
              <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 500,
                    color: "var(--muted)",
                    marginBottom: 8,
                  }}
                >
                  Ollama URL
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="text"
                    value={settings.baseUrl || PROVIDER_BASE_URLS.ollama}
                    onChange={(e) => setSettings({ baseUrl: e.target.value })}
                    placeholder="http://localhost:11434/v1"
                    disabled={!settings.useCustomSettings}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      background: "var(--background)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius)",
                      fontSize: 13,
                      color: "var(--foreground)",
                      opacity: settings.useCustomSettings ? 1 : 0.5,
                    }}
                  />
                  <button
                    onClick={testConnection}
                    disabled={!settings.useCustomSettings || testingConnection}
                    style={{
                      padding: "8px 12px",
                      background: "var(--foreground)",
                      color: "var(--background)",
                      border: "none",
                      borderRadius: "var(--radius)",
                      fontSize: 12,
                      cursor: settings.useCustomSettings ? "pointer" : "not-allowed",
                      opacity: settings.useCustomSettings ? 1 : 0.5,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <RefreshCw
                      size={12}
                      style={{
                        animation: testingConnection ? "spin 1s linear infinite" : "none",
                      }}
                    />
                    Test
                  </button>
                </div>
                {connectionStatus === "success" && (
                  <p
                    style={{
                      margin: "8px 0 0 0",
                      fontSize: 12,
                      color: "var(--success)",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Check size={12} /> Connected to Ollama
                  </p>
                )}
                {connectionStatus === "error" && (
                  <p
                    style={{
                      margin: "8px 0 0 0",
                      fontSize: 12,
                      color: "var(--destructive)",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <AlertCircle size={12} /> {connectionError || "Connection failed"}
                  </p>
                )}
              </div>

              {/* Model selection */}
              <div style={{ padding: "12px 16px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 500,
                    color: "var(--muted)",
                    marginBottom: 8,
                  }}
                >
                  Model
                </label>
                {/* Custom model input */}
                <input
                  type="text"
                  value={settings.model}
                  onChange={(e) => setSettings({ model: e.target.value })}
                  placeholder="Enter model name (e.g., glm-4.7-flash:latest)"
                  disabled={!settings.useCustomSettings}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "var(--background)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    fontSize: 13,
                    color: "var(--foreground)",
                    marginBottom: 8,
                    opacity: settings.useCustomSettings ? 1 : 0.5,
                  }}
                />
                {/* Quick select */}
                <p
                  style={{
                    margin: "8px 0 8px 0",
                    fontSize: 11,
                    color: "var(--muted)",
                  }}
                >
                  Quick select:
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {OLLAMA_MODELS.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => handleModelSelect(model.id)}
                      disabled={!settings.useCustomSettings}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 12px",
                        background:
                          settings.model === model.id
                            ? "var(--accent)"
                            : "transparent",
                        border: "none",
                        borderRadius: "var(--radius)",
                        fontSize: 13,
                        color: "var(--foreground)",
                        cursor: settings.useCustomSettings
                          ? "pointer"
                          : "not-allowed",
                        textAlign: "left",
                        opacity: settings.useCustomSettings ? 1 : 0.5,
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: 500 }}>{model.name}</span>
                        <span
                          style={{
                            marginLeft: 8,
                            fontSize: 11,
                            color: "var(--muted)",
                          }}
                        >
                          {model.description}
                        </span>
                      </div>
                      {settings.model === model.id && (
                        <Check size={14} style={{ color: "var(--success)" }} />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* OpenRouter configuration */}
          {settings.provider === "openrouter" && (
            <div style={{ padding: "12px 16px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 500,
                  color: "var(--muted)",
                  marginBottom: 8,
                }}
              >
                API Key
              </label>
              <input
                type="password"
                value={settings.apiKey || ""}
                onChange={(e) => setSettings({ apiKey: e.target.value })}
                placeholder="sk-or-..."
                disabled={!settings.useCustomSettings}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: "var(--background)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  fontSize: 13,
                  color: "var(--foreground)",
                  marginBottom: 12,
                  opacity: settings.useCustomSettings ? 1 : 0.5,
                }}
              />
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 500,
                  color: "var(--muted)",
                  marginBottom: 8,
                }}
              >
                Model
              </label>
              <input
                type="text"
                value={settings.model}
                onChange={(e) => setSettings({ model: e.target.value })}
                placeholder="meta-llama/llama-3.1-8b-instruct"
                disabled={!settings.useCustomSettings}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: "var(--background)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  fontSize: 13,
                  color: "var(--foreground)",
                  marginBottom: 8,
                  opacity: settings.useCustomSettings ? 1 : 0.5,
                }}
              />
              <p
                style={{
                  margin: "8px 0 8px 0",
                  fontSize: 11,
                  color: "var(--muted)",
                }}
              >
                Quick select:
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 200, overflowY: "auto" }}>
                {OPENROUTER_MODELS.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => handleModelSelect(model.id)}
                    disabled={!settings.useCustomSettings}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      background:
                        settings.model === model.id
                          ? "var(--accent)"
                          : "transparent",
                      border: "none",
                      borderRadius: "var(--radius)",
                      fontSize: 13,
                      color: "var(--foreground)",
                      cursor: settings.useCustomSettings
                        ? "pointer"
                        : "not-allowed",
                      textAlign: "left",
                      opacity: settings.useCustomSettings ? 1 : 0.5,
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 500 }}>{model.name}</span>
                      <span
                        style={{
                          marginLeft: 8,
                          fontSize: 11,
                          color: "var(--muted)",
                        }}
                      >
                        {model.description}
                      </span>
                    </div>
                    {settings.model === model.id && (
                      <Check size={14} style={{ color: "var(--success)" }} />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* OpenAI configuration */}
          {settings.provider === "openai" && (
            <div style={{ padding: "12px 16px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 500,
                  color: "var(--muted)",
                  marginBottom: 8,
                }}
              >
                API Key
              </label>
              <input
                type="password"
                value={settings.apiKey || ""}
                onChange={(e) => setSettings({ apiKey: e.target.value })}
                placeholder="sk-..."
                disabled={!settings.useCustomSettings}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: "var(--background)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  fontSize: 13,
                  color: "var(--foreground)",
                  marginBottom: 8,
                  opacity: settings.useCustomSettings ? 1 : 0.5,
                }}
              />
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 500,
                  color: "var(--muted)",
                  marginBottom: 8,
                }}
              >
                Model
              </label>
              <input
                type="text"
                value={settings.model}
                onChange={(e) => setSettings({ model: e.target.value })}
                placeholder="gpt-4o"
                disabled={!settings.useCustomSettings}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: "var(--background)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  fontSize: 13,
                  color: "var(--foreground)",
                  opacity: settings.useCustomSettings ? 1 : 0.5,
                }}
              />
            </div>
          )}

          {/* Footer */}
          <div
            style={{
              padding: "12px 16px",
              borderTop: "1px solid var(--border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <button
              onClick={() => {
                resetSettings();
                setConnectionStatus("idle");
              }}
              style={{
                padding: "6px 12px",
                background: "transparent",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                fontSize: 12,
                color: "var(--muted)",
                cursor: "pointer",
              }}
            >
              Reset
            </button>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                padding: "6px 12px",
                background: "var(--foreground)",
                color: "var(--background)",
                border: "none",
                borderRadius: "var(--radius)",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
