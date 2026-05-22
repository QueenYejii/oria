import { getRecord, handleOptions, sendJson } from "../_discovery.js";

export default async function handler(request, response) {
  if (handleOptions(request, response)) return;

  try {
    const { spaceId } = request.query;
    sendJson(response, 200, { space: await getRecord(String(spaceId)) });
  } catch (error) {
    sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) });
  }
}
