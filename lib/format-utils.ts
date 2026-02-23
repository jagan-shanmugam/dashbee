/**
 * Shared formatting utilities for charts and data display
 */

/**
 * Detect the granularity of date values in an array
 * Looks for patterns to determine if data is daily, weekly, monthly, quarterly, or yearly
 */
export function detectDateGranularity(
  values: string[]
): "day" | "week" | "month" | "quarter" | "year" | "unknown" {
  if (values.length === 0) return "unknown";

  // Check for week indicators (W1, Week 1, etc.)
  if (values.some((v) => /^W\d+|Week\s*\d+/i.test(v))) {
    return "week";
  }

  // Check for quarter indicators (Q1, Q1 2024, etc.)
  if (values.some((v) => /^Q[1-4]\s*\d*$/i.test(v))) {
    return "quarter";
  }

  // Parse ISO dates and analyze
  const dates = values
    .map((v) => {
      if (/^\d{4}-\d{2}-\d{2}/.test(v)) {
        return new Date(v);
      }
      return null;
    })
    .filter((d): d is Date => d !== null && !isNaN(d.getTime()));

  if (dates.length < 2) return "unknown";

  // Check if all dates are first of month (monthly data)
  const allFirstOfMonth = dates.every((d) => d.getDate() === 1);
  if (allFirstOfMonth) {
    // Could be monthly, quarterly, or yearly
    const months = dates.map((d) => d.getMonth());
    const allJanuary = months.every((m) => m === 0);
    if (allJanuary) return "year";

    const allQuarterStart = months.every((m) => [0, 3, 6, 9].includes(m));
    if (allQuarterStart) return "quarter";

    return "month";
  }

  // Calculate average gap between consecutive dates
  const sortedDates = [...dates].sort((a, b) => a.getTime() - b.getTime());
  let totalGap = 0;
  for (let i = 1; i < sortedDates.length; i++) {
    totalGap += sortedDates[i]!.getTime() - sortedDates[i - 1]!.getTime();
  }
  const avgGapDays = totalGap / (sortedDates.length - 1) / (1000 * 60 * 60 * 24);

  if (avgGapDays <= 2) return "day";
  if (avgGapDays <= 10) return "week";
  if (avgGapDays <= 45) return "month";
  if (avgGapDays <= 120) return "quarter";
  return "year";
}

/**
 * Format a date label based on detected or specified granularity
 */
export function formatDateLabel(
  value: string | Date,
  granularity?: "day" | "week" | "month" | "quarter" | "year" | "unknown",
  options?: { includeYear?: boolean }
): string {
  // Handle week format (W1, Week 1, etc.)
  if (typeof value === "string" && /^W\d+|Week\s*\d+/i.test(value)) {
    return value;
  }

  // Handle quarter format (Q1, Q1 2024, etc.)
  if (typeof value === "string" && /^Q[1-4]/i.test(value)) {
    return value;
  }

  // Try to parse as date
  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) {
    // Not a valid date, return as-is
    return String(value);
  }

  const includeYear = options?.includeYear ?? true;

  switch (granularity) {
    case "day":
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        ...(includeYear && { year: "numeric" }),
      });

    case "week": {
      // Get week number
      const startOfYear = new Date(date.getFullYear(), 0, 1);
      const dayOfYear = Math.ceil(
        (date.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)
      );
      const weekNum = Math.ceil(dayOfYear / 7);
      return includeYear ? `W${weekNum} '${String(date.getFullYear()).slice(2)}` : `W${weekNum}`;
    }

    case "month":
      return date.toLocaleDateString("en-US", {
        month: "short",
        ...(includeYear && { year: "numeric" }),
      });

    case "quarter": {
      const quarter = Math.floor(date.getMonth() / 3) + 1;
      return includeYear ? `Q${quarter} ${date.getFullYear()}` : `Q${quarter}`;
    }

    case "year":
      return String(date.getFullYear());

    default: {
      // Auto-detect based on date format
      // Only show time if it's meaningful (not a placeholder like 00:00:00 or 12:00:00)
      if (typeof value === "string") {
        const hasTime = value.includes("T");
        if (hasTime) {
          const hours = date.getHours();
          const minutes = date.getMinutes();
          // Skip showing time for common placeholder times (midnight, noon)
          // or when minutes are 0 (likely a placeholder)
          const isMeaningfulTime = minutes !== 0 || (hours !== 0 && hours !== 12);
          if (isMeaningfulTime) {
            return date.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            });
          }
        }
      }
      // Default to month/day/year
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        ...(includeYear && { year: "numeric" }),
      });
    }
  }
}

/**
 * Format a number for display with appropriate formatting
 */
export function formatNumber(
  value: number,
  options?: {
    compact?: boolean;
    currency?: boolean;
    decimals?: number;
    forceCompact?: boolean;
  }
): string {
  const { compact = true, currency = false, decimals = 2, forceCompact = false } = options ?? {};

  // Use compact notation for large numbers
  const useCompact = forceCompact || (compact && Math.abs(value) >= 10000);

  const formatOptions: Intl.NumberFormatOptions = {
    maximumFractionDigits: decimals,
    notation: useCompact ? "compact" : "standard",
  };

  if (currency) {
    formatOptions.style = "currency";
    formatOptions.currency = "USD";
  }

  return new Intl.NumberFormat("en-US", formatOptions).format(value);
}

/**
 * Format a value for axis/tick display (always comma-separated, no compact)
 */
export function formatAxisValue(value: number, decimals = 0): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: decimals,
    notation: "standard",
  }).format(value);
}

/**
 * Format a value for tooltip display (more detailed)
 */
export function formatTooltipValue(
  value: number,
  options?: { currency?: boolean; decimals?: number }
): string {
  const { currency = false, decimals = 2 } = options ?? {};

  const formatOptions: Intl.NumberFormatOptions = {
    maximumFractionDigits: decimals,
    notation: "standard",
  };

  if (currency) {
    formatOptions.style = "currency";
    formatOptions.currency = "USD";
  }

  return new Intl.NumberFormat("en-US", formatOptions).format(value);
}

/**
 * Detect if a column name suggests currency values
 */
export function isCurrencyColumn(columnName: string): boolean {
  const currencyPatterns = [
    /price/i,
    /revenue/i,
    /amount/i,
    /cost/i,
    /total/i,
    /sales/i,
    /income/i,
    /profit/i,
    /spend/i,
    /budget/i,
    /payment/i,
    /fee/i,
    /charge/i,
  ];
  return currencyPatterns.some((pattern) => pattern.test(columnName));
}

/**
 * Format a label for display (truncate if needed)
 */
export function formatLabel(
  label: string,
  options?: { maxLength?: number; compact?: boolean }
): string {
  const { maxLength = 15, compact = false } = options ?? {};

  // Check if it looks like an ISO date string
  if (/^\d{4}-\d{2}-\d{2}/.test(label)) {
    return formatDateLabel(label, undefined, { includeYear: !compact });
  }

  // Truncate long labels
  if (label.length > maxLength && compact) {
    return label.slice(0, maxLength - 3) + "...";
  }

  return label;
}
