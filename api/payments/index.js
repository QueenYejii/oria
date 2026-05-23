import { handleOptions, listPaymentEvents, sendJson } from "../_discovery.js";

export default async function handler(request, response) {
  if (handleOptions(request, response)) return;

  try {
    const url = new URL(request.url || "/", `https://${request.headers.host || "oria.local"}`);
    const payload = await listPaymentEvents(url.searchParams);
    sendJson(response, 200, payload);
  } catch (error) {
    sendJson(response, 200, {
      payments: [],
      source: "indexer_unavailable",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
