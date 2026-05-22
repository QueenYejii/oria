import { handleOptions, listRecords, sendJson } from "../_discovery.js";

export default async function handler(request, response) {
  if (handleOptions(request, response)) return;

  try {
    const { address } = request.query;
    const url = new URL(request.url || "/", `https://${request.headers.host || "oria.local"}`);
    url.searchParams.set("creator", String(address));
    sendJson(response, 200, {
      creator: String(address),
      spaces: await listRecords(url.searchParams),
    });
  } catch (error) {
    sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) });
  }
}
