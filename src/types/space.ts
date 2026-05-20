import type { OriaNetwork } from "./network";

export type SpaceVisibility = "public" | "wallet_gated" | "paid";

export type SpaceFile = {
  id: string;
  blobName: string;
  fileName: string;
  mimeType: string;
  size: number;
};

export type Space = {
  id: string;
  network: OriaNetwork;
  creator: string;
  title: string;
  description: string;
  thumbnailBlobName?: string;
  files: SpaceFile[];
  visibility: SpaceVisibility;
  expiresAt: number;
  createdAt: number;
  updatedAt: number;
};
