import type { OriaNetwork } from "./network";

export type SpaceVisibility = "public" | "wallet_gated" | "paid";
export type SpaceAccessRule = "public" | "allowlist" | "creator_only" | "paid";

export type SpaceFile = {
  id: string;
  blobName: string;
  fileName: string;
  mimeType: string;
  size: number;
};

export type SpacePayment = {
  currency: "APT";
  priceOctas: number;
  recipient: string;
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
  manifestBlobName?: string;
  manifestHash?: string;
  manifestVersion: number;
  files: SpaceFile[];
  visibility: SpaceVisibility;
  access: SpaceAccess;
  payment?: SpacePayment;
  registryTxHash?: string;
  expiresAt: number;
  createdAt: number;
  updatedAt: number;
};
