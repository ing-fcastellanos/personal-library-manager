import { describe, it, expect, vi } from "vitest";
import sharp from "sharp";
import { uploadCover, CoverValidationError } from "./service";

/**
 * Unit tests for the cover upload service (#15/#50) with an injected Storage
 * stub — no emulator/network. Covers validation, resize/normalization, and
 * the upload path.
 */

function fakeStorage() {
  const save = vi.fn().mockResolvedValue(undefined);
  const file = vi.fn(() => ({ save }));
  const storage = { bucket: () => ({ name: "demo-bucket", file }) };
  return { storage, file, save };
}

/** A real, decodable PNG — `sharp` actually processes it now, fake bytes won't do. */
async function realImage(width = 800, height = 600): Promise<string> {
  const buffer = await sharp({
    create: { width, height, channels: 3, background: { r: 10, g: 20, b: 30 } },
  })
    .png()
    .toBuffer();
  return buffer.toString("base64");
}

describe("uploadCover", () => {
  it("uploads a valid image to covers/<bookId>.webp and returns a tokenized download URL", async () => {
    const { storage, file, save } = fakeStorage();
    const url = await uploadCover("b1", await realImage(), "image/png", {
      storage: storage as never,
    });
    expect(file).toHaveBeenCalledWith("covers/b1.webp");
    expect(save).toHaveBeenCalledOnce();
    expect((save.mock.calls[0][1] as { contentType: string }).contentType).toBe(
      "image/webp",
    );
    // A per-object download token is saved as metadata and echoed in the URL so
    // the cover is readable without opening storage.rules.
    const token = (
      save.mock.calls[0][1] as {
        metadata: { metadata: Record<string, string> };
      }
    ).metadata.metadata.firebaseStorageDownloadTokens;
    expect(token).toMatch(/[0-9a-f-]{36}/);
    expect(url).toBe(
      `https://firebasestorage.googleapis.com/v0/b/demo-bucket/o/covers%2Fb1.webp?alt=media&token=${token}`,
    );
  });

  it("resizes and normalizes the stored image to WebP at 600px max width", async () => {
    const { storage, save } = fakeStorage();
    await uploadCover("b1", await realImage(1200, 800), "image/jpeg", {
      storage: storage as never,
    });
    const stored = save.mock.calls[0][0] as Buffer;
    const meta = await sharp(stored).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.width).toBe(600);
  });

  it("does not upscale an image already narrower than 600px", async () => {
    const { storage, save } = fakeStorage();
    await uploadCover("b1", await realImage(300, 200), "image/png", {
      storage: storage as never,
    });
    const stored = save.mock.calls[0][0] as Buffer;
    const meta = await sharp(stored).metadata();
    expect(meta.width).toBe(300);
  });

  it("rejects an unsupported content type", async () => {
    const { storage } = fakeStorage();
    await expect(
      uploadCover("b1", await realImage(), "application/pdf", {
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

  it("rejects bytes that pass the type/size checks but aren't a decodable image", async () => {
    const { storage } = fakeStorage();
    const notAnImage = Buffer.from("not an image").toString("base64");
    await expect(
      uploadCover("b1", notAnImage, "image/png", { storage: storage as never }),
    ).rejects.toBeInstanceOf(CoverValidationError);
  });
});
