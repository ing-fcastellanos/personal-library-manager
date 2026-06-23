import type { Copy, CopyCreateInput } from "../../lib/types/copy";
import { getBook } from "../books/repository";
import { getShelf } from "../shelves/repository";
import { createCopy as insertCopy } from "./repository";

/**
 * Thrown when a copy references a parent (`bookId`/`shelfId`) that does not exist
 * (#12 D3). Routes map this to a 400.
 */
export class ReferenceNotFoundError extends Error {
  constructor(public readonly field: "bookId" | "shelfId") {
    super(`referenced ${field} does not exist`);
    this.name = "ReferenceNotFoundError";
  }
}

/**
 * Creates a copy after validating that its referenced `bookId` (required) and
 * `shelfId` (optional) exist. The book reference is mandatory; an absent `shelfId`
 * is valid (an unshelved copy).
 */
export async function createCopy(input: CopyCreateInput): Promise<Copy> {
  if (!(await getBook(input.bookId))) {
    throw new ReferenceNotFoundError("bookId");
  }
  if (input.shelfId && !(await getShelf(input.shelfId))) {
    throw new ReferenceNotFoundError("shelfId");
  }
  return insertCopy(input);
}
