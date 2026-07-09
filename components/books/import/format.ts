/**
 * Format detection + default column mapping for the CSV import wizard (#35,
 * design D2). Only two known export shapes are supported — Goodreads and
 * StoryGraph — detected by a couple of header names unique to each rather than
 * an exact full-header match, so the app tolerates either service adding or
 * dropping unrelated columns over time.
 */

export type ImportFormat = "goodreads" | "storygraph" | "unknown";

export type TargetField =
  "title" | "author" | "isbn" | "rating" | "review" | "dateFinished" | "status";

export const TARGET_FIELDS: {
  field: TargetField;
  label: string;
  required: boolean;
}[] = [
  { field: "title", label: "Título", required: true },
  { field: "author", label: "Autor", required: false },
  { field: "isbn", label: "ISBN", required: false },
  { field: "rating", label: "Calificación", required: false },
  { field: "review", label: "Reseña", required: false },
  { field: "dateFinished", label: "Fecha leído", required: false },
  { field: "status", label: "Estado", required: true },
];

export type ColumnMapping = Record<TargetField, string>;

const BLANK_MAPPING: ColumnMapping = {
  title: "",
  author: "",
  isbn: "",
  rating: "",
  review: "",
  dateFinished: "",
  status: "",
};

const DEFAULT_MAPPINGS: Record<"goodreads" | "storygraph", ColumnMapping> = {
  goodreads: {
    title: "Title",
    author: "Author",
    isbn: "ISBN13",
    rating: "My Rating",
    review: "My Review",
    dateFinished: "Date Read",
    status: "Exclusive Shelf",
  },
  storygraph: {
    title: "Title",
    author: "Authors",
    isbn: "ISBN/UID",
    rating: "Star Rating",
    review: "Review",
    dateFinished: "Last Date Read",
    status: "Read Status",
  },
};

/**
 * Both known formats use the literal value "read" for a finished status
 * (Goodreads' `Exclusive Shelf`, StoryGraph's `Read Status`) — so the finished
 * check is a single case-insensitive literal, not format-specific. This also
 * lets an unrecognized-format file still import correctly once the reader
 * manually maps a status column, as long as its "finished" value is "read".
 */
const FINISHED_STATUS_VALUE = "read";

/**
 * Detects the export format from its header row, by a marker header unique to
 * each service rather than requiring an exact full-header match.
 */
export function detectFormat(headers: string[]): ImportFormat {
  if (headers.includes("Exclusive Shelf")) return "goodreads";
  if (headers.includes("Read Status")) return "storygraph";
  return "unknown";
}

/** The default target-field → source-header mapping for a detected format. */
export function defaultMapping(format: ImportFormat): ColumnMapping {
  if (format === "unknown") return { ...BLANK_MAPPING };
  return { ...DEFAULT_MAPPINGS[format] };
}

/** Whether a mapped status column's raw value means "finished". */
export function isFinishedStatus(rawStatus: string): boolean {
  return rawStatus.trim().toLowerCase() === FINISHED_STATUS_VALUE;
}
