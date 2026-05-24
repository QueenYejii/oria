import type { UploadItemStatus } from "../../types/upload";

export type UploadSessionFile = {
  name: string;
  size: number;
  type: string;
  lastModified: number;
  status: UploadItemStatus;
  progress?: number;
  progressLabel: string;
  error?: string;
};

export type UploadSession = {
  spaceId: string;
  startedAt: number;
  updatedAt: number;
  files: UploadSessionFile[];
};

const STORAGE_KEY = "oria:upload-session:v1";

export function saveUploadSession(session: Omit<UploadSession, "updatedAt">) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...session,
      updatedAt: Date.now(),
    }),
  );
}

export function loadUploadSession() {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as UploadSession;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function clearUploadSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
