const missingSchemaCodes = new Set(["42P01", "42703"]);

export function isMissingPlaidSchema(error: unknown): boolean {
  const visited = new Set<object>();
  let current = error;

  while (typeof current === "object" && current !== null && !visited.has(current)) {
    visited.add(current);
    const candidate = current as { code?: unknown; cause?: unknown };
    if (missingSchemaCodes.has(String(candidate.code))) return true;
    current = candidate.cause;
  }

  return false;
}
