import { describe, it, expect } from "vitest";
import { detectFormat, defaultMapping, isFinishedStatus } from "./format";

const GOODREADS_HEADERS = [
  "Book Id",
  "Title",
  "Author",
  "Author l-f",
  "Additional Authors",
  "ISBN",
  "ISBN13",
  "My Rating",
  "Average Rating",
  "Publisher",
  "Binding",
  "Number of Pages",
  "Year Published",
  "Original Publication Year",
  "Date Read",
  "Date Added",
  "Bookshelves",
  "Bookshelves with positions",
  "Exclusive Shelf",
  "My Review",
  "Spoiler",
  "Private Notes",
  "Read Count",
  "Owned Copies",
];

const STORYGRAPH_HEADERS = [
  "Title",
  "Authors",
  "Contributors",
  "ISBN/UID",
  "Format",
  "Read Status",
  "Date Added",
  "Last Date Read",
  "Dates Read",
  "Read Count",
  "Moods",
  "Pace",
  "Star Rating",
  "Review",
  "Content Warnings",
  "Content Warning Description",
  "Tags",
  "Owned?",
];

describe("detectFormat", () => {
  it("detects a Goodreads header row", () => {
    expect(detectFormat(GOODREADS_HEADERS)).toBe("goodreads");
  });

  it("detects a StoryGraph header row", () => {
    expect(detectFormat(STORYGRAPH_HEADERS)).toBe("storygraph");
  });

  it("returns unknown for neither", () => {
    expect(detectFormat(["Title", "Author"])).toBe("unknown");
  });
});

describe("defaultMapping", () => {
  it("maps Goodreads columns to target fields", () => {
    expect(defaultMapping("goodreads")).toEqual({
      title: "Title",
      author: "Author",
      isbn: "ISBN13",
      rating: "My Rating",
      review: "My Review",
      dateFinished: "Date Read",
      status: "Exclusive Shelf",
    });
  });

  it("maps StoryGraph columns to target fields", () => {
    expect(defaultMapping("storygraph")).toEqual({
      title: "Title",
      author: "Authors",
      isbn: "ISBN/UID",
      rating: "Star Rating",
      review: "Review",
      dateFinished: "Last Date Read",
      status: "Read Status",
    });
  });

  it("leaves every field blank for an unknown format", () => {
    expect(defaultMapping("unknown")).toEqual({
      title: "",
      author: "",
      isbn: "",
      rating: "",
      review: "",
      dateFinished: "",
      status: "",
    });
  });
});

describe("isFinishedStatus", () => {
  it("matches 'read' case-insensitively", () => {
    expect(isFinishedStatus("read")).toBe(true);
    expect(isFinishedStatus("Read")).toBe(true);
    expect(isFinishedStatus(" read ")).toBe(true);
  });

  it("rejects to-read, currently-reading, and did-not-finish", () => {
    expect(isFinishedStatus("to-read")).toBe(false);
    expect(isFinishedStatus("currently-reading")).toBe(false);
    expect(isFinishedStatus("did-not-finish")).toBe(false);
  });
});
