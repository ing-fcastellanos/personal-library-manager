import { describe, it, expect } from "vitest";
import { seriesSchema, seriesCreateSchema } from "./series";
import { bookSchema } from "./book";

const base = {
  id: "s1",
  name: "El Señor de los Anillos",
  volumes: [
    { position: 1, title: "La Comunidad del Anillo", bookId: "b1" },
    { position: 2, title: "Las Dos Torres", bookId: null },
  ],
  createdAt: "2026-07-29T00:00:00.000Z",
  updatedAt: "2026-07-29T00:00:00.000Z",
};

describe("seriesSchema", () => {
  it("accepts a valid series with a missing volume", () => {
    const parsed = seriesSchema.parse(base);
    expect(parsed.volumes).toHaveLength(2);
    expect(parsed.volumes[1].bookId ?? null).toBeNull();
    expect(parsed.volumes[0].authors).toEqual([]);
  });

  it("accepts a volume with no bookId as a valid (missing) volume", () => {
    const parsed = seriesSchema.parse({
      ...base,
      volumes: [{ position: 1, title: "El Retorno del Rey" }],
    });
    expect(parsed.volumes[0].bookId ?? null).toBeNull();
  });

  it("rejects a series with no name", () => {
    expect(() => seriesSchema.parse({ ...base, name: "" })).toThrow();
  });
});

describe("seriesCreateSchema", () => {
  it("requires at least one volume", () => {
    expect(() =>
      seriesCreateSchema.parse({ name: "Serie vacía", volumes: [] }),
    ).toThrow();
  });

  it("accepts a create with one volume", () => {
    const parsed = seriesCreateSchema.parse({
      name: base.name,
      volumes: base.volumes,
    });
    expect(parsed.volumes).toHaveLength(2);
  });
});

describe("book schema is untouched by series (design D1)", () => {
  it("has no seriesId or workKey-as-series field", () => {
    const parsed = bookSchema.parse({
      id: "b1",
      title: "La Comunidad del Anillo",
      createdAt: "2026-07-29T00:00:00.000Z",
      updatedAt: "2026-07-29T00:00:00.000Z",
    });
    expect(parsed).not.toHaveProperty("seriesId");
  });
});
