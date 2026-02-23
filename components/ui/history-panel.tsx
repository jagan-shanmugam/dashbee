"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  History,
  Trash2,
  X,
  Copy,
  CheckCircle,
  XCircle,
  ChartArea,
  Loader2,
} from "lucide-react";
import {
  loadHistory,
  removeFromHistory,
  clearHistory,
  formatTimestamp,
  type HistoryEntry,
} from "@/lib/query-history";

interface HistoryPanelProps {
  onSelectPrompt: (prompt: string) => void;
  onRestoreDashboard?: (entry: HistoryEntry) => void;
  currentDbName?: string;
}

/**
 * History panel component - shows past prompts
 * Can fully restore dashboards when onRestoreDashboard is provided
 */
export function HistoryPanel({
  onSelectPrompt,
  onRestoreDashboard,
  currentDbName,
}: HistoryPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load history on mount and when panel opens
  useEffect(() => {
    if (isOpen) {
      setHistory(loadHistory());
    }
  }, [isOpen]);

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

  const handleSelect = useCallback(
    (entry: HistoryEntry) => {
      // If entry has dashboard state and restore callback exists, restore full dashboard
      if (entry.tree && entry.queries && onRestoreDashboard) {
        setIsRestoring(true);
        // Small delay to show loading state before heavy restore operation
        setTimeout(() => {
          onRestoreDashboard(entry);
          setIsRestoring(false);
          setIsOpen(false);
        }, 50);
      } else {
        // Fallback: just fill in the prompt
        onSelectPrompt(entry.prompt);
        setIsOpen(false);
      }
    },
    [onSelectPrompt, onRestoreDashboard],
  );

  const handleDelete = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeFromHistory(id);
    setHistory((prev) => prev.filter((h) => h.id !== id));
  }, []);

  const handleCopy = useCallback(
    async (prompt: string, id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(prompt);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      } catch {
        console.error("Failed to copy");
      }
    },
    [],
  );

  const handleClearAll = useCallback(() => {
    clearHistory();
    setHistory([]);
  }, []);

  // Filter history by current database if specified
  const filteredHistory = currentDbName
    ? history.filter((h) => h.dbName === currentDbName)
    : history;

  return (
    <div ref={dropdownRef} style={{ position: "relative" }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "8px 12px",
          background: isOpen ? "var(--border)" : "transparent",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          color: "var(--foreground)",
          fontSize: 14,
          cursor: "pointer",
        }}
        title="Query History"
      >
        <History size={16} />
        <span>History</span>
        {filteredHistory.length > 0 && (
          <span
            style={{
              padding: "2px 6px",
              background: "var(--border)",
              borderRadius: 10,
              fontSize: 11,
              fontWeight: 500,
            }}
          >
            {filteredHistory.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: 8,
            width: 400,
            maxHeight: 500,
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.2)",
            zIndex: 100,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 600 }}>Query History</span>
            <div style={{ display: "flex", gap: 8 }}>
              {history.length > 0 && (
                <button
                  onClick={handleClearAll}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "4px 8px",
                    background: "transparent",
                    border: "none",
                    borderRadius: "var(--radius)",
                    color: "var(--muted)",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                  title="Clear all history"
                >
                  <Trash2 size={12} />
                  Clear
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 24,
                  height: 24,
                  background: "transparent",
                  border: "none",
                  borderRadius: "var(--radius)",
                  color: "var(--muted)",
                  cursor: "pointer",
                }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* History list */}
          <div
            style={{
              flex: 1,
              overflow: "auto",
              padding: "8px 0",
              position: "relative",
            }}
          >
            {/* Loading overlay */}
            {isRestoring && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "rgba(0, 0, 0, 0.5)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 10,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "12px 16px",
                    background: "var(--card)",
                    borderRadius: "var(--radius)",
                    fontSize: 14,
                  }}
                >
                  <Loader2 size={16} className="animate-spin" style={{ animation: "spin 1s linear infinite" }} />
                  Restoring dashboard...
                </div>
              </div>
            )}
            {filteredHistory.length === 0 ? (
              <div
                style={{
                  padding: "32px 16px",
                  textAlign: "center",
                  color: "var(--muted)",
                  fontSize: 14,
                }}
              >
                No history yet
              </div>
            ) : (
              filteredHistory.map((entry) => (
                <div
                  key={entry.id}
                  onClick={() => handleSelect(entry)}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    padding: "10px 16px",
                    cursor: "pointer",
                    borderBottom: "1px solid var(--border)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--border)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  {/* Status indicator */}
                  <div
                    style={{
                      marginTop: 2,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    {entry.success ? (
                      <CheckCircle
                        size={14}
                        style={{ color: "var(--success)" }}
                      />
                    ) : (
                      <XCircle
                        size={14}
                        style={{ color: "var(--destructive)" }}
                      />
                    )}
                    {/* Indicate if entry has full dashboard state (can be restored) */}
                    {entry.tree &&
                      entry.queries &&
                      entry.queries.length > 0 && (
                        <span
                          title="Click to restore full dashboard"
                          style={{ fontSize: 12, lineHeight: 1 }}
                        >
                          <ChartArea size={12} />
                        </span>
                      )}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 13,
                        color: "var(--foreground)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {entry.prompt}
                    </p>
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        marginTop: 4,
                        fontSize: 11,
                        color: "var(--muted)",
                      }}
                    >
                      <span>{formatTimestamp(entry.timestamp)}</span>
                      <span>•</span>
                      <span>{entry.dbName}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 4 }}>
                    <button
                      onClick={(e) => handleCopy(entry.prompt, entry.id, e)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 24,
                        height: 24,
                        background: "transparent",
                        border: "none",
                        borderRadius: "var(--radius)",
                        color:
                          copiedId === entry.id
                            ? "var(--success)"
                            : "var(--muted)",
                        cursor: "pointer",
                      }}
                      title="Copy prompt"
                    >
                      <Copy size={12} />
                    </button>
                    <button
                      onClick={(e) => handleDelete(entry.id, e)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 24,
                        height: 24,
                        background: "transparent",
                        border: "none",
                        borderRadius: "var(--radius)",
                        color: "var(--muted)",
                        cursor: "pointer",
                      }}
                      title="Delete"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
