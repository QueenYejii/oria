import { useEffect, useState } from "react";
import { importRegistrySpace, importRegistrySpaces } from "../lib/discovery/import";
import { getSpace, listSpaces, listSpacesByOwner, subscribeToSpaces } from "../lib/spaces/local-store";
import type { OriaNetwork } from "../types/network";

export function useSpaces(params: { network?: OriaNetwork; creator?: string; q?: string } = {}) {
  const [spaces, setSpaces] = useState(() => listSpaces());

  useEffect(() => subscribeToSpaces(() => setSpaces(listSpaces())), []);

  useEffect(() => {
    let cancelled = false;

    importRegistrySpaces(params)
      .then(() => {
        if (!cancelled) setSpaces(listSpaces());
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [params.creator, params.network, params.q]);

  return spaces;
}

export function useSpace(spaceId: string | undefined) {
  const [space, setSpace] = useState(() => (spaceId ? getSpace(spaceId) : null));

  useEffect(() => {
    const update = () => setSpace(spaceId ? getSpace(spaceId) : null);
    update();

    return subscribeToSpaces(update);
  }, [spaceId]);

  useEffect(() => {
    if (!spaceId || space) return;

    let cancelled = false;

    importRegistrySpace(spaceId)
      .then((imported) => {
        if (!cancelled && imported) setSpace(imported);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [space, spaceId]);

  return space;
}

export function useOwnerSpaces(params: { creator?: string; network?: OriaNetwork }) {
  const [spaces, setSpaces] = useState(() => listSpacesByOwner(params));

  useEffect(() => {
    const update = () => setSpaces(listSpacesByOwner(params));
    update();

    return subscribeToSpaces(update);
  }, [params.creator, params.network]);

  return spaces;
}
