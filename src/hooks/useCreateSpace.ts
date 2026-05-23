import { useUploadBlobs } from "@shelby-protocol/react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useMemo, useRef, useState } from "react";
import { useActiveNetwork } from "./useActiveNetwork";
import { createShelbyClient } from "../lib/shelby/client";
import { encodeSpaceManifest } from "../lib/spaces/manifest";
import { registerSpaceOnChain } from "../lib/registry/client";
import { saveSpace } from "../lib/spaces/local-store";
import { getAccountAddress } from "../lib/wallet/address";
import { createBlobName, createId, fileToUint8Array } from "../lib/utils/files";
import { getErrorMessage } from "../lib/utils/errors";
import { sha256Hex } from "../lib/utils/hash";
import type { Space, SpaceFile, SpaceVisibility } from "../types/space";
import type { UploadItem } from "../types/upload";

type CreateSpaceInput = {
  title: string;
  description: string;
  visibility: SpaceVisibility;
  priceOctas?: number;
  allowlist?: string[];
  files: File[];
};

const thirtyDaysInMicros = 30 * 24 * 60 * 60 * 1_000_000;
const maxFileSize = 2 * 1024 * 1024 * 1024;
const maxTotalSize = 5 * 1024 * 1024 * 1024;
const blockedExtensions = new Set(["exe", "bat", "cmd", "com", "msi", "ps1", "scr"]);

export function useCreateSpace() {
  const { activeNetwork } = useActiveNetwork();
  const wallet = useWallet();
  const shelbyClient = useMemo(() => createShelbyClient(activeNetwork), [activeNetwork]);
  const uploadBlobs = useUploadBlobs({ client: shelbyClient });
  const [items, setItems] = useState<UploadItem[]>([]);
  const [createdSpace, setCreatedSpace] = useState<Space | null>(null);
  const [lastInput, setLastInput] = useState<CreateSpaceInput | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const cancelRequestedRef = useRef(false);

  const updateAll = (patch: Partial<UploadItem>) => {
    setItems((current) => current.map((item) => ({ ...item, ...patch })));
  };

  const updateItem = (index: number, patch: Partial<UploadItem>) => {
    setItems((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    );
  };

  const createSpace = async (input: CreateSpaceInput) => {
    cancelRequestedRef.current = false;
    setLastInput(input);
    const creator = getAccountAddress(wallet.account);

    if (!wallet.connected || !wallet.account || !creator) {
      throw new Error("Connect an Aptos wallet before publishing a Space.");
    }

    if (input.files.length === 0) {
      throw new Error("Add at least one file before publishing.");
    }

    if (input.files.some((file) => file.size === 0)) {
      throw new Error("Remove empty files before publishing.");
    }

    const totalSize = input.files.reduce((sum, file) => sum + file.size, 0);
    if (input.files.some((file) => file.size > maxFileSize)) {
      throw new Error("One or more files are larger than the current 2 GB per-file limit.");
    }

    if (totalSize > maxTotalSize) {
      throw new Error("This release is larger than the current 5 GB total queue limit.");
    }

    const blockedFile = input.files.find((file) => blockedExtensions.has(file.name.split(".").pop()?.toLowerCase() ?? ""));
    if (blockedFile) {
      throw new Error(`${blockedFile.name} is not accepted for community releases.`);
    }

    if (!input.title.trim()) {
      throw new Error("Give this Space a title.");
    }

    if (input.visibility === "paid" && (!input.priceOctas || input.priceOctas <= 0)) {
      throw new Error("Set a valid APT price before publishing a paid Space.");
    }

    const now = Date.now();
    const spaceId = createId("space");

    setCreatedSpace(null);
    setIsPublishing(true);
    setItems(
      input.files.map((file) => ({
        id: createId("upload"),
        file,
        status: "queued",
        progressLabel: "Queued",
      }))
    );

    try {
      const assertNotCancelled = () => {
        if (cancelRequestedRef.current) {
          throw new Error("Upload cancelled before it finished.");
        }
      };

      updateAll({ status: "reading", progressLabel: "Preparing files", progress: 8 });

      const blobs = await Promise.all(
        input.files.map(async (file, index) => {
          updateItem(index, {
            status: "reading",
            progressLabel: `Reading ${index + 1} of ${input.files.length}`,
            progress: 12,
          });
          const blob = {
            blobName: createBlobName({ spaceId, fileName: file.name, index }),
            blobData: await fileToUint8Array(file),
          };
          updateItem(index, {
            status: "ready",
            progressLabel: "Prepared for Shelby",
            progress: 24,
          });
          return blob;
        })
      );

      assertNotCancelled();

      const expirationMicros = now * 1000 + thirtyDaysInMicros;

      for (let index = 0; index < blobs.length; index += 1) {
        assertNotCancelled();
        updateItem(index, {
          status: "signing",
          progressLabel: `Wallet signature ${index + 1} of ${blobs.length}`,
          progress: 34,
        });

        await uploadBlobs.mutateAsync({
          signer: {
            account: creator,
            signAndSubmitTransaction: wallet.signAndSubmitTransaction,
          },
          blobs: [blobs[index]],
          expirationMicros,
          maxConcurrentUploads: 1,
        });

        updateItem(index, {
          status: "published",
          progressLabel: "Blob stored on Shelby",
          progress: 72,
        });
      }

      assertNotCancelled();
      updateAll({ status: "published", progressLabel: "Blobs published", progress: 76 });

      const files: SpaceFile[] = input.files.map((file, index) => ({
        id: createId("file"),
        blobName: blobs[index].blobName,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
      }));

      const thumbnail = files.find((file) => file.mimeType.startsWith("image/"));

      const manifestBlobName = `oria/${spaceId}/manifest.json`;
      const spaceDraft: Space = {
        id: spaceId,
        network: activeNetwork,
        creator,
        title: input.title.trim(),
        description: input.description.trim(),
        thumbnailBlobName: thumbnail?.blobName,
        manifestBlobName,
        manifestVersion: 1,
        files,
        visibility: input.visibility,
        access:
          input.visibility === "paid"
            ? { rule: "paid" }
            : input.visibility === "wallet_gated"
              ? {
                  rule: input.allowlist?.length ? "allowlist" : "creator_only",
                  allowlist: input.allowlist,
                }
              : { rule: "public" },
        payment:
          input.visibility === "paid" && input.priceOctas
            ? {
                currency: "APT",
                priceOctas: input.priceOctas,
                recipient: creator,
              }
            : undefined,
        expiresAt: Math.floor(expirationMicros / 1000),
        createdAt: now,
        updatedAt: now,
      };

      const manifestBytes = encodeSpaceManifest(spaceDraft);
      const manifestHash = await sha256Hex(manifestBytes);
      const indexedSpaceDraft = {
        ...spaceDraft,
        manifestHash,
      };

      updateAll({ status: "indexing", progressLabel: "Writing manifest", progress: 84 });

      assertNotCancelled();
      await uploadBlobs.mutateAsync({
        signer: {
          account: creator,
          signAndSubmitTransaction: wallet.signAndSubmitTransaction,
        },
        blobs: [
          {
            blobName: manifestBlobName,
            blobData: manifestBytes,
          },
        ],
        expirationMicros,
        maxConcurrentUploads: 1,
      });

      let registryTxHash: string | undefined;
      updateAll({ status: "indexing", progressLabel: "Registering Space", progress: 94 });

      assertNotCancelled();
      registryTxHash =
        (await registerSpaceOnChain({
          space: indexedSpaceDraft,
          signAndSubmitTransaction: wallet.signAndSubmitTransaction,
        })) ?? undefined;

      updateAll({ status: "published", progressLabel: "Published", progress: 100 });

      const space: Space = {
        ...indexedSpaceDraft,
        registryTxHash,
        updatedAt: Date.now(),
      };

      saveSpace(space);
      setCreatedSpace(space);

      return space;
    } catch (error) {
      if (cancelRequestedRef.current) {
        updateAll({
          status: "cancelled",
          progressLabel: "Cancelled",
          error: "Upload was cancelled. Already-submitted wallet transactions may still settle.",
        });
        throw new Error("Upload cancelled. You can retry from the saved form state.");
      }

      updateAll({
        status: "failed",
        progressLabel: "Failed",
        error: getErrorMessage(error),
      });
      throw error;
    } finally {
      setIsPublishing(false);
    }
  };

  return {
    createSpace,
    cancelUpload: () => {
      cancelRequestedRef.current = true;
      updateAll({
        status: "cancelled",
        progressLabel: "Cancelling after the current wallet/Shelby request",
      });
    },
    retryLastUpload: () => {
      if (!lastInput) {
        throw new Error("No failed upload is available to retry.");
      }

      return createSpace(lastInput);
    },
    canRetry: Boolean(lastInput && items.some((item) => item.status === "failed")),
    createdSpace,
    uploadItems: items,
    isUploading: isPublishing || uploadBlobs.isPending,
    error: uploadBlobs.error,
  };
}
