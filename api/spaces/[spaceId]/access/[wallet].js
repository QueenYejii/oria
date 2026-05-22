import { getAccess, handleOptions, sendJson } from "../../../_discovery.js";

export default async function handler(request, response) {
  if (handleOptions(request, response)) return;

  try {
    const { spaceId, wallet } = request.query;
    sendJson(response, 200, await getAccess(String(spaceId), String(wallet)));
  } catch (error) {
    sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) });
  }
}
