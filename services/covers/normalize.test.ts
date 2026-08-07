import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { normalizeCoverImage } from "./normalize";

/** A real, synthetic image at the given size — sharp can't decode fake bytes. */
function makeImage(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 200, g: 100, b: 50 },
    },
  })
    .png()
    .toBuffer();
}

describe("normalizeCoverImage", () => {
  it("resizes a wide image down to 600px and re-encodes as WebP", async () => {
    const input = await makeImage(1200, 800);
    const output = await normalizeCoverImage(input);
    const meta = await sharp(output).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.width).toBe(600);
    // Aspect ratio preserved (1200x800 = 3:2).
    expect(meta.height).toBe(400);
  });

  it("does not upscale an image already narrower than 600px", async () => {
    const input = await makeImage(300, 200);
    const output = await normalizeCoverImage(input);
    const meta = await sharp(output).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.width).toBe(300);
    expect(meta.height).toBe(200);
  });

  it("re-encodes an already-WebP image to WebP (no-op format-wise)", async () => {
    const input = await sharp({
      create: {
        width: 400,
        height: 400,
        channels: 3,
        background: { r: 0, g: 0, b: 0 },
      },
    })
      .webp()
      .toBuffer();
    const output = await normalizeCoverImage(input);
    const meta = await sharp(output).metadata();
    expect(meta.format).toBe("webp");
  });

  it("rejects a buffer that isn't a decodable image", async () => {
    await expect(
      normalizeCoverImage(Buffer.from("not an image")),
    ).rejects.toThrow();
  });
});
