"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";

export interface SavedQuery {
  id: string;
  name: string;
  sql: string;
  description?: string;
  tags?: string[];
  createdAt: string;
  usageCount: number;
}

interface SavedQueriesContextValue {
  savedQueries: SavedQuery[];
  saveQuery: (query: Omit<SavedQuery, "id" | "createdAt" | "usageCount">) => void;
  deleteQuery: (id: string) => void;
  updateQuery: (id: string, updates: Partial<SavedQuery>) => void;
  incrementUsage: (id: string) => void;
  getSuggestedQueries: (searchTerm: string) => SavedQuery[];
}

const SavedQueriesContext = createContext<SavedQueriesContextValue | null>(null);

const STORAGE_KEY = "dashb-saved-queries";

interface SavedQueriesProviderProps {
  children: ReactNode;
}

export function SavedQueriesProvider({ children }: SavedQueriesProviderProps) {
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSavedQueries(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load saved queries:", e);
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage when queries change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(savedQueries));
      } catch (e) {
        console.error("Failed to save queries:", e);
      }
    }
  }, [savedQueries, isLoaded]);

  const saveQuery = useCallback(
    (query: Omit<SavedQuery, "id" | "createdAt" | "usageCount">) => {
      const newQuery: SavedQuery = {
        ...query,
        id: `query-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        createdAt: new Date().toISOString(),
        usageCount: 0,
      };
      setSavedQueries((prev) => [newQuery, ...prev]);
    },
    []
  );

  const deleteQuery = useCallback((id: string) => {
    setSavedQueries((prev) => prev.filter((q) => q.id !== id));
  }, []);

  const updateQuery = useCallback((id: string, updates: Partial<SavedQuery>) => {
    setSavedQueries((prev) =>
      prev.map((q) => (q.id === id ? { ...q, ...updates } : q))
    );
  }, []);

  const incrementUsage = useCallback((id: string) => {
    setSavedQueries((prev) =>
      prev.map((q) =>
        q.id === id ? { ...q, usageCount: q.usageCount + 1 } : q
      )
    );
  }, []);

  const getSuggestedQueries = useCallback(
    (searchTerm: string): SavedQuery[] => {
      if (!searchTerm.trim()) {
        // Return most used queries
        return [...savedQueries]
          .sort((a, b) => b.usageCount - a.usageCount)
          .slice(0, 5);
      }

      const term = searchTerm.toLowerCase();
      return savedQueries
        .filter(
          (q) =>
            q.name.toLowerCase().includes(term) ||
            q.sql.toLowerCase().includes(term) ||
            q.description?.toLowerCase().includes(term) ||
            q.tags?.some((t) => t.toLowerCase().includes(term))
        )
        .sort((a, b) => b.usageCount - a.usageCount)
        .slice(0, 10);
    },
    [savedQueries]
  );

  return (
    <SavedQueriesContext.Provider
      value={{
        savedQueries,
        saveQuery,
        deleteQuery,
        updateQuery,
        incrementUsage,
        getSuggestedQueries,
      }}
    >
      {children}
    </SavedQueriesContext.Provider>
  );
}

export function useSavedQueries(): SavedQueriesContextValue {
  const context = useContext(SavedQueriesContext);
  if (!context) {
    throw new Error("useSavedQueries must be used within a SavedQueriesProvider");
  }
  return context;
}

