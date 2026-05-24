import type { Space, SpaceAccessRule, SpaceVisibility } from "../../types/space";
import { hexToBytes } from "../utils/hash";

const APTOS_COIN = "0x1::aptos_coin::AptosCoin";
const paymentV2Enabled = import.meta.env.VITE_ORIA_PAYMENT_V2 === "1";
const shelbyUsdMetadata = import.meta.env.VITE_SHELBY_USD_METADATA_ADDRESS as string | undefined;

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

function currencyToCode(currency?: string) {
  return currency === "SHELBY_USD" ? 1 : 0;
}

export async function registerSpaceOnChain(params: {
  space: Space;
  signAndSubmitTransaction: SignAndSubmitTransaction;
}) {
  const registryAddress = getRegistryAddress();
  if (!registryAddress) return null;
  const baseArguments = [
    registryAddress,
    params.space.id,
    params.space.network,
    params.space.manifestBlobName,
    Array.from(hexToBytes(params.space.manifestHash ?? "")),
    params.space.manifestVersion,
    visibilityToCode(params.space.visibility),
    accessRuleToCode(params.space.access.rule),
    params.space.payment?.priceOctas ?? 0,
  ];

  const response = await params.signAndSubmitTransaction({
    data: {
      function: `${registryAddress}::space_registry::register_space`,
      functionArguments: paymentV2Enabled
        ? [
            ...baseArguments,
            currencyToCode(params.space.payment?.currency),
            params.space.payment?.assetMetadataAddress ?? "0x0",
            params.space.access.allowlist ?? [],
          ]
        : [...baseArguments, params.space.access.allowlist ?? []],
    },
  });

  return response.hash;
}

export async function purchaseSpaceOnChain(params: {
  space: Space;
  signAndSubmitTransaction: SignAndSubmitTransaction;
}) {
  const registryAddress = getRegistryAddress();
  const currency = params.space.payment?.currency ?? "APT";
  if (!registryAddress) {
    if (currency !== "APT") {
      throw new Error("ShelbyUSD unlocks require the Oria payment registry contract.");
    }

    const response = await params.signAndSubmitTransaction({
      data: {
        function: "0x1::coin::transfer",
        typeArguments: [APTOS_COIN],
        functionArguments: [params.space.payment?.recipient, params.space.payment?.priceOctas],
      },
    });

    return response.hash;
  }

  if (currency === "SHELBY_USD") {
    const metadataAddress = params.space.payment?.assetMetadataAddress || shelbyUsdMetadata;
    if (!paymentV2Enabled || !metadataAddress) {
      throw new Error("ShelbyUSD payments require VITE_ORIA_PAYMENT_V2=1 and VITE_SHELBY_USD_METADATA_ADDRESS.");
    }

    const response = await params.signAndSubmitTransaction({
      data: {
        function: `${registryAddress}::space_registry::purchase_space_shelby_usd`,
        functionArguments: [registryAddress, params.space.id, metadataAddress],
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

export async function updateSpaceManifestOnChain(params: {
  space: Space;
  signAndSubmitTransaction: SignAndSubmitTransaction;
}) {
  const registryAddress = getRegistryAddress();
  if (!registryAddress || !params.space.manifestBlobName || !params.space.manifestHash) return null;

  const response = await params.signAndSubmitTransaction({
    data: {
      function: `${registryAddress}::space_registry::update_manifest`,
      functionArguments: [
        registryAddress,
        params.space.id,
        params.space.manifestBlobName,
        Array.from(hexToBytes(params.space.manifestHash)),
        params.space.manifestVersion,
      ],
    },
  });

  return response.hash;
}
