import Papa from "papaparse";

/**
 * CSV parsing for the import wizard (#35, design D1). Unlike `eventsToCsv`
 * (#34's export direction, hand-rolled because it only serializes values the app
 * already controls), parsing here handles untrusted real-world exports — quoted
 * fields with embedded commas/newlines, CRLF/LF, and a possible UTF-8 BOM — so it
 * leans on a small, well-tested library instead.
 */
export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
}

/** Parses an uploaded CSV file into its header row and data rows. */
export async function parseCsv(file: File | Blob): Promise<ParsedCsv> {
  const raw = await file.text();
  // Defensive BOM strip — some exporters prepend a UTF-8 BOM to the file, which
  // would otherwise land inside the first header's value.
  const text = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });
  return {
    headers: result.meta.fields ?? [],
    rows: result.data,
  };
}
