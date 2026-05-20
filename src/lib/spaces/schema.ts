import { z } from "zod";

export const spaceFileSchema = z.object({
  id: z.string().min(1),
  blobName: z.string().min(1),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  size: z.number().nonnegative(),
});

export const spaceSchema = z.object({
  id: z.string().min(1),
  network: z.enum(["testnet", "shelbynet"]),
  creator: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  thumbnailBlobName: z.string().optional(),
  files: z.array(spaceFileSchema),
  visibility: z.enum(["public", "wallet_gated", "paid"]),
  expiresAt: z.number(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
