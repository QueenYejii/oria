import { getReceiptStoreStatus, listReceipts, saveReceipt } from "../_receipts.js";
import { sendJson } from "../_discovery.js";

function handleReceiptOptions(request, response) {
  response.setHeader("access-control-allow-origin", process.env.CORS_ORIGIN || "*");
  response.setHeader("access-control-allow-methods", "GET,POST,OPTIONS");
  response.setHeader("access-control-allow-headers", "content-type");

  if (request.method === "OPTIONS") {
    response.status(204).end();
    return true;
  }

  if (request.method !== "GET" && request.method !== "POST") {
    sendJson(response, 405, { error: "Method not allowed" });
    return true;
  }

  return false;
}

function readBody(request) {
  if (typeof request.body === "string") return JSON.parse(request.body || "{}");
  return request.body || {};
}

export default async function handler(request, response) {
  if (handleReceiptOptions(request, response)) return;

  try {
    if (request.method === "POST") {
      const receipt = await saveReceipt(readBody(request));
      sendJson(response, 201, { receipt, store: getReceiptStoreStatus() });
      return;
    }

    const url = new URL(request.url || "/", `https://${request.headers.host || "oria.local"}`);
    const receipts = await listReceipts({
      creator: url.searchParams.get("creator"),
      payer: url.searchParams.get("payer"),
      spaceId: url.searchParams.get("spaceId"),
      network: url.searchParams.get("network"),
    });
    sendJson(response, 200, { receipts, store: getReceiptStoreStatus() });
  } catch (error) {
    sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) });
  }
}
