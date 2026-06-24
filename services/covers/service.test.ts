import { describe, it, expect, vi } from "vitest";
import { uploadCover, CoverValidationError } from "./service";

/**
 * Unit tests for the cover upload service (#15) with an injected Storage stub —
 * no emulator/network. Covers validation and the upload path.
 */

function fakeStorage() {
  const save = vi.fn().mockResolvedValue(undefined);
  const file = vi.fn(() => ({ save }));
  const storage = { bucket: () => ({ name: "demo-bucket", file }) };
  return { storage, file, save };
}

const PNG_BASE64 = Buffer.from("fake-png-bytes").toString("base64");

describe("uploadCover", () => {
  it("uploads a valid image to covers/<bookId> and returns the internal URL", async () => {
    const { storage, file, save } = fakeStorage();
    const url = await uploadCover("b1", PNG_BASE64, "image/png", {
      storage: storage as never,
    });
    expect(file).toHaveBeenCalledWith("covers/b1.png");
    expect(save).toHaveBeenCalledOnce();
    expect(url).toBe(
      "https://storage.googleapis.com/demo-bucket/covers/b1.png",
    );
  });

  it("rejects an unsupported content type", async () => {
    const { storage } = fakeStorage();
    await expect(
      uploadCover("b1", PNG_BASE64, "application/pdf", {
        storage: storage as never,
      }),
    ).rejects.toBeInstanceOf(CoverValidationError);
  });

  it("rejects an image larger than 5 MB", async () => {
    const { storage } = fakeStorage();
    const big = Buffer.alloc(5 * 1024 * 1024 + 1).toString("base64");
    await expect(
      uploadCover("b1", big, "image/jpeg", { storage: storage as never }),
    ).rejects.toBeInstanceOf(CoverValidationError);
  });
});
