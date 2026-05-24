import { getRegistrySpace, listRegistrySpaces, type RegistrySpaceRecord } from "./client";
import { createShelbyClient } from "../shelby/client";
import { decodeSpaceManifest } from "../spaces/manifest";
import { saveSpace } from "../spaces/local-store";
import type { OriaNetwork } from "../../types/network";
import type { Space } from "../../types/space";

function normalizeHash(hash: string | number[]) {
  if (Array.isArray(hash)) {
    return hash.map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  return hash.startsWith("0x") ? hash.slice(2) : hash;
}

export async function importRegistryRecord(record: RegistrySpaceRecord): Promise<Space> {
  const client = createShelbyClient(record.network);
  const manifestBlob = await client.rpc.getBlob({
    account: record.creator,
    blobName: record.manifestBlobName,
  });
  const manifestSpace = await decodeSpaceManifest(manifestBlob.readable);
  const importedSpace: Space = {
    ...manifestSpace,
    id: record.spaceId,
    network: record.network,
    creator: record.creator,
    manifestBlobName: record.manifestBlobName,
    manifestHash: normalizeHash(record.manifestHash),
    manifestVersion: record.manifestVersion,
    registryTxHash: manifestSpace.registryTxHash,
  };

  saveSpace(importedSpace);
  return importedSpace;
}

export async function importRegistrySpaces(params: {
  network?: OriaNetwork;
  creator?: string;
  q?: string;
  limit?: number;
  offset?: number;
}) {
  const records = await listRegistrySpaces(params);
  return Promise.all(records.map((record) => importRegistryRecord(record)));
}

export async function importRegistrySpace(spaceId: string) {
  const record = await getRegistrySpace(spaceId);
  return record ? importRegistryRecord(record) : null;
}
