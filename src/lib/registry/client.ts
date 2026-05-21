import type { Space, SpaceAccessRule, SpaceVisibility } from "../../types/space";
import { hexToBytes } from "../utils/hash";

const APTOS_COIN = "0x1::aptos_coin::AptosCoin";

export type SignAndSubmitTransaction = (input: any) => Promise<{ hash: string }>;

export function getRegistryAddress() {
  return import.meta.env.VITE_ORIA_REGISTRY_ADDRESS as string | undefined;
}

export function hasRegistryConfig() {
  return Boolean(getRegistryAddress());
}

function visibilityToCode(visibility: SpaceVisibility) {
  if (visibility === "wallet_gated") return 1;
  if (visibility === "paid") return 2;
  return 0;
}

function accessRuleToCode(rule: SpaceAccessRule) {
  if (rule === "allowlist") return 1;
  if (rule === "creator_only") return 2;
  if (rule === "paid") return 3;
  return 0;
}

export async function registerSpaceOnChain(params: {
  space: Space;
  signAndSubmitTransaction: SignAndSubmitTransaction;
}) {
  const registryAddress = getRegistryAddress();
  if (!registryAddress) return null;

  const response = await params.signAndSubmitTransaction({
    data: {
      function: `${registryAddress}::space_registry::register_space`,
      functionArguments: [
        registryAddress,
        params.space.id,
        params.space.network,
        params.space.manifestBlobName,
        Array.from(hexToBytes(params.space.manifestHash ?? "")),
        params.space.manifestVersion,
        visibilityToCode(params.space.visibility),
        accessRuleToCode(params.space.access.rule),
        params.space.payment?.priceOctas ?? 0,
        params.space.access.allowlist ?? [],
      ],
    },
  });

  return response.hash;
}

export async function purchaseSpaceOnChain(params: {
  space: Space;
  signAndSubmitTransaction: SignAndSubmitTransaction;
}) {
  const registryAddress = getRegistryAddress();
  if (!registryAddress) {
    const response = await params.signAndSubmitTransaction({
      data: {
        function: "0x1::coin::transfer",
        typeArguments: [APTOS_COIN],
        functionArguments: [params.space.payment?.recipient, params.space.payment?.priceOctas],
      },
    });

    return response.hash;
  }

  const response = await params.signAndSubmitTransaction({
    data: {
      function: `${registryAddress}::space_registry::purchase_space`,
      functionArguments: [registryAddress, params.space.id],
    },
  });

  return response.hash;
}
