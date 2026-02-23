"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Filter, RefreshCw, Calendar, ChevronDown, X } from "lucide-react";
import {
  useFilters,
  DATE_PRESETS,
  type FilterDefinition,
  type DateRangeValue,
} from "@/lib/filter-context";

interface FilterBarProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

/**
 * Internal filter input component for FilterBar
 */
function FilterInput({ filter }: { filter: FilterDefinition }) {
  if (filter.type === "date-range") {
    return <DateRangeInput filter={filter} />;
  }
  return <DropdownInput filter={filter} />;
}

function DateRangeInput({ filter }: { filter: FilterDefinition }) {
  const { values, setValue } = useFilters();
  const [showPresets, setShowPresets] = useState(false);
  const [activePreset, setActivePreset] = useState<string>(
    filter.defaultPreset || "last30days",
  );
  const dropdownRef = useRef<HTMLDivElement>(null);

  const value = values[filter.id] as DateRangeValue | null;

  // Close dropdown on click outside
  useEffect(() => {
    if (!showPresets) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowPresets(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showPresets]);

  const handlePresetSelect = useCallback(
    (presetKey: keyof typeof DATE_PRESETS) => {
      const range = DATE_PRESETS[presetKey].getRange();
      setValue(filter.id, range);
      setActivePreset(presetKey);
      setShowPresets(false);
    },
    [filter.id, setValue],
  );

  const handleDateChange = useCallback(
    (field: "from" | "to", dateValue: string) => {
      const current = value || { from: "", to: "" };
      setValue(filter.id, { ...current, [field]: dateValue });
      setActivePreset("custom");
    },
    [filter.id, value, setValue],
  );

  return (
    <div ref={dropdownRef} style={{ position: "relative" }}>
      <label
        style={{
          display: "block",
          fontSize: 12,
          fontWeight: 500,
          color: "var(--muted)",
          marginBottom: 4,
        }}
      >
        {filter.label}
      </label>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button
          onClick={() => setShowPresets(!showPresets)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            fontSize: 13,
            color: "var(--foreground)",
            cursor: "pointer",
          }}
        >
          <Calendar size={14} />
          <span>
            {DATE_PRESETS[activePreset as keyof typeof DATE_PRESETS]?.label ||
              "Select"}
          </span>
          <ChevronDown size={14} />
        </button>

        {activePreset === "custom" && value && (
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <input
              type="date"
              value={value.from}
              onChange={(e) => handleDateChange("from", e.target.value)}
              style={{
                padding: "6px 8px",
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                fontSize: 13,
                color: "var(--foreground)",
              }}
            />
            <span style={{ color: "var(--muted)", fontSize: 12 }}>to</span>
            <input
              type="date"
              value={value.to}
              onChange={(e) => handleDateChange("to", e.target.value)}
              style={{
                padding: "6px 8px",
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                fontSize: 13,
                color: "var(--foreground)",
              }}
            />
          </div>
        )}
      </div>

      {showPresets && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            marginTop: 4,
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
            zIndex: 100,
            minWidth: 160,
          }}
        >
          {Object.entries(DATE_PRESETS).map(([key, preset]) => (
            <button
              key={key}
              onClick={() =>
                handlePresetSelect(key as keyof typeof DATE_PRESETS)
              }
              style={{
                display: "block",
                width: "100%",
                padding: "8px 12px",
                background:
                  activePreset === key ? "var(--border)" : "transparent",
                border: "none",
                textAlign: "left",
                fontSize: 13,
                color: "var(--foreground)",
                cursor: "pointer",
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DropdownInput({ filter }: { filter: FilterDefinition }) {
  const { values, setValue } = useFilters();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const value = values[filter.id];

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
  // For dropdown filters, value is always string or string[]
  const selectedValues: string[] = Array.isArray(value)
    ? (value as string[])
    : typeof value === "string"
      ? [value]
      : [];
  const options = filter.options || [];

  const handleSelect = useCallback(
    (option: string) => {
      if (filter.multiSelect) {
        const current = Array.isArray(value) ? value : [];
        if (current.includes(option)) {
          setValue(
            filter.id,
            current.filter((v) => v !== option),
          );
        } else {
          setValue(filter.id, [...current, option]);
        }
      } else {
        setValue(filter.id, option);
        setIsOpen(false);
      }
    },
    [filter.id, filter.multiSelect, value, setValue],
  );

  const handleClear = useCallback(() => {
    setValue(filter.id, filter.multiSelect ? [] : null);
  }, [filter.id, filter.multiSelect, setValue]);

  const displayText =
    selectedValues.length === 0
      ? "All"
      : selectedValues.length === 1
        ? selectedValues[0]
        : `${selectedValues.length} selected`;

  return (
    <div ref={dropdownRef} style={{ position: "relative" }}>
      <label
        style={{
          display: "block",
          fontSize: 12,
          fontWeight: 500,
          color: "var(--muted)",
          marginBottom: 4,
        }}
      >
        {filter.label}
      </label>
      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            fontSize: 13,
            color: "var(--foreground)",
            cursor: "pointer",
            minWidth: 120,
          }}
        >
          <span style={{ flex: 1, textAlign: "left" }}>{displayText}</span>
          <ChevronDown size={14} />
        </button>

        {selectedValues.length > 0 && (
          <button
            onClick={handleClear}
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
            title="Clear filter"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            marginTop: 4,
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
            zIndex: 100,
            minWidth: 160,
            maxHeight: 240,
            overflowY: "auto",
          }}
        >
          {/* "All" option for single-select dropdowns */}
          {!filter.multiSelect && (
            <button
              onClick={() => {
                setValue(filter.id, null);
                setIsOpen(false);
              }}
              onMouseEnter={(e) => {
                if (selectedValues.length !== 0) {
                  e.currentTarget.style.background = "var(--border)";
                }
              }}
              onMouseLeave={(e) => {
                if (selectedValues.length !== 0) {
                  e.currentTarget.style.background = "transparent";
                }
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: "100%",
                padding: "8px 12px",
                background: selectedValues.length === 0 ? "var(--border)" : "transparent",
                border: "none",
                textAlign: "left",
                fontSize: 13,
                color: "var(--foreground)",
                cursor: "pointer",
                transition: "background 0.15s ease",
              }}
            >
              All
            </button>
          )}
          {options.map((option) => {
            const isSelected = selectedValues.includes(option);
            return (
              <button
                key={option}
                onClick={() => handleSelect(option)}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = "var(--border)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = "transparent";
                  }
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  padding: "8px 12px",
                  background: isSelected ? "var(--border)" : "transparent",
                  border: "none",
                  textAlign: "left",
                  fontSize: 13,
                  color: "var(--foreground)",
                  cursor: "pointer",
                  transition: "background 0.15s ease",
                }}
              >
                {filter.multiSelect && (
                  <span
                    style={{
                      width: 16,
                      height: 16,
                      border: "1px solid var(--border)",
                      borderRadius: 3,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: isSelected
                        ? "var(--foreground)"
                        : "transparent",
                      color: isSelected ? "var(--background)" : "transparent",
                      fontSize: 10,
                    }}
                  >
                    {isSelected && "✓"}
                  </span>
                )}
                {option}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Filter bar component - container for dashboard filters
 */
export function FilterBar({ onRefresh, isRefreshing }: FilterBarProps) {
  const { filters, clearValues } = useFilters();

  if (filters.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: 16,
        padding: "12px 16px",
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        marginBottom: 24,
        flexWrap: "wrap",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          color: "var(--muted)",
          fontSize: 13,
          fontWeight: 500,
          paddingBottom: 6,
        }}
      >
        <Filter size={14} />
        <span>Filters</span>
      </div>

      {filters.map((filter) => (
        <FilterInput key={filter.id} filter={filter} />
      ))}

      <div style={{ flex: 1 }} />

      <div style={{ display: "flex", gap: 8, paddingBottom: 6 }}>
        {filters.length > 0 && (
          <button
            onClick={clearValues}
            style={{
              padding: "6px 12px",
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              fontSize: 13,
              color: "var(--muted)",
              cursor: "pointer",
            }}
          >
            Clear all
          </button>
        )}

        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              background: "var(--foreground)",
              color: "var(--background)",
              border: "none",
              borderRadius: "var(--radius)",
              fontSize: 13,
              fontWeight: 500,
              cursor: isRefreshing ? "not-allowed" : "pointer",
              opacity: isRefreshing ? 0.7 : 1,
            }}
          >
            <RefreshCw
              size={14}
              style={{
                animation: isRefreshing ? "spin 1s linear infinite" : "none",
              }}
            />
            <span>Apply</span>
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Helper function to create filter definitions from LLM output
 */
export function createFiltersFromSpec(
  spec: Array<{
    id: string;
    type: "date-range" | "dropdown";
    label: string;
    column: string;
    options?: string[];
    multiSelect?: boolean;
    defaultPreset?: string;
  }>,
): FilterDefinition[] {
  return spec.map((f) => ({
    id: f.id,
    type: f.type,
    label: f.label,
    column: f.column,
    options: f.options,
    multiSelect: f.multiSelect,
    defaultPreset: f.defaultPreset as FilterDefinition["defaultPreset"],
  }));
}
