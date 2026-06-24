import { arraySlugs } from "../../lib/text/slug";
import type { Candidate } from "./types";

/**
 * Source merge with Google Books priority (design D2). Google Books is primary;
 * Open Library complements it: it fills empty fields, its authors are unioned in
 * (de-duplicated by `authorKey`), and the higher-resolution cover wins. Open
 * Library `subjects` are never used as categories (D3), so categories come from
 * the primary only. Pure and deterministic — unit-tested in the fast lane.
 */
export function mergeCandidates(
  primary: Candidate | null,
  secondary: Candidate | null,
): Candidate | null {
  if (!primary) return secondary;
  if (!secondary) return primary;

  // Union authors, primary first, de-duplicated by author slug.
  const authors = [...primary.authors];
  const seen = new Set(primary.authorKeys);
  secondary.authors.forEach((name, i) => {
    const key = secondary.authorKeys[i];
    if (key && !seen.has(key)) {
      seen.add(key);
      authors.push(name);
    }
  });

  // Pick the higher-resolution cover; ties favor the primary source.
  const useSecondaryCover =
    !primary.coverUrl ||
    (secondary.coverUrl != null &&
      (secondary.coverWidth ?? 0) > (primary.coverWidth ?? 0));
  const coverUrl = useSecondaryCover ? secondary.coverUrl : primary.coverUrl;
  const coverWidth = useSecondaryCover
    ? secondary.coverWidth
    : primary.coverWidth;

  return {
    title: primary.title || secondary.title,
    subtitle: primary.subtitle ?? secondary.subtitle,
    authors,
    authorKeys: arraySlugs(authors),
    publisher: primary.publisher ?? secondary.publisher,
    publishedYear: primary.publishedYear ?? secondary.publishedYear,
    isbn13: primary.isbn13 ?? secondary.isbn13,
    isbn10: primary.isbn10 ?? secondary.isbn10,
    // Categories come from the primary (Google Books / BISAC) only (D3).
    categories: primary.categories,
    categoryKeys: primary.categoryKeys,
    coverUrl,
    coverWidth,
    pageCount: primary.pageCount ?? secondary.pageCount,
    language: primary.language ?? secondary.language,
    description: primary.description ?? secondary.description,
    titleKey: primary.titleKey || secondary.titleKey,
    source: primary.source,
  };
}
