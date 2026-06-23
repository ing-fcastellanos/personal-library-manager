import { z } from "zod";

/**
 * Reader domain entity (ADR-0007, ADR-0011).
 * Keyed by a stable app `id`; `uid` links 1:1 to a Firebase Auth user and is set
 * by auth (#7) at first login. `pinHash` is reserved for the device-unlock PIN (#7).
 */
export const readerSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  avatar: z.string().nullish(),
  displayColor: z.string().nullish(),
  goodreadsUrl: z.string().nullish(),
  email: z.string().email().nullish(),
  preferences: z.record(z.string(), z.unknown()).default({}),
  uid: z.string().nullish(),
  pinHash: z.string().nullish(),
  hasPin: z.boolean().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Reader = z.infer<typeof readerSchema>;

/** Fields accepted when creating a reader (server manages id/uid/pinHash/timestamps). */
export const readerCreateSchema = z.object({
  name: z.string().min(1),
  avatar: z.string().nullish(),
  displayColor: z.string().nullish(),
  goodreadsUrl: z.string().nullish(),
  email: z.string().email().nullish(),
  preferences: z.record(z.string(), z.unknown()).optional(),
});
export type ReaderCreateInput = z.infer<typeof readerCreateSchema>;

/** Fields accepted when updating a reader profile. */
export const readerUpdateSchema = readerCreateSchema.partial();
export type ReaderUpdateInput = z.infer<typeof readerUpdateSchema>;

/**
 * Client-safe view of a reader: never expose the PIN hash; surface only whether
 * a PIN is set (`hasPin`). Use this to serialize readers in API responses.
 */
export function toClientReader(reader: Reader): Reader {
  const { pinHash, ...rest } = reader;
  return { ...rest, pinHash: undefined, hasPin: Boolean(pinHash) };
}
