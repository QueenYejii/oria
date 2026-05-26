import { spaceSchema } from "./schema";
import type { Space } from "../../types/space";

export const ORIA_MANIFEST_VERSION = 1;

export type SpaceManifest = {
  app: "oria";
  version: typeof ORIA_MANIFEST_VERSION;
  space: Space;
};

export function createSpaceManifest(space: Space): SpaceManifest {
  return {
    app: "oria",
    version: ORIA_MANIFEST_VERSION,
    space,
  };
}

export function encodeSpaceManifest(space: Space) {
  return new TextEncoder().encode(JSON.stringify(createSpaceManifest(space), null, 2));
}

export async function decodeSpaceManifest(readable: ReadableStream<Uint8Array>) {
  const text = await new Response(readable).text();
  const parsed = JSON.parse(text) as unknown;

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("app" in parsed) ||
    parsed.app !== "oria" ||
    !("space" in parsed)
  ) {
    throw new Error("This file is not an Oria Space manifest.");
  }

  return spaceSchema.parse(parsed.space);
}

export function createShareUrl(space: Space) {
  const url = new URL(`/spaces/${space.id}`, window.location.origin);

  if (space.manifestBlobName) {
    url.searchParams.set("manifest", space.manifestBlobName);
    url.searchParams.set("creator", space.creator);
    url.searchParams.set("network", space.network);
    if (space.registryModule) {
      url.searchParams.set("registryModule", space.registryModule);
    }
  }

  return url.toString();
}
