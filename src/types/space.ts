import type { OriaNetwork } from "./network";

export type SpaceVisibility = "public" | "wallet_gated" | "paid";
export type SpaceAccessRule = "public" | "allowlist" | "creator_only" | "paid";
export type SpacePaymentCurrency = "APT" | "SHELBY_USD";

export type SpaceFile = {
  id: string;
  blobName: string;
  fileName: string;
  mimeType: string;
  size: number;
};

export type SpacePayment = {
  currency: SpacePaymentCurrency;
  priceOctas: number;
  recipient: string;
  assetMetadataAddress?: string;
};

export type SpaceManifestVersion = {
  version: number;
  manifestBlobName?: string;
  manifestHash?: string;
  updatedAt: number;
};

export type SpaceAccess = {
  rule: SpaceAccessRule;
  allowlist?: string[];
};

export type Space = {
  id: string;
  network: OriaNetwork;
  creator: string;
  title: string;
  description: string;
  thumbnailBlobName?: string;
  thumbnailFileName?: string;
  thumbnailMimeType?: string;
  thumbnailSize?: number;
  thumbnailIsPublic?: boolean;
  manifestBlobName?: string;
  manifestHash?: string;
  manifestVersion: number;
  manifestVersions?: SpaceManifestVersion[];
  files: SpaceFile[];
  visibility: SpaceVisibility;
  access: SpaceAccess;
  payment?: SpacePayment;
  registryTxHash?: string;
  expiresAt: number;
  createdAt: number;
  updatedAt: number;
};
