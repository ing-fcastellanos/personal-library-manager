import { describe, it, expect } from "vitest";
import { scanUrl } from "./scan-url";

/** Unit tests for the /scan URL builder (#31, extended for shelves in #33). */

describe("scanUrl", () => {
  it("builds an absolute action URL with no shelf", () => {
    expect(scanUrl("add", "https://mibiblioteca.app")).toBe(
      "https://mibiblioteca.app/scan?action=add",
    );
  });

  it("appends the shelf id when given", () => {
    expect(scanUrl("add", "https://mibiblioteca.app", "shelf-1")).toBe(
      "https://mibiblioteca.app/scan?action=add&shelf=shelf-1",
    );
  });

  it("URL-encodes special characters in the shelf id", () => {
    expect(scanUrl("add", "https://mibiblioteca.app", "sala de estar")).toBe(
      "https://mibiblioteca.app/scan?action=add&shelf=sala%20de%20estar",
    );
  });
});
