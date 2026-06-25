import { describe, it, expect } from "vitest";
import { mergeShelfCounts } from "./use-shelves";
import type { Shelf } from "@/lib/types/shelf";

const ts = {
  createdAt: "2026-06-01T00:00:00Z",
  updatedAt: "2026-06-01T00:00:00Z",
};
const shelf = (o: Partial<Shelf>): Shelf => ({
  id: "s1",
  name: "Living",
  location: null,
  description: null,
  ...ts,
  ...o,
});

describe("mergeShelfCounts", () => {
  it("attaches facet counts to shelves", () => {
    const out = mergeShelfCounts(
      [shelf({ id: "s1" }), shelf({ id: "s2", name: "Estudio" })],
      [{ value: "s1", count: 3 }],
    );
    expect(out.find((s) => s.id === "s1")?.bookCount).toBe(3);
  });

  it("defaults a shelf with no books to a count of 0", () => {
    const out = mergeShelfCounts([shelf({ id: "s2" })], []);
    expect(out[0].bookCount).toBe(0);
  });
});
