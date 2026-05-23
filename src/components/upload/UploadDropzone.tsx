import { Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { formatBytes } from "../../lib/utils/format";

type UploadDropzoneProps = {
  files: File[];
  onFilesChange: (files: File[]) => void;
};

const maxFiles = 24;
const maxFileSize = 2 * 1024 * 1024 * 1024;
const maxTotalSize = 5 * 1024 * 1024 * 1024;
const maxFileNameLength = 180;
const blockedExtensions = new Set(["exe", "bat", "cmd", "com", "msi", "ps1", "scr"]);

export function UploadDropzone({ files, onFilesChange }: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  const addFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    setValidationMessage(null);

    const incoming = Array.from(fileList);
    const existingKeys = new Set(files.map((file) => `${file.name}:${file.size}:${file.lastModified}`));
    let nextTotalSize = files.reduce((sum, file) => sum + file.size, 0);
    const accepted: File[] = [];
    const rejected: string[] = [];

    for (const file of incoming) {
      const key = `${file.name}:${file.size}:${file.lastModified}`;
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "";

      if (existingKeys.has(key)) {
        rejected.push(`${file.name} is already selected`);
      } else if (file.name.length > maxFileNameLength) {
        rejected.push(`${file.name.slice(0, 42)}... has a name that is too long`);
      } else if (file.size === 0) {
        rejected.push(`${file.name} is empty`);
      } else if (file.size > maxFileSize) {
        rejected.push(`${file.name} is larger than ${formatBytes(maxFileSize)}`);
      } else if (nextTotalSize + file.size > maxTotalSize) {
        rejected.push(`This queue would exceed ${formatBytes(maxTotalSize)}`);
      } else if (blockedExtensions.has(extension)) {
        rejected.push(`${file.name} is not accepted for community releases`);
      } else if (files.length + accepted.length >= maxFiles) {
        rejected.push(`Only ${maxFiles} files can be queued at once`);
      } else {
        existingKeys.add(key);
        nextTotalSize += file.size;
        accepted.push(file);
      }
    }

    if (rejected.length > 0) {
      setValidationMessage(rejected.slice(0, 3).join(". "));
    }

    if (accepted.length > 0) {
      onFilesChange([...files, ...accepted]);
    }
  };

  return (
    <div
      className={`upload-dropzone ${dragging ? "dragging" : ""}`}
      onDragEnter={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        addFiles(event.dataTransfer.files);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        onChange={(event) => addFiles(event.target.files)}
      />
      <button type="button" className="dropzone-button" onClick={() => inputRef.current?.click()}>
        <Upload size={20} />
        Select files
      </button>
      <div>
        <h2>Drop files into Oria</h2>
        <p>Media, archives, documents, and datasets will be published as Shelby blobs.</p>
        <small>
          Up to {maxFiles} files, {formatBytes(maxFileSize)} per file, {formatBytes(maxTotalSize)} total.
        </small>
      </div>

      {files.length > 0 && (
        <div className="selected-files">
          {files.map((file, index) => (
            <span key={`${file.name}-${file.lastModified}-${index}`}>
              {file.name} - {formatBytes(file.size)}
              <button
                type="button"
                onClick={() => onFilesChange(files.filter((_, fileIndex) => fileIndex !== index))}
                aria-label={`Remove ${file.name}`}
              >
                <X size={14} aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      )}

      {validationMessage && <p className="dropzone-validation">{validationMessage}</p>}
    </div>
  );
}
