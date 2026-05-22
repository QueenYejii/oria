export type UploadItemStatus =
  | "queued"
  | "reading"
  | "ready"
  | "signing"
  | "uploading"
  | "indexing"
  | "published"
  | "cancelled"
  | "failed";

export type UploadItem = {
  id: string;
  file: File;
  status: UploadItemStatus;
  progressLabel: string;
  progress?: number;
  error?: string;
};
