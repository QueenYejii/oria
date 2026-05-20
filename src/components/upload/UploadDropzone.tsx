import { Upload } from "lucide-react";
import { useRef, useState } from "react";
import { formatBytes } from "../../lib/utils/format";

type UploadDropzoneProps = {
  files: File[];
  onFilesChange: (files: File[]) => void;
};

export function UploadDropzone({ files, onFilesChange }: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);

  const addFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const incoming = Array.from(fileList);
    onFilesChange([...files, ...incoming]);
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
      </div>

      {files.length > 0 && (
        <div className="selected-files">
          {files.map((file, index) => (
            <span key={`${file.name}-${file.lastModified}-${index}`}>
              {file.name} · {formatBytes(file.size)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
