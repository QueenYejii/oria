import { describe, expect, it } from "vitest";
import { decodeSpaceManifest, encodeSpaceManifest } from "./manifest";
import type { Space } from "../../types/space";

const space: Space = {
  id: "space_1",
  network: "testnet",
  creator: "0xabc",
  title: "Studio Dispatch",
  description: "Release notes",
  manifestBlobName: "oria/space_1/manifest.json",
  manifestVersion: 1,
  files: [
    {
      id: "file_1",
      blobName: "oria/space_1/01-cover.png",
      fileName: "cover.png",
      mimeType: "image/png",
      size: 128,
    },
  ],
  visibility: "paid",
  access: {
    rule: "paid",
  },
  payment: {
    currency: "APT",
    priceOctas: 1_000_000,
    recipient: "0xabc",
  },
  expiresAt: Date.now() + 1_000,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

describe("Space manifest", () => {
  it("round-trips a Space through an Oria manifest", async () => {
    const encoded = encodeSpaceManifest(space);
    const decoded = await decodeSpaceManifest(new Blob([encoded]).stream());

    expect(decoded).toEqual(space);
  });
});
