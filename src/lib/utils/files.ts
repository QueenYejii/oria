const unsafeCharacters = /[^a-z0-9._-]+/g;

export function createId(prefix = "oria") {
  if (crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function createBlobName(params: {
  spaceId: string;
  fileName: string;
  index: number;
}) {
  const fileName = params.fileName
    .toLowerCase()
    .trim()
    .replace(unsafeCharacters, "-")
    .replace(/^-+|-+$/g, "");

  const safeName = fileName.length > 0 ? fileName : `file-${params.index + 1}`;

  return `oria/${params.spaceId}/${String(params.index + 1).padStart(2, "0")}-${safeName}`;
}

export async function fileToUint8Array(file: File) {
  return new Uint8Array(await file.arrayBuffer());
}

export function getPreviewKind(mimeType: string) {
  if (mimeType.startsWith("image/")) return "Image";
  if (mimeType.startsWith("video/")) return "Video";
  if (mimeType.startsWith("audio/")) return "Audio";
  if (mimeType.includes("zip") || mimeType.includes("compressed")) return "Archive";
  if (mimeType.includes("json")) return "JSON";
  if (mimeType.includes("pdf")) return "PDF";
  return "File";
}
