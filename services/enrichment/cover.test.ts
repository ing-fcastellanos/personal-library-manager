import { describe, it, expect, vi } from "vitest";
import sharp from "sharp";
import { rehostCover } from "./cover";

/**
 * Unit tests for cover re-hosting (#13/#50) with injected `fetch`/Storage —
 * no real network or emulator.
 */

function fakeStorage() {
  const save = vi.fn().mockResolvedValue(undefined);
  const file = vi.fn(() => ({ save }));
  const storage = { bucket: () => ({ name: "demo-bucket", file }) };
  return { storage, file, save };
}

async function realImageResponse(width = 800, height = 600): Promise<Response> {
  const buffer = await sharp({
    create: { width, height, channels: 3, background: { r: 5, g: 5, b: 5 } },
  })
    .jpeg()
    .toBuffer();
  return new Response(buffer, {
    status: 200,
    headers: { "content-type": "image/jpeg" },
  });
}

describe("rehostCover", () => {
  it("downloads, resizes, normalizes to WebP, and uploads to covers/<isbn13>.webp", async () => {
    const { storage, file, save } = fakeStorage();
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(await realImageResponse(1200, 900));

    const url = await rehostCover(
      "https://example.com/cover.jpg",
      "9781234567897",
      {
        fetchImpl,
        storage: storage as never,
      },
    );

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://example.com/cover.jpg",
      expect.objectContaining({ signal: expect.anything() }),
    );
    expect(file).toHaveBeenCalledWith("covers/9781234567897.webp");
    const [stored, opts] = save.mock.calls[0] as [
      Buffer,
      { contentType: string },
    ];
    expect(opts.contentType).toBe("image/webp");
    const meta = await sharp(stored).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.width).toBe(600);
    expect(url).toMatch(/^https:\/\/firebasestorage\.googleapis\.com/);
  });

  it("does not upscale a source image already narrower than 600px", async () => {
    const { storage, save } = fakeStorage();
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(await realImageResponse(250, 250));

    await rehostCover("https://example.com/cover.jpg", "9781234567897", {
      fetchImpl,
      storage: storage as never,
    });

    const stored = save.mock.calls[0][0] as Buffer;
    const meta = await sharp(stored).metadata();
    expect(meta.width).toBe(250);
  });

  it("returns null without a URL", async () => {
    const { storage } = fakeStorage();
    const url = await rehostCover(null, "9781234567897", {
      storage: storage as never,
    });
    expect(url).toBeNull();
  });

  it("returns null when the download fails", async () => {
    const { storage } = fakeStorage();
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 404 }));
    const url = await rehostCover(
      "https://example.com/missing.jpg",
      "9781234567897",
      {
        fetchImpl,
        storage: storage as never,
      },
    );
    expect(url).toBeNull();
  });

  it("returns null when the downloaded bytes aren't a decodable image", async () => {
    const { storage, save } = fakeStorage();
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(Buffer.from("not an image"), {
        status: 200,
        headers: { "content-type": "image/jpeg" },
      }),
    );
    const url = await rehostCover(
      "https://example.com/bad.jpg",
      "9781234567897",
      {
        fetchImpl,
        storage: storage as never,
      },
    );
    expect(url).toBeNull();
    expect(save).not.toHaveBeenCalled();
  });
});
