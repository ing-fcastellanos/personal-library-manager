import { describe, it, expect } from "vitest";
import {
  nextPosition,
  reconcileVolumes,
  removeVolume,
  moveVolume,
  parseAuthors,
} from "./link";
import type { SeriesVolume } from "@/lib/types/series";

function vol(o: Partial<SeriesVolume>): SeriesVolume {
  return { position: 1, title: "x", authors: [], bookId: null, ...o };
}

describe("nextPosition", () => {
  it("is one past the highest existing position", () => {
    expect(nextPosition([vol({ position: 1 }), vol({ position: 3 })])).toBe(4);
  });
  it("is 1 for an empty list", () => {
    expect(nextPosition([])).toBe(1);
  });
});

describe("reconcileVolumes", () => {
  it("fills an existing placeholder at that position instead of duplicating", () => {
    const volumes = [vol({ position: 1, bookId: "b1" }), vol({ position: 2 })];
    const next = reconcileVolumes(volumes, 2, {
      title: "Las Dos Torres",
      authors: ["Tolkien"],
      bookId: "b2",
    });
    expect(next).toHaveLength(2);
    expect(next[1].bookId).toBe("b2");
    expect(next[1].title).toBe("Las Dos Torres");
  });

  it("inserts a new volume when no position match exists, keeping sort order", () => {
    const volumes = [vol({ position: 1 })];
    const next = reconcileVolumes(volumes, 3, {
      title: "El Retorno del Rey",
      authors: [],
      bookId: "b3",
    });
    expect(next.map((v) => v.position)).toEqual([1, 3]);
  });
});

describe("removeVolume", () => {
  it("removes the volume at that position", () => {
    const volumes = [vol({ position: 1 }), vol({ position: 2 })];
    expect(removeVolume(volumes, 1).map((v) => v.position)).toEqual([2]);
  });
});

describe("moveVolume", () => {
  it("swaps position with the previous volume when moving up", () => {
    const volumes = [
      vol({ position: 1, title: "A" }),
      vol({ position: 2, title: "B" }),
    ];
    const next = moveVolume(volumes, 2, "up");
    expect(next.map((v) => v.title)).toEqual(["B", "A"]);
  });

  it("is a no-op moving the first volume up", () => {
    const volumes = [vol({ position: 1 }), vol({ position: 2 })];
    expect(moveVolume(volumes, 1, "up").map((v) => v.position)).toEqual([1, 2]);
  });

  it("is a no-op moving the last volume down", () => {
    const volumes = [vol({ position: 1 }), vol({ position: 2 })];
    expect(moveVolume(volumes, 2, "down").map((v) => v.position)).toEqual([
      1, 2,
    ]);
  });
});

describe("parseAuthors", () => {
  it("splits, trims, and drops empties", () => {
    expect(parseAuthors("J.R.R. Tolkien,  , Otro Autor ")).toEqual([
      "J.R.R. Tolkien",
      "Otro Autor",
    ]);
  });
});
