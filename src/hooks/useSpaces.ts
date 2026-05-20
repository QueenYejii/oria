import { useEffect, useState } from "react";
import { getSpace, listSpaces, listSpacesByOwner, subscribeToSpaces } from "../lib/spaces/local-store";
import type { OriaNetwork } from "../types/network";

export function useSpaces() {
  const [spaces, setSpaces] = useState(() => listSpaces());

  useEffect(() => subscribeToSpaces(() => setSpaces(listSpaces())), []);

  return spaces;
}

export function useSpace(spaceId: string | undefined) {
  const [space, setSpace] = useState(() => (spaceId ? getSpace(spaceId) : null));

  useEffect(() => {
    const update = () => setSpace(spaceId ? getSpace(spaceId) : null);
    update();

    return subscribeToSpaces(update);
  }, [spaceId]);

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
