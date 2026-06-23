/**
 * Pure text-normalization helpers (catalog-repositories #12, design D2).
 *
 * Produces stable, deterministic slugs for the catalog's derived key fields
 * (`authorKeys`, `categoryKeys`, `titleKey`) so filtering, grouping and prefix
 * search operate on normalized values rather than raw display strings. This is a
 * deliberately simple normalization — richer rules (transliteration, stop-word
 * handling, etc.) live in metadata enrichment (#13) and can replace the algorithm
 * here without touching callers.
 */

/**
 * Normalizes a string to a slug: lowercased, diacritics stripped, and reduced to
 * a hyphen-separated form of its alphanumeric runs. Returns an empty string when
 * the input has no slug-worthy characters.
 */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip combining diacritical marks
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // non-alphanumeric runs become a single hyphen
    .replace(/^-+|-+$/g, ""); // trim leading/trailing hyphens
}

/**
 * Slugifies each value, drops empties, and de-duplicates while preserving order.
 * Used to derive `authorKeys`/`categoryKeys` from their display-string arrays.
 */
export function arraySlugs(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const slug = slugify(value);
    if (slug && !seen.has(slug)) {
      seen.add(slug);
      out.push(slug);
    }
  }
  return out;
}
