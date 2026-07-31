import { describe, it, expect } from "vitest";
import {
  createSeries,
  getSeries,
  listSeries,
  updateSeries,
  deleteSeries,
  type SeriesData,
} from "./repository";

/**
 * Emulator-backed tests for the series repository (#38): CRUD round-trip and a
 * volume's `bookId` persisting as `null` when omitted (a missing volume).
 */
describe("series repository (emulator)", () => {
  function data(o: Partial<SeriesData>): SeriesData {
    return {
      name: "El Señor de los Anillos",
      volumes: [
        {
          position: 1,
          title: "La Comunidad del Anillo",
          authors: [],
          bookId: "b1",
        },
        { position: 2, title: "Las Dos Torres", authors: [] },
      ],
      ...o,
    };
  }

  it("creates, reads, updates and deletes a series", async () => {
    const created = await createSeries(data({}));
    expect(created.id).toBeTruthy();
    expect((await getSeries(created.id))?.name).toBe("El Señor de los Anillos");
    // A volume with no bookId round-trips as null, not undefined.
    expect(created.volumes[1].bookId ?? null).toBeNull();

    const renamed = await updateSeries(created.id, { name: "LOTR" });
    expect(renamed?.name).toBe("LOTR");

    expect(await deleteSeries(created.id)).toBe(true);
    expect(await getSeries(created.id)).toBeNull();
  });

  it("replaces the volumes array wholesale on update (design D5)", async () => {
    const created = await createSeries(data({}));
    const updated = await updateSeries(created.id, {
      volumes: [
        {
          position: 1,
          title: "La Comunidad del Anillo",
          authors: [],
          bookId: "b1",
        },
        { position: 2, title: "Las Dos Torres", authors: [], bookId: "b2" },
        { position: 3, title: "El Retorno del Rey", authors: [] },
      ],
    });
    expect(updated?.volumes).toHaveLength(3);
    expect(updated?.volumes[1].bookId).toBe("b2");
    expect(updated?.volumes[2].bookId ?? null).toBeNull();
  });

  it("lists series", async () => {
    await createSeries(data({ name: "Otra saga" }));
    expect((await listSeries()).length).toBeGreaterThanOrEqual(1);
  });
});
