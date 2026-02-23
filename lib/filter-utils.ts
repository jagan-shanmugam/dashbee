/**
 * Filter utilities for SQL query parameter injection
 */

/**
 * Validate that a column name is safe (prevents SQL injection via column names).
 * Only allows alphanumeric characters, underscores, dots (for table.column), and hyphens.
 */
export function isValidColumnName(name: string): boolean {
  // Allow: letters, numbers, underscores, dots (table.column), hyphens
  // Max length 128 to prevent abuse
  return /^[a-zA-Z_][a-zA-Z0-9_.-]{0,127}$/.test(name);
}

/**
 * Sanitize a column name by removing potentially dangerous characters.
 * Returns null if the name is too dangerous to sanitize.
 */
export function sanitizeColumnName(name: string): string | null {
  if (!name || typeof name !== "string") return null;

  // Remove any characters that aren't alphanumeric, underscore, dot, or hyphen
  const sanitized = name.replace(/[^a-zA-Z0-9_.-]/g, "");

  // Must start with letter or underscore
  if (!/^[a-zA-Z_]/.test(sanitized)) return null;

  // Must have reasonable length
  if (sanitized.length === 0 || sanitized.length > 128) return null;

  return sanitized;
}

/**
 * Replace {{placeholder}} patterns in SQL with actual values
 *
 * @param sql - SQL query with {{placeholder}} patterns
 * @param params - Object mapping placeholder names to values
 * @returns SQL with placeholders replaced
 *
 * @example
 * injectFilterParams(
 *   "SELECT * FROM orders WHERE date BETWEEN '{{date_from}}' AND '{{date_to}}'",
 *   { date_from: "2024-01-01", date_to: "2024-01-31" }
 * )
 * // Returns: "SELECT * FROM orders WHERE date BETWEEN '2024-01-01' AND '2024-01-31'"
 */
export function injectFilterParams(
  sql: string,
  params: Record<string, string>,
): string {
  let result = sql;

  for (const [key, value] of Object.entries(params)) {
    // Validate the key (placeholder name) to prevent injection via key
    if (!isValidColumnName(key)) {
      console.warn(`Skipping invalid filter key: ${key}`);
      continue;
    }

    // Escape special regex characters in the key
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`\\{\\{${escapedKey}\\}\\}`, "g");
    // Escape single quotes in the value to prevent SQL injection
    const safeValue = escapeSQL(value);
    result = result.replace(pattern, safeValue);
  }

  return result;
}

/**
 * Escape SQL string value to prevent injection
 */
function escapeSQL(value: string): string {
  return value.replace(/'/g, "''");
}

/**
 * Check if a SQL query has unresolved placeholders
 */
export function hasUnresolvedPlaceholders(sql: string): boolean {
  return /\{\{[^}]+\}\}/.test(sql);
}

/**
 * Extract placeholder names from SQL query
 */
export function extractPlaceholders(sql: string): string[] {
  const matches = sql.match(/\{\{([^}]+)\}\}/g);
  if (!matches) return [];
  return [...new Set(matches.map((m) => m.slice(2, -2)))];
}

/**
 * Remove unresolved optional filter conditions from SQL.
 * This handles the case where filters are not provided (e.g., "All" selected for dropdowns,
 * or missing date range params during history restore).
 *
 * Patterns removed:
 * - AND column = '{{placeholder}}'
 * - AND t.column = '{{placeholder}}' (table-qualified)
 * - AND column IN ({{placeholder}})
 * - AND column LIKE '{{placeholder}}'
 * - AND column >= {{placeholder}} (numeric, unquoted)
 * - AND column BETWEEN '{{from}}' AND '{{to}}'
 * - WHERE column = '{{placeholder}}' (replaced with WHERE 1=1)
 *
 * @param sql - SQL with potentially unresolved placeholders
 * @returns SQL with unresolved conditions removed
 */
export function removeUnresolvedConditions(sql: string): string {
  let result = sql;

  // Column pattern: handles simple names and table.column or alias.column
  const colPattern = "[\\w.]+";
  // Operator pattern: handles all comparison operators
  const opPattern = "(?:=|!=|<>|<=|>=|<|>|IN|LIKE|NOT\\s+IN|NOT\\s+LIKE)";
  // Value pattern: handles quoted strings, parenthesized lists, and unquoted values containing placeholders
  const quotedValPattern = "'[^']*\\{\\{[^}]+\\}\\}[^']*'";
  const parenValPattern = "\\([^)]*\\{\\{[^}]+\\}\\}[^)]*\\)";
  const unquotedValPattern = "\\{\\{[^}]+\\}\\}";

  // Remove AND BETWEEN conditions with unresolved placeholders (table-qualified columns)
  // Matches: AND t.column BETWEEN '{{date_from}}' AND '{{date_to}}'
  result = result.replace(
    new RegExp(
      `\\s+AND\\s+${colPattern}\\s+BETWEEN\\s+'[^']*\\{\\{[^}]+\\}\\}[^']*'\\s+AND\\s+'[^']*\\{\\{[^}]+\\}\\}[^']*'`,
      "gi",
    ),
    "",
  );

  // Remove AND conditions with unresolved placeholders (table-qualified columns, all operators)
  // Matches: AND t.column = '{{placeholder}}', AND column >= {{num}}, etc.
  result = result.replace(
    new RegExp(
      `\\s+AND\\s+${colPattern}\\s*${opPattern}\\s*(?:${quotedValPattern}|${parenValPattern}|${unquotedValPattern})`,
      "gi",
    ),
    "",
  );

  // Handle OR conditions similarly
  result = result.replace(
    new RegExp(
      `\\s+OR\\s+${colPattern}\\s*${opPattern}\\s*(?:${quotedValPattern}|${parenValPattern}|${unquotedValPattern})`,
      "gi",
    ),
    "",
  );

  // If WHERE clause starts with BETWEEN with unresolved placeholders, replace with WHERE 1=1
  result = result.replace(
    new RegExp(
      `WHERE\\s+${colPattern}\\s+BETWEEN\\s+'[^']*\\{\\{[^}]+\\}\\}[^']*'\\s+AND\\s+'[^']*\\{\\{[^}]+\\}\\}[^']*'\\s*(?=AND|OR|GROUP|ORDER|LIMIT|HAVING|$)`,
      "gi",
    ),
    "WHERE 1=1 ",
  );

  // If WHERE clause starts with unresolved condition, replace with WHERE 1=1
  result = result.replace(
    new RegExp(
      `WHERE\\s+${colPattern}\\s*${opPattern}\\s*(?:${quotedValPattern}|${parenValPattern}|${unquotedValPattern})\\s*(?=AND|OR|GROUP|ORDER|LIMIT|HAVING|$)`,
      "gi",
    ),
    "WHERE 1=1 ",
  );

  // Clean up WHERE 1=1 AND 1=1 patterns
  result = result.replace(/WHERE\s+1\s*=\s*1\s+AND\s+1\s*=\s*1/gi, "WHERE 1=1");

  // Clean up any double spaces
  result = result.replace(/\s+/g, " ").trim();

  return result;
}

/**
 * Aggressively strip all remaining unresolved placeholders from SQL.
 * This is a fallback when removeUnresolvedConditions() doesn't catch all patterns.
 *
 * Strategy:
 * 1. Handle AI-generated defensive patterns (CASE WHEN, COALESCE, etc.)
 * 2. Try to remove enclosing conditions (AND/OR clauses)
 * 3. Replace remaining placeholders with safe defaults
 *
 * @param sql - SQL that may still have unresolved placeholders
 * @returns SQL with all placeholders removed
 */
export function stripAllUnresolvedPlaceholders(sql: string): string {
  let result = sql;

  // Keep processing until no placeholders remain or we can't make progress
  let iterations = 0;
  const maxIterations = 20;

  while (hasUnresolvedPlaceholders(result) && iterations < maxIterations) {
    const before = result;

    // =============================================================
    // PHASE 1: Handle AI-generated defensive SQL patterns
    // These patterns wrap placeholders in CASE WHEN / COALESCE / etc.
    // =============================================================

    // Pattern 1: CASE WHEN '{{x}}' ... ELSE TRUE END → TRUE
    // Handles: CASE WHEN '{{date}}' ~ '^[0-9]...' THEN condition ELSE TRUE END
    result = result.replace(
      /CASE\s+WHEN\s+'[^']*\{\{[^}]+\}\}[^']*'[^E]*?ELSE\s+TRUE\s+END/gi,
      "TRUE",
    );

    // Pattern 2: CASE WHEN '{{x}}' LIKE 'NULL' ... THEN TRUE ELSE condition END → condition
    // Handles: CASE WHEN '{{region}}' LIKE 'NULL' THEN TRUE ELSE region = '{{region}}' END
    // Extract the ELSE clause condition
    result = result.replace(
      /CASE\s+WHEN\s+'[^']*\{\{[^}]+\}\}[^']*'[^T]*?THEN\s+TRUE\s+ELSE\s+([^E]+?)\s+END/gi,
      "$1",
    );

    // Pattern 3: (CASE WHEN '{{x}}' ... END) wrapped in parentheses → TRUE
    result = result.replace(
      /\(\s*CASE\s+WHEN\s+'[^']*\{\{[^}]+\}\}[^']*'[^)]*?END\s*\)/gi,
      "TRUE",
    );

    // Pattern 4: to_date('{{x}}', 'format') → NULL
    // Handles: to_date('{{date_from}}', 'YYYY-MM-DD')
    result = result.replace(
      /to_date\s*\(\s*'[^']*\{\{[^}]+\}\}[^']*'\s*,\s*'[^']*'\s*\)/gi,
      "NULL",
    );

    // Pattern 5: COALESCE(NULLIF('{{x}}', ...), default) → default
    // Handles: COALESCE(NULLIF('{{region}}', ''), region)
    result = result.replace(
      /COALESCE\s*\(\s*NULLIF\s*\(\s*'[^']*\{\{[^}]+\}\}[^']*'\s*,\s*'[^']*'\s*\)\s*,\s*([^)]+)\)/gi,
      "$1",
    );

    // Pattern 6: COALESCE(NULLIF(to_date('{{x}}', ...), ...), default) → default
    result = result.replace(
      /COALESCE\s*\(\s*NULLIF\s*\(\s*to_date\s*\([^)]+\{\{[^}]+\}\}[^)]*\)[^)]*\)\s*,\s*([^)]+)\)/gi,
      "$1",
    );

    // Pattern 7: '{{x}}'::date or '{{x}}'::timestamp etc → NULL
    // Handles: '{{date_from}}'::date
    result = result.replace(/'[^']*\{\{[^}]+\}\}[^']*'::\w+/gi, "NULL");

    // Pattern 8: Quoted placeholder without cast: '{{x}}' → NULL
    // Must come after patterns that might include quotes
    result = result.replace(/'[^']*\{\{[^}]+\}\}[^']*'/g, "NULL");

    // =============================================================
    // PHASE 2: Clean up redundant TRUE conditions
    // =============================================================

    // Remove AND TRUE patterns
    result = result.replace(
      /\s+AND\s+TRUE(?=\s+AND|\s+OR|\s+GROUP|\s+ORDER|\s+LIMIT|\s+HAVING|\s*$)/gi,
      "",
    );

    // Remove leading TRUE AND
    result = result.replace(/WHERE\s+TRUE\s+AND\s+/gi, "WHERE ");

    // Remove OR TRUE patterns (be careful - OR TRUE makes entire condition true)
    // Only safe to remove if it's trailing: ... OR TRUE → ...
    result = result.replace(
      /\s+OR\s+TRUE(?=\s*\)|\s+GROUP|\s+ORDER|\s+LIMIT|\s+HAVING|\s*$)/gi,
      "",
    );

    // =============================================================
    // PHASE 3: Try to remove entire conditions containing placeholders
    // =============================================================

    // Pattern: AND/OR followed by anything up to and including the placeholder
    result = result.replace(
      /\s+(?:AND|OR)\s+[^()]*?\{\{[^}]+\}\}[^()]*?(?=\s+AND|\s+OR|\s+GROUP|\s+ORDER|\s+LIMIT|\s+HAVING|$)/gi,
      "",
    );

    // If WHERE is followed directly by a placeholder-containing condition
    result = result.replace(
      /WHERE\s+[^()]*?\{\{[^}]+\}\}[^()]*?(?=\s+AND|\s+OR|\s+GROUP|\s+ORDER|\s+LIMIT|\s+HAVING|$)/gi,
      "WHERE 1=1 ",
    );

    // Handle LIMIT {{placeholder}} - replace with a safe default
    result = result.replace(/LIMIT\s+\{\{[^}]+\}\}/gi, "LIMIT 1000");

    // Handle OFFSET {{placeholder}} - replace with 0
    result = result.replace(/OFFSET\s+\{\{[^}]+\}\}/gi, "OFFSET 0");

    // =============================================================
    // PHASE 4: Last resort - replace any remaining placeholders
    // =============================================================

    if (result === before) {
      // If we made no progress, replace remaining placeholders with NULL
      result = result.replace(/\{\{[^}]+\}\}/g, "NULL");
      break;
    }

    iterations++;
  }

  // =============================================================
  // PHASE 5: Final cleanup
  // =============================================================

  // First, clean up WHERE TRUE AND → WHERE (remove redundant TRUE)
  result = result.replace(/WHERE\s+TRUE\s+AND\s+/gi, "WHERE ");

  // Clean up AND TRUE patterns in final output
  result = result.replace(
    /\s+AND\s+TRUE(?=\s+AND|\s+OR|\s+GROUP|\s+ORDER|\s+LIMIT|\s+HAVING|\s*$)/gi,
    "",
  );

  // Clean up WHERE TRUE (becomes WHERE 1=1 for consistency) - only if standalone
  result = result.replace(
    /WHERE\s+TRUE(?=\s+GROUP|\s+ORDER|\s+LIMIT|\s+HAVING|\s*$)/gi,
    "WHERE 1=1",
  );

  // Remove empty WHERE clauses
  result = result.replace(/WHERE\s+(?=GROUP|ORDER|LIMIT|HAVING|$)/gi, "");

  // Clean up WHERE 1=1 when it's the only condition
  result = result.replace(
    /WHERE\s+1\s*=\s*1\s*(?=GROUP|ORDER|LIMIT|HAVING|$)/gi,
    "",
  );

  // Clean up double spaces
  result = result.replace(/\s+/g, " ").trim();

  return result;
}
