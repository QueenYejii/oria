import { useMemo, useState } from "react";
import { useActiveNetwork } from "./useActiveNetwork";
import { createShelbyClient } from "../lib/shelby/client";
import { getErrorMessage } from "../lib/utils/errors";
import type { Space, SpaceFile } from "../types/space";

export function useDownloadBlob() {
  const { activeNetwork } = useActiveNetwork();
  const shelbyClient = useMemo(() => createShelbyClient(activeNetwork), [activeNetwork]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const downloadFile = async (space: Space, file: SpaceFile) => {
    setActiveFileId(file.id);
    setError(null);

    try {
      const shelbyBlob = await shelbyClient.rpc.getBlob({
        account: space.creator,
        blobName: file.blobName,
      });
      const blob = await new Response(shelbyBlob.readable).blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      anchor.href = url;
      anchor.download = file.fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setActiveFileId(null);
    }
  };

  return { activeFileId, error, downloadFile };
}
