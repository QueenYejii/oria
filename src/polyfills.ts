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
