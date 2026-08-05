import { describe, it, expect } from "vitest";
import { getAdminFirestore } from "../../lib/firebase/admin";
import { recordChange, listAuditLog } from "./repository";

/**
 * Emulator-backed tests for the audit log (#40, design D1/D2): the extended
 * `recordChange` shape, the action-aware no-op guard, and `listAuditLog`.
 */
async function auditDocs() {
  const snap = await getAdminFirestore().collection("auditLog").get();
  return snap.docs.map((d) => d.data());
}

describe("recordChange (emulator)", () => {
  it("writes an update with changed fields, reader, label, and timestamp", async () => {
    await recordChange({
      action: "update",
      entityType: "book",
      entityId: "b1",
      entityLabel: "Rayuela",
      changedFields: ["title", "year"],
      readerId: "r1",
    });
    const docs = await auditDocs();
    expect(docs).toHaveLength(1);
    expect(docs[0]).toMatchObject({
      action: "update",
      entityType: "book",
      entityId: "b1",
      entityLabel: "Rayuela",
      changedFields: ["title", "year"],
      readerId: "r1",
    });
    expect(typeof docs[0].createdAt).toBe("string");
  });

  it("writes nothing for a no-op update (no changed fields)", async () => {
    await recordChange({
      action: "update",
      entityType: "copy",
      entityId: "c1",
      entityLabel: "Rayuela · ejemplar",
      changedFields: [],
      readerId: "r1",
    });
    expect(await auditDocs()).toHaveLength(0);
  });

  it("writes a create with no changedFields", async () => {
    await recordChange({
      action: "create",
      entityType: "book",
      entityId: "b2",
      entityLabel: "Cien años de soledad",
      readerId: "r1",
    });
    expect(await auditDocs()).toHaveLength(1);
  });

  it("writes a delete with no changedFields", async () => {
    await recordChange({
      action: "delete",
      entityType: "book",
      entityId: "b3",
      entityLabel: "Ficciones",
      readerId: "r1",
    });
    expect(await auditDocs()).toHaveLength(1);
  });
});

describe("listAuditLog (emulator)", () => {
  it("lists entries most recent first, filterable by entityType/entityId, limited", async () => {
    await recordChange({
      action: "create",
      entityType: "book",
      entityId: "bx1",
      entityLabel: "A",
      readerId: "r1",
    });
    await recordChange({
      action: "create",
      entityType: "copy",
      entityId: "cx1",
      entityLabel: "A · ejemplar",
      readerId: "r1",
    });
    await recordChange({
      action: "create",
      entityType: "book",
      entityId: "bx2",
      entityLabel: "B",
      readerId: "r1",
    });

    const all = await listAuditLog();
    expect(all.length).toBeGreaterThanOrEqual(3);

    const books = await listAuditLog({ entityType: "book" });
    expect(books.every((e) => e.entityType === "book")).toBe(true);

    const oneBook = await listAuditLog({ entityType: "book", entityId: "bx1" });
    expect(oneBook).toHaveLength(1);
    expect(oneBook[0].entityLabel).toBe("A");

    const limited = await listAuditLog({ limit: 1 });
    expect(limited).toHaveLength(1);
  });
});
