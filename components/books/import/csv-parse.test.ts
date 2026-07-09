import { describe, it, expect } from "vitest";
import { parseCsv } from "./csv-parse";

function csvFile(content: string): File {
  return new File([content], "export.csv", { type: "text/csv" });
}

describe("parseCsv", () => {
  it("parses headers and rows", async () => {
    const csv = "Title,Author\nRayuela,Julio Cortázar\n";
    const parsed = await parseCsv(csvFile(csv));
    expect(parsed.headers).toEqual(["Title", "Author"]);
    expect(parsed.rows).toEqual([
      { Title: "Rayuela", Author: "Julio Cortázar" },
    ]);
  });

  it("parses a quoted field containing a comma", async () => {
    const csv = 'Title,Review\nFicciones,"Great, but dense"\n';
    const parsed = await parseCsv(csvFile(csv));
    expect(parsed.rows[0].Review).toBe("Great, but dense");
  });

  it("parses a quoted field containing an embedded newline", async () => {
    const csv = 'Title,Review\nFicciones,"Line one\nLine two"\n';
    const parsed = await parseCsv(csvFile(csv));
    expect(parsed.rows[0].Review).toBe("Line one\nLine two");
  });

  it("parses a quoted field with an escaped double quote", async () => {
    const csv = 'Title,Review\nFicciones,"She said ""wow"""\n';
    const parsed = await parseCsv(csvFile(csv));
    expect(parsed.rows[0].Review).toBe('She said "wow"');
  });

  it("handles CRLF line endings", async () => {
    const csv = "Title,Author\r\nRayuela,Julio Cortázar\r\n";
    const parsed = await parseCsv(csvFile(csv));
    expect(parsed.rows).toEqual([
      { Title: "Rayuela", Author: "Julio Cortázar" },
    ]);
  });

  it("strips a leading UTF-8 BOM from the first header", async () => {
    const csv = "﻿Title,Author\nRayuela,Julio Cortázar\n";
    const parsed = await parseCsv(csvFile(csv));
    expect(parsed.headers[0]).toBe("Title");
  });
});
