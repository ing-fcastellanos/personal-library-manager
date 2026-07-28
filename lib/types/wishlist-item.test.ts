import { describe, it, expect } from "vitest";
import { wishlistItemSchema } from "./wishlist-item";

const base = {
  id: "w1",
  readerId: "r1",
  addedVia: "manual" as const,
  bookTitle: "Rayuela",
  createdAt: "2026-07-27T00:00:00.000Z",
  updatedAt: "2026-07-27T00:00:00.000Z",
};

describe("wishlistItemSchema", () => {
  it("accepts a valid item", () => {
    const parsed = wishlistItemSchema.parse(base);
    expect(parsed.readerId).toBe("r1");
    expect(parsed.status).toBe("wanted");
  });

  it("rejects an empty readerId", () => {
    expect(() => wishlistItemSchema.parse({ ...base, readerId: "" })).toThrow();
  });

  it("accepts an item with no bookId (a wish for an uncatalogued book)", () => {
    const parsed = wishlistItemSchema.parse(base);
    expect(parsed.bookId ?? null).toBeNull();
  });

  it("defaults priority to normal", () => {
    const parsed = wishlistItemSchema.parse(base);
    expect(parsed.priority).toBe("normal");
  });

  it("has no stored acquired/read flag — ownership and read status are derived", () => {
    const parsed = wishlistItemSchema.parse({
      ...base,
      acquired: true,
      read: true,
    });
    expect(parsed).not.toHaveProperty("acquired");
    expect(parsed).not.toHaveProperty("read");
  });
});
