import { describe, expect, it } from "vitest";
import { resolveSpaceAccess } from "./space-access";
import type { Space } from "../../types/space";

const baseSpace: Space = {
  id: "space_1",
  network: "testnet",
  creator: "0xabc",
  title: "Studio Dispatch",
  description: "",
  files: [],
  visibility: "public",
  manifestVersion: 1,
  access: { rule: "public" },
  expiresAt: Date.now() + 1_000,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

describe("resolveSpaceAccess", () => {
  it("allows public Spaces without a wallet", () => {
    expect(resolveSpaceAccess({ space: baseSpace }).canDownload).toBe(true);
  });

  it("locks wallet-gated Spaces until the owner wallet is connected", () => {
    const space = {
      ...baseSpace,
      visibility: "wallet_gated" as const,
      access: { rule: "creator_only" as const },
    };

    expect(resolveSpaceAccess({ space }).status).toBe("wallet_required");
    expect(resolveSpaceAccess({ space, viewer: "0xabc" }).status).toBe("owner");
    expect(resolveSpaceAccess({ space, viewer: "0xdef" }).canDownload).toBe(false);
  });

  it("allows paid Spaces after a local payment record exists", () => {
    const space = {
      ...baseSpace,
      visibility: "paid" as const,
      access: { rule: "paid" as const },
    };

    expect(resolveSpaceAccess({ space, viewer: "0xdef" }).canDownload).toBe(false);
    expect(resolveSpaceAccess({ space, viewer: "0xdef", hasPaid: true }).status).toBe("paid");
  });

  it("allows wallet-gated Spaces for allowlisted wallets", () => {
    const space = {
      ...baseSpace,
      visibility: "wallet_gated" as const,
      access: { rule: "allowlist" as const, allowlist: ["0xdef"] },
    };

    expect(resolveSpaceAccess({ space, viewer: "0xdef" }).canDownload).toBe(true);
  });

  it("requires external allowlist verification when registry state is trusted", () => {
    const space = {
      ...baseSpace,
      visibility: "wallet_gated" as const,
      access: { rule: "allowlist" as const, allowlist: ["0xdef"] },
    };

    expect(
      resolveSpaceAccess({ space, viewer: "0xdef", trustExternalAccessState: true }).canDownload,
    ).toBe(false);
    expect(
      resolveSpaceAccess({
        space,
        viewer: "0xdef",
        trustExternalAccessState: true,
        isAllowlisted: true,
      }).canDownload,
    ).toBe(true);
  });

  it("does not unlock paid Spaces without verified purchase state", () => {
    const space = {
      ...baseSpace,
      visibility: "paid" as const,
      access: { rule: "paid" as const },
    };

    expect(
      resolveSpaceAccess({ space, viewer: "0xdef", trustExternalAccessState: true }).canDownload,
    ).toBe(false);
    expect(
      resolveSpaceAccess({
        space,
        viewer: "0xdef",
        trustExternalAccessState: true,
        hasPaid: true,
      }).canDownload,
    ).toBe(true);
  });
});
