import { describe, it, expect } from "vitest";
import {
  listShelves,
  getShelf,
  createShelf,
  updateShelf,
  deleteShelf,
} from "./repository";

/**
 * Emulator-backed CRUD round-trip for the shelves repository (#12). The
 * integration setup clears Firestore before each test.
 */
describe("shelves repository (emulator)", () => {
  it("creates a shelf with server-managed id and timestamps", async () => {
    const shelf = await createShelf({ name: "Estudio", location: "Planta 1" });
    expect(shelf.id).toBeTruthy();
    expect(shelf.name).toBe("Estudio");
    expect(shelf.location).toBe("Planta 1");
    expect(shelf.description).toBeNull();
    expect(shelf.createdAt).toBe(shelf.updatedAt);
  });

  it("gets a shelf by id and returns null for a missing id", async () => {
    const created = await createShelf({ name: "Salón" });
    expect(await getShelf(created.id)).toMatchObject({ id: created.id });
    expect(await getShelf("does-not-exist")).toBeNull();
  });

  it("lists shelves ordered by name", async () => {
    await createShelf({ name: "Zulo" });
    await createShelf({ name: "Altillo" });
    const names = (await listShelves()).map((s) => s.name);
    expect(names).toEqual(["Altillo", "Zulo"]);
  });

  it("updates only provided fields and refreshes updatedAt", async () => {
    const created = await createShelf({ name: "Pasillo", location: "A" });
    const updated = await updateShelf(created.id, { location: "B" });
    expect(updated?.name).toBe("Pasillo");
    expect(updated?.location).toBe("B");
    expect(updated?.createdAt).toBe(created.createdAt);
    expect(updated?.updatedAt).not.toBe(created.updatedAt);
  });

  it("returns null when updating a missing shelf", async () => {
    expect(await updateShelf("nope", { name: "x" })).toBeNull();
  });

  it("deletes a shelf and reports whether it existed", async () => {
    const created = await createShelf({ name: "Trastero" });
    expect(await deleteShelf(created.id)).toBe(true);
    expect(await getShelf(created.id)).toBeNull();
    expect(await deleteShelf(created.id)).toBe(false);
  });
});
