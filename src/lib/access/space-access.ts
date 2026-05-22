import type { Space } from "../../types/space";

export type SpaceAccessState =
  | { status: "public"; canDownload: true; reason: string }
  | { status: "owner"; canDownload: true; reason: string }
  | { status: "paid"; canDownload: true; reason: string }
  | { status: "wallet_required"; canDownload: false; reason: string }
  | { status: "locked"; canDownload: false; reason: string };

export function resolveSpaceAccess(params: {
  space: Space;
  viewer?: string;
  hasPaid?: boolean;
  isAllowlisted?: boolean;
  trustExternalAccessState?: boolean;
}): SpaceAccessState {
  const viewer = params.viewer?.toLowerCase();
  const owner = params.space.creator.toLowerCase();

  if (params.space.visibility === "public") {
    return { status: "public", canDownload: true, reason: "This Space is public." };
  }

  if (!viewer) {
    return {
      status: "wallet_required",
      canDownload: false,
      reason: "Connect a wallet to unlock this Space.",
    };
  }

  if (viewer === owner) {
    return { status: "owner", canDownload: true, reason: "You own this Space." };
  }

  if (params.space.visibility === "paid" && params.hasPaid) {
    return { status: "paid", canDownload: true, reason: "Payment is verified for this wallet." };
  }

  if (
    params.space.visibility === "wallet_gated" &&
    (params.isAllowlisted ||
      (!params.trustExternalAccessState &&
        params.space.access.allowlist?.some((wallet) => wallet.toLowerCase() === viewer)))
  ) {
    return { status: "paid", canDownload: true, reason: "This wallet is on the allowlist." };
  }

  return {
    status: "locked",
    canDownload: false,
    reason:
      params.space.visibility === "paid"
        ? "Pay the creator to unlock downloads."
        : params.space.access.rule === "creator_only"
          ? "Only the creator can download this Space."
          : "This Space is allowlist-gated by its creator.",
  };
}
