import { useUploadBlobs } from "@shelby-protocol/react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useMemo, useRef, useState } from "react";
import { useActiveNetwork } from "./useActiveNetwork";
import { createShelbyClient, getShelbyApiKey, getShelbyApiKeyEnvName } from "../lib/shelby/client";
import { encodeSpaceManifest } from "../lib/spaces/manifest";
import {
  assertRegistryReady,
  getPaymentAssetAddress,
  getRegistryModuleName,
  registerSpaceOnChain,
} from "../lib/registry/client";
import { saveSpace } from "../lib/spaces/local-store";
import { clearUploadSession, saveUploadSession } from "../lib/upload/session-store";
import { getAccountAddress } from "../lib/wallet/address";
import { createBlobName, createId, fileToUint8Array } from "../lib/utils/files";
import { getErrorMessage } from "../lib/utils/errors";
import { sha256Hex } from "../lib/utils/hash";
import type { Space, SpaceFile, SpacePaymentCurrency, SpaceVisibility } from "../types/space";
import type { UploadItem } from "../types/upload";

type CreateSpaceInput = {
  title: string;
  description: string;
  visibility: SpaceVisibility;
  priceOctas?: number;
  paymentCurrency?: SpacePaymentCurrency;
  expiresAtMs?: number;
  allowlist?: string[];
  publicCoverFile?: File | null;
  files: File[];
};

const thirtyDaysInMicros = 30 * 24 * 60 * 60 * 1_000_000;
const minimumRetentionMs = 10 * 60 * 1000;
const maxFileSize = 2 * 1024 * 1024 * 1024;
const maxTotalSize = 5 * 1024 * 1024 * 1024;
const maxCoverSize = 12 * 1024 * 1024;
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
  const sessionRef = useRef<{ spaceId: string; startedAt: number } | null>(null);

  const persistSession = (nextItems: UploadItem[]) => {
    if (!sessionRef.current) return;

    saveUploadSession({
      spaceId: sessionRef.current.spaceId,
      startedAt: sessionRef.current.startedAt,
      files: nextItems.map((item) => ({
        name: item.file.name,
        size: item.file.size,
        type: item.file.type,
        lastModified: item.file.lastModified,
        status: item.status,
        progress: item.progress,
        progressLabel: item.progressLabel,
        error: item.error,
      })),
    });
  };

  const updateAll = (patch: Partial<UploadItem>) => {
    setItems((current) => {
      const next = current.map((item) => ({ ...item, ...patch }));
      persistSession(next);
      return next;
    });
  };

  const updateItem = (index: number, patch: Partial<UploadItem>) => {
    setItems((current) => {
      const next = current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item));
      persistSession(next);
      return next;
    });
  };

  const createSpace = async (input: CreateSpaceInput) => {
    cancelRequestedRef.current = false;
    setLastInput(input);
    const creator = getAccountAddress(wallet.account);

    if (!wallet.connected || !wallet.account || !creator) {
      throw new Error("Connect an Aptos wallet before publishing a Space.");
    }

    if (!getShelbyApiKey(activeNetwork)) {
      throw new Error(
        `Shelby ${activeNetwork} API key is not configured. Add ${getShelbyApiKeyEnvName(activeNetwork)} as a Geomi client key in Vercel, then redeploy.`,
      );
    }

    if (input.files.length === 0) {
      throw new Error("Add at least one file before publishing.");
    }

    if (input.files.some((file) => file.size === 0)) {
      throw new Error("Remove empty files before publishing.");
    }

    if (input.publicCoverFile) {
      if (!input.publicCoverFile.type.startsWith("image/")) {
        throw new Error("Public cover must be an image file.");
      }

      if (input.publicCoverFile.size > maxCoverSize) {
        throw new Error("Public cover must be 12 MB or smaller.");
      }
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
      throw new Error("Set a valid price before publishing a paid Space.");
    }

    const now = Date.now();
    const expiresAtMs = input.expiresAtMs ?? now + thirtyDaysInMicros / 1000;
    if (!Number.isFinite(expiresAtMs) || expiresAtMs <= now + minimumRetentionMs) {
      throw new Error("Choose an expiration time at least 10 minutes from now.");
    }

    await assertRegistryReady(activeNetwork);

    const spaceId = createId("space");

    setCreatedSpace(null);
    setIsPublishing(true);
    const hasPublicCover = Boolean(input.publicCoverFile);
    const contentOffset = hasPublicCover ? 1 : 0;
    const queueFiles = input.publicCoverFile ? [input.publicCoverFile, ...input.files] : input.files;

    const initialItems: UploadItem[] = queueFiles.map((file, index) => ({
        id: createId("upload"),
        file,
        status: "queued",
        progressLabel: hasPublicCover && index === 0 ? "Public cover queued" : "Queued",
      }));
    setItems(initialItems);
    sessionRef.current = { spaceId, startedAt: now };
    saveUploadSession({
      spaceId,
      startedAt: now,
      files: initialItems.map((item) => ({
        name: item.file.name,
        size: item.file.size,
        type: item.file.type,
        lastModified: item.file.lastModified,
        status: item.status,
        progress: item.progress,
        progressLabel: item.progressLabel,
      })),
    });

    try {
      const assertNotCancelled = () => {
        if (cancelRequestedRef.current) {
          throw new Error("Upload cancelled before it finished.");
        }
      };

      updateAll({ status: "reading", progressLabel: "Preparing files", progress: 8 });

      let publicCoverBlob:
        | {
            blobName: string;
            blobData: Uint8Array;
          }
        | null = null;

      if (input.publicCoverFile) {
        updateItem(0, {
          status: "reading",
          progressLabel: "Preparing public cover",
          progress: 12,
        });
        publicCoverBlob = {
          blobName: createBlobName({ spaceId, fileName: input.publicCoverFile.name, index: -1 }),
          blobData: await fileToUint8Array(input.publicCoverFile),
        };
        updateItem(0, {
          status: "ready",
          progressLabel: "Public cover ready",
          progress: 24,
        });
      }

      const blobs = await Promise.all(
        input.files.map(async (file, index) => {
          updateItem(index + contentOffset, {
            status: "reading",
            progressLabel: `Reading ${index + 1} of ${input.files.length}`,
            progress: 12,
          });
          const blob = {
            blobName: createBlobName({ spaceId, fileName: file.name, index }),
            blobData: await fileToUint8Array(file),
          };
          updateItem(index + contentOffset, {
            status: "ready",
            progressLabel: "Prepared for Shelby",
            progress: 24,
          });
          return blob;
        })
      );

      assertNotCancelled();

      const expirationMicros = Math.floor(expiresAtMs * 1000);

      if (publicCoverBlob) {
        assertNotCancelled();
        updateItem(0, {
          status: "signing",
          progressLabel: "Signing public cover",
          progress: 34,
        });

        await uploadBlobs.mutateAsync({
          signer: {
            account: creator,
            signAndSubmitTransaction: wallet.signAndSubmitTransaction,
          },
          blobs: [publicCoverBlob],
          expirationMicros,
          maxConcurrentUploads: 1,
        });

        updateItem(0, {
          status: "published",
          progressLabel: "Public cover stored on Shelby",
          progress: 72,
        });
      }

      for (let index = 0; index < blobs.length; index += 1) {
        assertNotCancelled();
        updateItem(index + contentOffset, {
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

        updateItem(index + contentOffset, {
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
      const publicCover = input.publicCoverFile && publicCoverBlob
        ? {
            blobName: publicCoverBlob.blobName,
            fileName: input.publicCoverFile.name,
            mimeType: input.publicCoverFile.type || "image/*",
            size: input.publicCoverFile.size,
          }
        : null;

      const manifestBlobName = `oria/${spaceId}/manifest.json`;
      const spaceDraft: Space = {
        id: spaceId,
        registryModule: getRegistryModuleName(),
        network: activeNetwork,
        creator,
        title: input.title.trim(),
        description: input.description.trim(),
        thumbnailBlobName: publicCover?.blobName ?? thumbnail?.blobName,
        thumbnailFileName: publicCover?.fileName ?? thumbnail?.fileName,
        thumbnailMimeType: publicCover?.mimeType ?? thumbnail?.mimeType,
        thumbnailSize: publicCover?.size ?? thumbnail?.size,
        thumbnailIsPublic: Boolean(publicCover) || input.visibility === "public",
        manifestBlobName,
        manifestVersion: 1,
        manifestVersions: [],
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
                currency: input.paymentCurrency ?? "APT",
                priceOctas: input.priceOctas,
                recipient: creator,
                assetMetadataAddress:
                  input.paymentCurrency === "SHELBY_USD"
                    ? getPaymentAssetAddress("SHELBY_USD")
                    : undefined,
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
      clearUploadSession();
      sessionRef.current = null;

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
