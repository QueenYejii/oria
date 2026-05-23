import { handleOptions, listRecordsPage, renderSpacesHtml, sendHtml, sendJson, wantsHtml } from "../_discovery.js";

export default async function handler(request, response) {
  if (handleOptions(request, response)) return;

  try {
    const url = new URL(request.url || "/", `https://${request.headers.host || "oria.local"}`);
    const page = await listRecordsPage(url.searchParams);
    const spaces = page.records;

    if (wantsHtml(request, url)) {
      sendHtml(response, 200, renderSpacesHtml(spaces, url));
      return;
    }

    sendJson(response, 200, { spaces, pagination: page.pagination, cache: page.cache });
  } catch (error) {
    sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) });
  }
}
