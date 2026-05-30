/**
 * Capitalize a full name (first letter uppercase, rest lowercase per word).
 *
 * Handles:
 *   - Single name: "raki" → "Raki"
 *   - All caps: "MARCO" → "Marco"
 *   - Mixed: "JEan" → "Jean"
 *   - Multi-word: "marco ferreira" → "Marco Ferreira"
 *   - Hyphenated: "jean-pierre" → "Jean-Pierre"
 *   - Apostrophes: "o'brien" → "O'Brien"
 *   - Accents: "éric" → "Éric"
 *   - Extra whitespace: "  jean  luc  " → "Jean Luc"
 *
 * Edge case: roman numerals (e.g. "Jean-Paul II" → "Jean-Paul Ii").
 * Accepted for now since 99% of names are simple first names.
 */
export function capitalizeFullName(name: string | null | undefined): string {
  if (!name) return ''
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/(^|[\s\-'])(\p{L})/gu, (_, sep, char) => sep + char.toUpperCase())
}
