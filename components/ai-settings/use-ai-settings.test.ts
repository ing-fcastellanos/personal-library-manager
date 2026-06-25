import { describe, it, expect } from "vitest";
import { statusMeta } from "./use-ai-settings";

describe("statusMeta", () => {
  it("maps connected to a secondary badge", () => {
    expect(statusMeta("connected")).toEqual({
      label: "Conectado",
      variant: "secondary",
    });
  });

  it("maps not_configured to an outline badge", () => {
    expect(statusMeta("not_configured").variant).toBe("outline");
  });

  it("maps error to a soft-destructive outline badge", () => {
    const meta = statusMeta("error");
    expect(meta.variant).toBe("outline");
    expect(meta.className).toContain("destructive");
  });

  it("maps testing to a transient outline badge", () => {
    expect(statusMeta("testing").label).toBe("Probando…");
  });
});
