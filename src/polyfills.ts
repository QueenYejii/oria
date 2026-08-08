import { Buffer } from "buffer";

type BrowserGlobal = {
  process?: {
    env?: Record<string, string | undefined>;
  };
};

const browserGlobal = globalThis as unknown as BrowserGlobal;

globalThis.Buffer ??= Buffer;
browserGlobal.process ??= {};
browserGlobal.process.env ??= {};

const clayWasmPath = /(?:^|\/)clay\.wasm$/i;
const clayWasmMagic = [0x00, 0x61, 0x73, 0x6d];
const nativeFetch = globalThis.fetch?.bind(globalThis);

function isClayWasmRequest(input: RequestInfo | URL) {
  const rawUrl = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  const baseUrl =
    typeof globalThis.location === "object" && globalThis.location
      ? globalThis.location.href
      : "http://localhost/";

  return clayWasmPath.test(new URL(rawUrl, baseUrl).pathname);
}

if (nativeFetch && typeof document !== "undefined") {
  globalThis.fetch = async (input, init) => {
    const response = await nativeFetch(input, init);
    if (!isClayWasmRequest(input)) return response;

    try {
      const bytes = new Uint8Array(await response.clone().arrayBuffer());
      const isValidWasm = clayWasmMagic.every((byte, index) => bytes[index] === byte);
      if (isValidWasm) return response;
    } catch {
      // Fall through to the deterministic public asset.
    }

    return nativeFetch("/shelby/clay.wasm", init);
  };
}
