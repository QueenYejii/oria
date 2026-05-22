import { getHealthPayload, handleOptions, sendJson } from "./_discovery.js";

export default function handler(request, response) {
  if (handleOptions(request, response)) return;

  try {
    sendJson(response, 200, getHealthPayload());
  } catch (error) {
    sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) });
  }
}
