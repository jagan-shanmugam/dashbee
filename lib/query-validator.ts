const DISALLOWED_PATTERNS = [
  /\b(INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|GRANT|REVOKE)\b/i,
  /\b(EXECUTE|EXEC|CALL)\b/i,
  /--/,
  /\/\*/,
  /;\s*\w/,
  /\bpg_sleep\b/i,
  /\bpg_read_file\b/i,
];

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateQuery(sql: string): ValidationResult {
  if (!sql || sql.length > 5000) {
    return { valid: false, error: "Invalid query length" };
  }

  for (const pattern of DISALLOWED_PATTERNS) {
    if (pattern.test(sql)) {
      return { valid: false, error: "Query contains disallowed operations" };
    }
  }

  const trimmed = sql.trim().toUpperCase();
  if (!trimmed.startsWith("SELECT") && !trimmed.startsWith("WITH")) {
    return { valid: false, error: "Only SELECT queries allowed" };
  }

  return { valid: true };
}
