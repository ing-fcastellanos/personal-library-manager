import { describe, it, expect } from "vitest";
import { classifyShelfBook, HIGH_CONFIDENCE } from "./shelf";

describe("classifyShelfBook", () => {
  const ok = { aiConfidence: 0.95, enriched: true, duplicate: false };

  it("auto when confident, matched, and not a duplicate", () => {
    expect(classifyShelfBook(ok)).toEqual({ bucket: "auto", reason: "ok" });
  });

  it("review:low_confidence below the threshold", () => {
    expect(classifyShelfBook({ ...ok, aiConfidence: 0.5 })).toEqual({
      bucket: "review",
      reason: "low_confidence",
    });
  });

  it("review:low_confidence when confidence is null", () => {
    expect(classifyShelfBook({ ...ok, aiConfidence: null }).reason).toBe(
      "low_confidence",
    );
  });

  it("review:no_match when confident but enrichment found nothing", () => {
    expect(classifyShelfBook({ ...ok, enriched: false })).toEqual({
      bucket: "review",
      reason: "no_match",
    });
  });

  it("review:duplicate when confident and matched but already in the library", () => {
    expect(classifyShelfBook({ ...ok, duplicate: true })).toEqual({
      bucket: "review",
      reason: "duplicate",
    });
  });

  it("review:low_confidence when the match does not corroborate the read", () => {
    expect(classifyShelfBook({ ...ok, confirmed: false })).toEqual({
      bucket: "review",
      reason: "low_confidence",
    });
  });

  it("defaults confirmed to true (auto when the flag is absent)", () => {
    expect(classifyShelfBook(ok).bucket).toBe("auto");
  });

  it("checks reasons in order: confidence → match → confirmed → duplicate", () => {
    // Low confidence AND a duplicate → confidence wins (reported first).
    expect(
      classifyShelfBook({ aiConfidence: 0.1, enriched: false, duplicate: true })
        .reason,
    ).toBe("low_confidence");
    // Unconfirmed AND a duplicate → unconfirmed wins (the duplicate was found
    // against an unreliable candidate).
    expect(
      classifyShelfBook({ ...ok, confirmed: false, duplicate: true }).reason,
    ).toBe("low_confidence");
  });

  it("treats exactly the threshold as confident", () => {
    expect(
      classifyShelfBook({ ...ok, aiConfidence: HIGH_CONFIDENCE }).bucket,
    ).toBe("auto");
  });

  it("honors a custom threshold", () => {
    expect(classifyShelfBook({ ...ok, aiConfidence: 0.7 }, 0.6).bucket).toBe(
      "auto",
    );
  });
});
