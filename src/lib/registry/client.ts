import type { Space, SpaceAccessRule, SpacePaymentCurrency, SpaceVisibility } from "../../types/space";
import { hexToBytes } from "../utils/hash";

const APTOS_COIN = "0x1::aptos_coin::AptosCoin";
const DEFAULT_SHELBY_USD_METADATA =
  "0x1b18363a9f1fe5e6ebf247daba5cc1c18052bb232efdc4c50f556053922d98e1";
const paymentV2Enabled = import.meta.env.VITE_ORIA_PAYMENT_V2 === "1";
const shelbyUsdMetadata =
  (import.meta.env.VITE_SHELBY_USD_METADATA_ADDRESS as string | undefined) ||
  DEFAULT_SHELBY_USD_METADATA;

export type SignAndSubmitTransaction = (input: any) => Promise<{ hash: string }>;

export function getRegistryAddress() {
  return import.meta.env.VITE_ORIA_REGISTRY_ADDRESS as string | undefined;
}

export function getRegistryModuleName() {
  return (import.meta.env.VITE_ORIA_REGISTRY_MODULE as string | undefined) || "space_registry";
}

function getSpaceRegistryModule(space?: Pick<Space, "registryModule">) {
  return space?.registryModule || getRegistryModuleName();
}

function usesPaymentV2(moduleName: string) {
  return paymentV2Enabled && moduleName !== "space_registry";
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

export function isPaymentV2Enabled() {
  return paymentV2Enabled;
}

export function getShelbyUsdMetadataAddress() {
  return shelbyUsdMetadata;
}

export async function registerSpaceOnChain(params: {
  space: Space;
  signAndSubmitTransaction: SignAndSubmitTransaction;
}) {
  const registryAddress = getRegistryAddress();
  if (!registryAddress) return null;
  const registryModule = getSpaceRegistryModule(params.space);
  const isV2 = usesPaymentV2(registryModule);
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
      function: `${registryAddress}::${registryModule}::register_space`,
      functionArguments: isV2
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

export async function updateSpaceTermsOnChain(params: {
  space: Space;
  signAndSubmitTransaction: SignAndSubmitTransaction;
}) {
  const registryAddress = getRegistryAddress();
  const registryModule = getSpaceRegistryModule(params.space);
  if (!registryAddress || !usesPaymentV2(registryModule)) return null;

  const response = await params.signAndSubmitTransaction({
    data: {
      function: `${registryAddress}::${registryModule}::update_space_terms`,
      functionArguments: [
        registryAddress,
        params.space.id,
        visibilityToCode(params.space.visibility),
        accessRuleToCode(params.space.access.rule),
        params.space.payment?.priceOctas ?? 0,
        currencyToCode(params.space.payment?.currency),
        params.space.payment?.assetMetadataAddress ?? "0x0",
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
  const currency = params.space.payment?.currency ?? "APT";
  const registryModule = getSpaceRegistryModule(params.space);
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
    if (!usesPaymentV2(registryModule) || !metadataAddress) {
      throw new Error("ShelbyUSD payments require VITE_ORIA_PAYMENT_V2=1 and VITE_SHELBY_USD_METADATA_ADDRESS.");
    }

    const response = await params.signAndSubmitTransaction({
      data: {
        function: `${registryAddress}::${registryModule}::purchase_space_shelby_usd`,
        functionArguments: [registryAddress, params.space.id, metadataAddress],
      },
    });

    return response.hash;
  }

  const response = await params.signAndSubmitTransaction({
    data: {
      function: `${registryAddress}::${registryModule}::purchase_space`,
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
  const registryModule = getSpaceRegistryModule(params.space);

  const response = await params.signAndSubmitTransaction({
    data: {
      function: `${registryAddress}::${registryModule}::update_manifest`,
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

export async function updateCreatorProfileOnChain(params: {
  displayName: string;
  bio: string;
  avatar: string;
  links: string;
  signAndSubmitTransaction: SignAndSubmitTransaction;
}) {
  const registryAddress = getRegistryAddress();
  if (!registryAddress || !paymentV2Enabled) return null;

  const response = await params.signAndSubmitTransaction({
    data: {
      function: `${registryAddress}::${getRegistryModuleName()}::update_creator_profile`,
      functionArguments: [
        registryAddress,
        params.displayName,
        params.bio,
        params.avatar,
        params.links,
      ],
    },
  });

  return response.hash;
}

export function getPaymentAssetAddress(currency: SpacePaymentCurrency) {
  return currency === "SHELBY_USD" ? shelbyUsdMetadata : undefined;
}
