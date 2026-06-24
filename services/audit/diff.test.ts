import { describe, it, expect } from "vitest";
import { changedFields } from "./diff";

describe("changedFields", () => {
  it("lists only the fields whose value changed", () => {
    const existing = { title: "Old", year: 2007, authors: ["A"] };
    const input = { title: "New", year: 2007 };
    expect(changedFields(existing, input)).toEqual(["title"]);
  });

  it("ignores undefined input fields (partial update)", () => {
    const existing = { title: "T", notes: "n" };
    const input = { title: "T", notes: undefined };
    expect(changedFields(existing, input)).toEqual([]);
  });

  it("diffs arrays structurally", () => {
    const existing = { authors: ["A"] };
    const input = { authors: ["A", "B"] };
    expect(changedFields(existing, input)).toEqual(["authors"]);
  });

  it("treats null and missing as equal", () => {
    const existing = { coverUrl: null };
    const input = { coverUrl: null };
    expect(changedFields(existing, input)).toEqual([]);
  });
});
