import { handleOptions, listCreatorSales, sendJson } from "../../_discovery.js";

export default async function handler(request, response) {
  if (handleOptions(request, response)) return;

  try {
    const { address } = request.query;
    const url = new URL(request.url || "/", `https://${request.headers.host || "oria.local"}`);
    sendJson(response, 200, await listCreatorSales(String(address), url.searchParams));
  } catch (error) {
    sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) });
  }
}
