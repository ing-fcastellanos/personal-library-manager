import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePublisherCoverSearch } from "./use-publisher-cover-search";

/**
 * Unit tests for the shared publisher-cover-search hook (#22): debounce timing,
 * the phase state machine for 0/1/many results, a stale response being
 * discarded, and `pick()` resolving a cover.
 */

function jsonResponse(body: unknown, ok = true) {
  return Promise.resolve({
    ok,
    json: () => Promise.resolve(body),
  } as Response);
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("usePublisherCoverSearch", () => {
  it("debounces publisher edits before searching", async () => {
    const fetchMock = vi.fn(() => jsonResponse({ candidates: [] }));
    global.fetch = fetchMock as unknown as typeof fetch;
    const onResolved = vi.fn();
    const { result } = renderHook(() =>
      usePublisherCoverSearch(
        "Sudamericana",
        "Rayuela",
        ["Julio Cortázar"],
        onResolved,
      ),
    );

    act(() => result.current.onPublisherChange("Debolsillo"));
    expect(fetchMock).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(499);
    });
    expect(fetchMock).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = String((fetchMock.mock.calls[0] as unknown[])[0]);
    expect(url).toContain("/api/enrich/cover-by-publisher");
    expect(url).toContain("publisher=Debolsillo");
    expect(url).toContain("title=Rayuela");
  });

  it("goes to phase none and reports no options when nothing matches", async () => {
    global.fetch = vi.fn(() =>
      jsonResponse({ candidates: [] }),
    ) as unknown as typeof fetch;
    const { result } = renderHook(() =>
      usePublisherCoverSearch("", "Un libro rarísimo", [], vi.fn()),
    );
    act(() => result.current.onPublisherChange("Editorial inexistente"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(result.current.phase).toBe("none");
    expect(result.current.options).toEqual([]);
  });

  it("auto-applies a single confident match", async () => {
    global.fetch = vi.fn(() =>
      jsonResponse({
        candidates: [
          {
            id: "1",
            coverUrl: "https://covers.example/a.jpg",
            caption: "2019 · Debolsillo",
          },
        ],
      }),
    ) as unknown as typeof fetch;
    const onResolved = vi.fn();
    const { result } = renderHook(() =>
      usePublisherCoverSearch(
        "Sudamericana",
        "Rayuela",
        ["Julio Cortázar"],
        onResolved,
      ),
    );
    act(() => result.current.onPublisherChange("Debolsillo"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(result.current.phase).toBe("single");
    expect(result.current.singleCaption).toBe("2019 · Debolsillo");
    expect(onResolved).toHaveBeenCalledWith({
      coverUrl: "https://covers.example/a.jpg",
      publisher: "Debolsillo",
    });
  });

  it("offers multiple matches without auto-applying any of them", async () => {
    global.fetch = vi.fn(() =>
      jsonResponse({
        candidates: [
          {
            id: "1",
            coverUrl: "https://covers.example/a.jpg",
            caption: "2019 · Debolsillo",
          },
          {
            id: "2",
            coverUrl: "https://covers.example/b.jpg",
            caption: "2013 · Alfaguara",
          },
        ],
      }),
    ) as unknown as typeof fetch;
    const onResolved = vi.fn();
    const { result } = renderHook(() =>
      usePublisherCoverSearch("", "Rayuela", ["Julio Cortázar"], onResolved),
    );
    act(() => result.current.onPublisherChange("Debolsillo"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(result.current.phase).toBe("multi");
    expect(result.current.options).toHaveLength(2);
    expect(onResolved).not.toHaveBeenCalled();

    act(() => result.current.pick("2"));
    expect(result.current.selectedId).toBe("2");
    expect(onResolved).toHaveBeenCalledWith({
      coverUrl: "https://covers.example/b.jpg",
      publisher: "Debolsillo",
    });
  });

  it("discards a stale response superseded by a newer request", async () => {
    let resolveFirst!: (v: unknown) => void;
    const firstPromise = new Promise((resolve) => (resolveFirst = resolve));
    const fetchMock = vi
      .fn()
      // First call: hangs until we resolve it manually (simulates a slow response).
      .mockImplementationOnce(() => firstPromise as Promise<Response>)
      // Second call: resolves immediately with a real result.
      .mockImplementationOnce(() =>
        jsonResponse({
          candidates: [
            {
              id: "2",
              coverUrl: "https://covers.example/b.jpg",
              caption: "2013 · Alfaguara",
            },
          ],
        }),
      );
    global.fetch = fetchMock as unknown as typeof fetch;
    const onResolved = vi.fn();
    const { result } = renderHook(() =>
      usePublisherCoverSearch("", "Rayuela", ["Julio Cortázar"], onResolved),
    );

    // First edit fires the first (slow) request.
    act(() => result.current.onPublisherChange("Sudamericana"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    // A second edit before the first resolves fires the second (fast) request.
    act(() => result.current.onPublisherChange("Debolsillo"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(result.current.phase).toBe("single");

    // The stale first request finally resolves — it must NOT override the
    // already-applied second result.
    await act(async () => {
      resolveFirst(
        await jsonResponse({
          candidates: [
            {
              id: "1",
              coverUrl: "https://covers.example/a.jpg",
              caption: "stale",
            },
          ],
        }),
      );
    });
    expect(result.current.singleCaption).not.toBe("stale");
    expect(onResolved).toHaveBeenCalledTimes(1);
  });

  it("reset() returns to idle without clearing the publisher value", async () => {
    global.fetch = vi.fn(() =>
      jsonResponse({ candidates: [] }),
    ) as unknown as typeof fetch;
    const { result } = renderHook(() =>
      usePublisherCoverSearch("Sudamericana", "Rayuela", [], vi.fn()),
    );
    act(() => result.current.onPublisherChange("Debolsillo"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    act(() => result.current.reset());
    expect(result.current.phase).toBe("idle");
    expect(result.current.publisher).toBe("Debolsillo");
  });
});
