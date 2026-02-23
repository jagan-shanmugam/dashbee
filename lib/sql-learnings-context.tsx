"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";

/**
 * SQLLearning represents a discovered pattern or fix from SQL errors.
 * Inspired by agno-agi/dash's self-learning loop.
 */
export interface SQLLearning {
  id: string;
  title: string;
  learning: string;
  errorPattern?: string; // The original error message pattern
  fixPattern?: string; // The SQL fix that resolved it
  table?: string; // Related table name
  column?: string; // Related column name
  createdAt: string;
  usageCount: number;
}

interface SQLLearningsContextValue {
  learnings: SQLLearning[];
  saveLearning: (learning: Omit<SQLLearning, "id" | "createdAt" | "usageCount">) => void;
  deleteLearning: (id: string) => void;
  incrementUsage: (id: string) => void;
  searchLearnings: (errorMessage: string) => SQLLearning[];
  getLearningsForPrompt: () => string;
}

const SQLLearningsContext = createContext<SQLLearningsContextValue | null>(null);

const STORAGE_KEY = "dashb-sql-learnings";

interface SQLLearningsProviderProps {
  children: ReactNode;
}

export function SQLLearningsProvider({ children }: SQLLearningsProviderProps) {
  const [learnings, setLearnings] = useState<SQLLearning[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setLearnings(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load SQL learnings:", e);
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage when learnings change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(learnings));
      } catch (e) {
        console.error("Failed to save SQL learnings:", e);
      }
    }
  }, [learnings, isLoaded]);

  const saveLearning = useCallback(
    (learning: Omit<SQLLearning, "id" | "createdAt" | "usageCount">) => {
      // Check for duplicate learnings
      const existingIndex = learnings.findIndex(
        (l) =>
          l.title === learning.title ||
          (l.errorPattern && l.errorPattern === learning.errorPattern)
      );

      if (existingIndex >= 0) {
        // Update existing learning
        setLearnings((prev) =>
          prev.map((l, i) =>
            i === existingIndex
              ? { ...l, ...learning, usageCount: l.usageCount + 1 }
              : l
          )
        );
        return;
      }

      const newLearning: SQLLearning = {
        ...learning,
        id: `learning-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        createdAt: new Date().toISOString(),
        usageCount: 0,
      };
      setLearnings((prev) => [newLearning, ...prev].slice(0, 100)); // Keep max 100 learnings
    },
    [learnings]
  );

  const deleteLearning = useCallback((id: string) => {
    setLearnings((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const incrementUsage = useCallback((id: string) => {
    setLearnings((prev) =>
      prev.map((l) =>
        l.id === id ? { ...l, usageCount: l.usageCount + 1 } : l
      )
    );
  }, []);

  const searchLearnings = useCallback(
    (errorMessage: string): SQLLearning[] => {
      if (!errorMessage.trim()) return [];

      const term = errorMessage.toLowerCase();
      return learnings
        .filter(
          (l) =>
            l.errorPattern?.toLowerCase().includes(term) ||
            l.learning.toLowerCase().includes(term) ||
            l.table?.toLowerCase().includes(term) ||
            l.column?.toLowerCase().includes(term)
        )
        .sort((a, b) => b.usageCount - a.usageCount)
        .slice(0, 5);
    },
    [learnings]
  );

  /**
   * Get learnings formatted for inclusion in the agent's system prompt.
   * Returns the most relevant/used learnings as context.
   */
  const getLearningsForPrompt = useCallback((): string => {
    if (learnings.length === 0) return "";

    const topLearnings = [...learnings]
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 10);

    const learningLines = topLearnings.map(
      (l) => `- ${l.title}: ${l.learning}`
    );

    return `
PREVIOUS LEARNINGS (from past errors):
${learningLines.join("\n")}
`;
  }, [learnings]);

  return (
    <SQLLearningsContext.Provider
      value={{
        learnings,
        saveLearning,
        deleteLearning,
        incrementUsage,
        searchLearnings,
        getLearningsForPrompt,
      }}
    >
      {children}
    </SQLLearningsContext.Provider>
  );
}

export function useSQLLearnings(): SQLLearningsContextValue {
  const context = useContext(SQLLearningsContext);
  if (!context) {
    throw new Error("useSQLLearnings must be used within a SQLLearningsProvider");
  }
  return context;
}

