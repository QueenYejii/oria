export type UploadItemStatus =
  | "queued"
  | "reading"
  | "ready"
  | "signing"
  | "uploading"
  | "published"
  | "failed";

export type UploadItem = {
  id: string;
  file: File;
  status: UploadItemStatus;
  progressLabel: string;
  error?: string;
};
