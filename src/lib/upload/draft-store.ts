import type { SpaceVisibility } from "../../types/space";

export type UploadDraftFile = {
  name: string;
  size: number;
  type: string;
  lastModified: number;
};

export type UploadDraft = {
  title: string;
  description: string;
  visibility: SpaceVisibility;
  priceApt: string;
  expiresAtLocal?: string;
  allowlistText: string;
  files: UploadDraftFile[];
  updatedAt: number;
};

const STORAGE_KEY = "oria:upload-draft:v1";
const DB_NAME = "oria-upload-drafts";
const DB_VERSION = 1;
const FILE_STORE = "files";
const FILE_KEY = "active";

function openUploadDb(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || !("indexedDB" in window)) return Promise.resolve(null);

  return new Promise((resolve) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(FILE_STORE)) {
        db.createObjectStore(FILE_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
}

export function loadUploadDraft() {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as UploadDraft;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveUploadDraft(draft: Omit<UploadDraft, "updatedAt">) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...draft,
      updatedAt: Date.now(),
    }),
  );
}

export function clearUploadDraft() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  void clearUploadDraftFiles();
}

export async function saveUploadDraftFiles(files: File[]) {
  const db = await openUploadDb();
  if (!db) return false;

  return new Promise<boolean>((resolve) => {
    const transaction = db.transaction(FILE_STORE, "readwrite");
    transaction.objectStore(FILE_STORE).put(files, FILE_KEY);
    transaction.oncomplete = () => {
      db.close();
      resolve(true);
    };
    transaction.onerror = () => {
      db.close();
      resolve(false);
    };
  });
}

export async function loadUploadDraftFiles() {
  const db = await openUploadDb();
  if (!db) return [] as File[];

  return new Promise<File[]>((resolve) => {
    const transaction = db.transaction(FILE_STORE, "readonly");
    const request = transaction.objectStore(FILE_STORE).get(FILE_KEY);
    request.onsuccess = () => {
      db.close();
      const files = request.result;
      resolve(Array.isArray(files) ? files.filter((file) => file instanceof File) : []);
    };
    request.onerror = () => {
      db.close();
      resolve([]);
    };
  });
}

export async function clearUploadDraftFiles() {
  const db = await openUploadDb();
  if (!db) return false;

  return new Promise<boolean>((resolve) => {
    const transaction = db.transaction(FILE_STORE, "readwrite");
    transaction.objectStore(FILE_STORE).delete(FILE_KEY);
    transaction.oncomplete = () => {
      db.close();
      resolve(true);
    };
    transaction.onerror = () => {
      db.close();
      resolve(false);
    };
  });
}
