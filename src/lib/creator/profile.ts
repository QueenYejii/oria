import { getDiscoveryApiUrl } from "../discovery/client";

export type CreatorProfileLinks = {
  website?: string;
  github?: string;
  twitter?: string;
  telegram?: string;
};

export type CreatorProfile = {
  address: string;
  displayName: string;
  bio: string;
  avatar: string;
  links: CreatorProfileLinks;
  updatedAt: number;
  source: "local" | "registry" | "merged";
};

const STORAGE_KEY = "oria:creator-profiles:v1";
const STORAGE_EVENT = "oria-creator-profile-updated";

function normalizeAddress(address: string) {
  return address.trim().toLowerCase();
}

function readProfiles(): Record<string, CreatorProfile> {
  if (typeof window === "undefined") return {};

  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

function parseLinks(value: unknown): CreatorProfileLinks {
  if (!value || typeof value !== "string") return {};

  try {
    const parsed = JSON.parse(value);
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

export function encodeCreatorProfileLinks(links: CreatorProfileLinks) {
  return JSON.stringify({
    website: links.website?.trim() || "",
    github: links.github?.trim() || "",
    twitter: links.twitter?.trim() || "",
    telegram: links.telegram?.trim() || "",
  });
}

export function getLocalCreatorProfile(address?: string | null) {
  if (!address) return null;
  return readProfiles()[normalizeAddress(address)] ?? null;
}

export function saveLocalCreatorProfile(profile: CreatorProfile) {
  if (typeof window === "undefined") return;

  const profiles = readProfiles();
  profiles[normalizeAddress(profile.address)] = profile;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

export function subscribeToCreatorProfiles(callback: () => void) {
  window.addEventListener(STORAGE_EVENT, callback);
  window.addEventListener("storage", callback);

  return () => {
    window.removeEventListener(STORAGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export async function fetchCreatorProfile(address: string) {
  const baseUrl = getDiscoveryApiUrl();
  if (!baseUrl) return null;

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/creators/${encodeURIComponent(address)}`);
  if (!response.ok) throw new Error(`Creator profile returned ${response.status}.`);

  const payload = (await response.json()) as {
    profile?: {
      address?: string;
      creator?: string;
      displayName?: string;
      display_name?: string;
      bio?: string;
      avatar?: string;
      avatarBlobName?: string;
      avatar_blob_name?: string;
      links?: CreatorProfileLinks;
      linksBlobName?: string;
      links_blob_name?: string;
      updatedAt?: number;
      updated_at_micros?: string | number;
    } | null;
  };
  const profile = payload.profile;
  if (!profile) return null;

  const updatedAtMicros = Number(profile.updated_at_micros || 0);

  return {
    address: profile.address || profile.creator || address,
    displayName: profile.displayName || profile.display_name || "",
    bio: profile.bio || "",
    avatar: profile.avatar || profile.avatarBlobName || profile.avatar_blob_name || "",
    links: profile.links || parseLinks(profile.linksBlobName || profile.links_blob_name),
    updatedAt: profile.updatedAt || (updatedAtMicros > 0 ? Math.floor(updatedAtMicros / 1000) : Date.now()),
    source: "registry" as const,
  };
}

export function mergeCreatorProfiles(
  registryProfile: CreatorProfile | null,
  localProfile: CreatorProfile | null,
): CreatorProfile | null {
  if (!registryProfile) return localProfile;
  if (!localProfile) return registryProfile;

  if (localProfile.updatedAt >= registryProfile.updatedAt) {
    return { ...registryProfile, ...localProfile, source: "merged" };
  }

  return { ...localProfile, ...registryProfile, source: "merged" };
}
