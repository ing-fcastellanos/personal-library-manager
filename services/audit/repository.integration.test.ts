import { describe, it, expect } from "vitest";
import { getAdminFirestore } from "../../lib/firebase/admin";
import { recordChange } from "./repository";

/**
 * Emulator-backed tests for the minimal change log (#15, design D7).
 */
async function auditDocs() {
  const snap = await getAdminFirestore().collection("auditLog").get();
  return snap.docs.map((d) => d.data());
}

describe("recordChange (emulator)", () => {
  it("writes an audit record with changed fields, reader, and timestamp", async () => {
    await recordChange({
      entity: "book",
      entityId: "b1",
      changedFields: ["title", "year"],
      readerId: "r1",
    });
    const docs = await auditDocs();
    expect(docs).toHaveLength(1);
    expect(docs[0]).toMatchObject({
      entity: "book",
      entityId: "b1",
      changedFields: ["title", "year"],
      readerId: "r1",
    });
    expect(typeof docs[0].at).toBe("string");
  });

  it("writes nothing for a no-op (no changed fields)", async () => {
    await recordChange({
      entity: "copy",
      entityId: "c1",
      changedFields: [],
      readerId: "r1",
    });
    expect(await auditDocs()).toHaveLength(0);
  });
});
