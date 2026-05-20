import { spaceSchema } from "./schema";
import type { OriaNetwork } from "../../types/network";
import type { Space } from "../../types/space";

const STORAGE_KEY = "oria:spaces:v1";
const STORAGE_EVENT = "oria-spaces-updated";

function readRawSpaces() {
  if (typeof window === "undefined") return [];

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function listSpaces(): Space[] {
  return readRawSpaces()
    .map((space) => spaceSchema.safeParse(space))
    .filter((result) => result.success)
    .map((result) => result.data)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function getSpace(spaceId: string) {
  return listSpaces().find((space) => space.id === spaceId) ?? null;
}

export function listSpacesByOwner(params: { creator?: string; network?: OriaNetwork }) {
  return listSpaces().filter((space) => {
    const ownerMatches =
      !params.creator || space.creator.toLowerCase() === params.creator.toLowerCase();
    const networkMatches = !params.network || space.network === params.network;

    return ownerMatches && networkMatches;
  });
}

export function saveSpace(space: Space) {
  const spaces = listSpaces();
  const nextSpaces = [space, ...spaces.filter((item) => item.id !== space.id)];
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSpaces));
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

export function deleteSpace(spaceId: string) {
  const nextSpaces = listSpaces().filter((space) => space.id !== spaceId);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSpaces));
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

export function subscribeToSpaces(callback: () => void) {
  window.addEventListener(STORAGE_EVENT, callback);
  window.addEventListener("storage", callback);

  return () => {
    window.removeEventListener(STORAGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
