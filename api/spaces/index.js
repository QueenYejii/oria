import { handleOptions, listRecords, renderSpacesHtml, sendHtml, sendJson, wantsHtml } from "../_discovery.js";

export default async function handler(request, response) {
  if (handleOptions(request, response)) return;

  try {
    const url = new URL(request.url || "/", `https://${request.headers.host || "oria.local"}`);
    const spaces = await listRecords(url.searchParams);

    if (wantsHtml(request, url)) {
      sendHtml(response, 200, renderSpacesHtml(spaces, url));
      return;
    }

    sendJson(response, 200, { spaces });
  } catch (error) {
    sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) });
  }
}
