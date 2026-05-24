import { z } from "zod";

export const spaceFileSchema = z.object({
  id: z.string().min(1),
  blobName: z.string().min(1),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  size: z.number().nonnegative(),
});

export const spacePaymentSchema = z.object({
  currency: z.enum(["APT", "SHELBY_USD"]),
  priceOctas: z.number().int().positive(),
  recipient: z.string().min(1),
  assetMetadataAddress: z.string().optional(),
});

export const spaceAccessSchema = z.object({
  rule: z.enum(["public", "allowlist", "creator_only", "paid"]),
  allowlist: z.array(z.string().min(1)).optional(),
});

export const spaceManifestVersionSchema = z.object({
  version: z.number().int().positive(),
  manifestBlobName: z.string().optional(),
  manifestHash: z.string().optional(),
  updatedAt: z.number(),
});

export const spaceSchema = z.object({
  id: z.string().min(1),
  network: z.enum(["testnet", "shelbynet"]),
  creator: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  thumbnailBlobName: z.string().optional(),
  thumbnailFileName: z.string().optional(),
  thumbnailMimeType: z.string().optional(),
  thumbnailSize: z.number().nonnegative().optional(),
  thumbnailIsPublic: z.boolean().optional(),
  manifestBlobName: z.string().optional(),
  manifestHash: z.string().optional(),
  manifestVersion: z.number().int().positive().default(1),
  manifestVersions: z.array(spaceManifestVersionSchema).optional(),
  files: z.array(spaceFileSchema),
  visibility: z.enum(["public", "wallet_gated", "paid"]),
  access: spaceAccessSchema.default({ rule: "public" }),
  payment: spacePaymentSchema.optional(),
  registryTxHash: z.string().optional(),
  expiresAt: z.number(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
