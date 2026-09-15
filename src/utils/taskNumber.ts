/**
 * Normalizes human-entered task references to the stored TASK-001 format.
 * Accepts shorthand and common copy/paste variants without accepting extra
 * words that could make an edit target ambiguous.
 */
export function normalizeTaskNumber(raw: string): string | null {
  const normalized = raw
    .normalize("NFKC")
    .trim()
    .toUpperCase()
    .replace(/[‐‑‒–—−]/g, "-");

  const match = normalized.match(/^(?:TASK[\s#-]*)?(\d+)$/);
  if (!match) return null;

  const digits = match[1].replace(/^0+(?=\d)/, "");
  return `TASK-${digits.padStart(3, "0")}`;
}
