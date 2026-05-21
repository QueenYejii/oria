import { useUploadBlobs } from "@shelby-protocol/react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useMemo, useState } from "react";
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

export function useCreateSpace() {
  const { activeNetwork } = useActiveNetwork();
  const wallet = useWallet();
  const shelbyClient = useMemo(() => createShelbyClient(activeNetwork), [activeNetwork]);
  const uploadBlobs = useUploadBlobs({ client: shelbyClient });
  const [items, setItems] = useState<UploadItem[]>([]);
  const [createdSpace, setCreatedSpace] = useState<Space | null>(null);
  const [lastInput, setLastInput] = useState<CreateSpaceInput | null>(null);

  const updateAll = (patch: Partial<UploadItem>) => {
    setItems((current) => current.map((item) => ({ ...item, ...patch })));
  };

  const createSpace = async (input: CreateSpaceInput) => {
    setLastInput(input);
    const creator = getAccountAddress(wallet.account);

    if (!wallet.connected || !wallet.account || !creator) {
      throw new Error("Connect an Aptos wallet before publishing a Space.");
    }

    if (input.files.length === 0) {
      throw new Error("Add at least one file before publishing.");
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
    setItems(
      input.files.map((file) => ({
        id: createId("upload"),
        file,
        status: "queued",
        progressLabel: "Queued",
      }))
    );

    try {
      updateAll({ status: "reading", progressLabel: "Preparing files" });

      const blobs = await Promise.all(
        input.files.map(async (file, index) => ({
          blobName: createBlobName({ spaceId, fileName: file.name, index }),
          blobData: await fileToUint8Array(file),
        }))
      );

      setItems((current) =>
        current.map((item) => ({
          ...item,
          status: "ready",
          progressLabel: "Ready",
        }))
      );

      updateAll({ status: "signing", progressLabel: "Waiting for wallet" });

      const expirationMicros = now * 1000 + thirtyDaysInMicros;

      await uploadBlobs.mutateAsync({
        signer: {
          account: creator,
          signAndSubmitTransaction: wallet.signAndSubmitTransaction,
        },
        blobs,
        expirationMicros,
        maxConcurrentUploads: 3,
      });

      updateAll({ status: "published", progressLabel: "Published" });

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

      updateAll({ status: "indexing", progressLabel: "Writing manifest" });

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
      updateAll({ status: "indexing", progressLabel: "Registering Space" });

      registryTxHash =
        (await registerSpaceOnChain({
          space: indexedSpaceDraft,
          signAndSubmitTransaction: wallet.signAndSubmitTransaction,
        })) ?? undefined;

      updateAll({ status: "published", progressLabel: "Published" });

      const space: Space = {
        ...indexedSpaceDraft,
        registryTxHash,
        updatedAt: Date.now(),
      };

      saveSpace(space);
      setCreatedSpace(space);

      return space;
    } catch (error) {
      updateAll({
        status: "failed",
        progressLabel: "Failed",
        error: getErrorMessage(error),
      });
      throw error;
    }
  };

  return {
    createSpace,
    retryLastUpload: () => {
      if (!lastInput) {
        throw new Error("No failed upload is available to retry.");
      }

      return createSpace(lastInput);
    },
    canRetry: Boolean(lastInput && items.some((item) => item.status === "failed")),
    createdSpace,
    uploadItems: items,
    isUploading: uploadBlobs.isPending,
    error: uploadBlobs.error,
  };
}
