import { describe, it, expect } from "vitest";
import { auditLogEntrySchema } from "./audit-log";

const base = {
  id: "a1",
  readerId: "r1",
  action: "update" as const,
  entityType: "book" as const,
  entityId: "b1",
  entityLabel: "Rayuela",
  createdAt: "2026-07-29T00:00:00.000Z",
};

describe("auditLogEntrySchema", () => {
  it("accepts a valid update entry with changed fields", () => {
    const parsed = auditLogEntrySchema.parse({
      ...base,
      changedFields: ["title", "year"],
    });
    expect(parsed.changedFields).toEqual(["title", "year"]);
  });

  it("accepts create/delete entries with no changedFields", () => {
    const created = auditLogEntrySchema.parse({ ...base, action: "create" });
    expect(created.changedFields ?? null).toBeNull();
    const deleted = auditLogEntrySchema.parse({ ...base, action: "delete" });
    expect(deleted.changedFields ?? null).toBeNull();
  });

  it("rejects a missing entityLabel", () => {
    expect(() =>
      auditLogEntrySchema.parse({ ...base, entityLabel: "" }),
    ).toThrow();
  });

  it("rejects an unknown entityType", () => {
    expect(() =>
      auditLogEntrySchema.parse({ ...base, entityType: "loan" }),
    ).toThrow();
  });
});
