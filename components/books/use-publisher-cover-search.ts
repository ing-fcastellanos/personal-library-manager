"use client";

import * as React from "react";

/**
 * Publisher-scoped cover search (#22). Debounces publisher edits, calls
 * `GET /api/enrich/cover-by-publisher`, and derives the phase the
 * `PublisherCoverSearch` widget renders. Shared by the shelf-capture auto-bucket
 * row and the standalone edit-book form so both surfaces search the same way.
 *
 * A stale in-flight request (superseded by a newer publisher edit before it
 * resolves) is discarded rather than applied — the request token guards that.
 */

const DEBOUNCE_MS = 500;

export type CoverSearchPhase =
  "idle" | "searching" | "multi" | "single" | "none";

export interface CoverOption {
  id: string;
  caption: string;
  coverUrl: string;
}

export interface ResolvedCover {
  coverUrl: string;
  publisher: string;
}

export interface UsePublisherCoverSearchResult {
  publisher: string;
  onPublisherChange: (value: string) => void;
  phase: CoverSearchPhase;
  options: CoverOption[];
  selectedId: string | null;
  singleCaption: string;
  pick: (id: string) => void;
  /** Collapses back to `idle` without discarding the current publisher value. */
  reset: () => void;
}

interface CoverByPublisherResponse {
  candidates: { id: string; coverUrl: string | null; caption: string }[];
}

/**
 * @param initialPublisher starting value of the (possibly wrong) publisher.
 * @param title book title, scoping the search.
 * @param authors book authors, narrowing the search (only the first is used
 *   server-side, per `googleBooksSearchByPublisher`).
 * @param onCoverResolved called with the cover the caller should apply — once
 *   for a single confident match, and again whenever the reader picks a
 *   different option from a multi-result list.
 */
export function usePublisherCoverSearch(
  initialPublisher: string,
  title: string,
  authors: string[],
  onCoverResolved: (cover: ResolvedCover) => void,
): UsePublisherCoverSearchResult {
  const [publisher, setPublisher] = React.useState(initialPublisher);
  const [phase, setPhase] = React.useState<CoverSearchPhase>("idle");
  const [options, setOptions] = React.useState<CoverOption[]>([]);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [singleCaption, setSingleCaption] = React.useState("");

  const requestToken = React.useRef(0);
  const onCoverResolvedRef = React.useRef(onCoverResolved);
  React.useEffect(() => {
    onCoverResolvedRef.current = onCoverResolved;
  });

  const onPublisherChange = React.useCallback((value: string) => {
    setPublisher(value);
    setPhase("searching");
    setSelectedId(null);
  }, []);

  React.useEffect(() => {
    if (phase !== "searching") return;
    const token = ++requestToken.current;
    const timer = setTimeout(() => {
      const qs = new URLSearchParams({ title, publisher });
      authors.forEach((a) => qs.append("authors", a));
      fetch(`/api/enrich/cover-by-publisher?${qs.toString()}`)
        .then((res) =>
          res.ok ? (res.json() as Promise<CoverByPublisherResponse>) : null,
        )
        .then((body) => {
          if (token !== requestToken.current) return; // superseded — discard
          const candidates = (body?.candidates ?? []).filter(
            (c): c is CoverOption => c.coverUrl != null,
          );
          if (candidates.length === 0) {
            setOptions([]);
            setPhase("none");
          } else if (candidates.length === 1) {
            setOptions([]);
            setSingleCaption(candidates[0].caption);
            setPhase("single");
            onCoverResolvedRef.current({
              coverUrl: candidates[0].coverUrl,
              publisher,
            });
          } else {
            setOptions(candidates);
            setPhase("multi");
          }
        })
        .catch(() => {
          if (token !== requestToken.current) return;
          setOptions([]);
          setPhase("none");
        });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `title`/`authors` scope the search but don't retrigger it on their own
  }, [phase, publisher]);

  const pick = React.useCallback(
    (id: string) => {
      setSelectedId(id);
      const option = options.find((o) => o.id === id);
      if (option)
        onCoverResolvedRef.current({ coverUrl: option.coverUrl, publisher });
    },
    [options, publisher],
  );

  const reset = React.useCallback(() => {
    requestToken.current++; // discard any in-flight request
    setPhase("idle");
  }, []);

  return {
    publisher,
    onPublisherChange,
    phase,
    options,
    selectedId,
    singleCaption,
    pick,
    reset,
  };
}
