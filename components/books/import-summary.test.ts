import { describe, it, expect, beforeEach } from "vitest";
import {
  groupOutcomes,
  saveImport,
  loadImport,
  markUndone,
  markRetried,
  IMPORT_KEY,
  type ImportOutcome,
} from "./import-summary";

const sample: ImportOutcome[] = [
  { title: "Dune", result: "added", bookId: "b1", copyId: "c1" },
  { title: "1984", result: "added_as_copy", copyId: "c2" },
  { title: "Old", result: "skipped_duplicate" },
  { title: "Meh", result: "discarded" },
  {
    title: "Oops",
    result: "failed",
    retry: { payload: { book: { title: "Oops" } } },
  },
  { title: "Sapiens", result: "added", bookId: "b3", copyId: "c3" },
];

describe("groupOutcomes", () => {
  it("groups by result in display order, keeping indices, dropping empties", () => {
    const groups = groupOutcomes(sample);
    expect(groups.map((g) => g.result)).toEqual([
      "added",
      "added_as_copy",
      "failed",
      "skipped_duplicate",
      "discarded",
    ]);
    const added = groups.find((g) => g.result === "added")!;
    expect(added.items.map((i) => i.index)).toEqual([0, 5]);
  });

  it("omits groups with no items", () => {
    const groups = groupOutcomes([{ title: "x", result: "added" }]);
    expect(groups.map((g) => g.result)).toEqual(["added"]);
  });
});

describe("sessionStorage persistence", () => {
  beforeEach(() => sessionStorage.clear());

  it("round-trips outcomes", () => {
    saveImport(sample);
    expect(loadImport()).toEqual(sample);
  });

  it("returns null when absent", () => {
    expect(loadImport()).toBeNull();
  });

  it("returns null on corrupt data", () => {
    sessionStorage.setItem(IMPORT_KEY, "{not json");
    expect(loadImport()).toBeNull();
  });
});

describe("markUndone", () => {
  it("turns an item into a discarded outcome without ids", () => {
    const out = markUndone(sample, 0);
    expect(out[0]).toEqual({
      title: "Dune",
      coverUrl: undefined,
      result: "discarded",
    });
    expect(out[5]).toEqual(sample[5]); // others untouched
  });
});

describe("markRetried", () => {
  it("flips a failed item to added with new ids", () => {
    const out = markRetried(sample, 4, { bookId: "bX", copyId: "cX" });
    expect(out[4]).toMatchObject({
      result: "added",
      bookId: "bX",
      copyId: "cX",
    });
  });
});
