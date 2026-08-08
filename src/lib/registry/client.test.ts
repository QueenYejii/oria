import { afterEach, describe, expect, it, vi } from "vitest";
import { assertRegistryReady } from "./client";

describe("registry deployment preflight", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("stops when the configured Move module is missing", async () => {
    vi.stubEnv("VITE_ORIA_REGISTRY_ADDRESS", "0xabc");
    vi.stubEnv("VITE_ORIA_REGISTRY_MODULE", "space_registry_v2");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("not found", { status: 404 })));

    await expect(assertRegistryReady("shelbynet")).rejects.toThrow("ORIA_REGISTRY_NOT_DEPLOYED");
  });

  it("stops when the Move module exists but Registry is not initialized", async () => {
    vi.stubEnv("VITE_ORIA_REGISTRY_ADDRESS", "0xabc");
    vi.stubEnv("VITE_ORIA_REGISTRY_MODULE", "space_registry_v2");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(new Response("module", { status: 200 }))
        .mockResolvedValueOnce(new Response("not found", { status: 404 })),
    );

    await expect(assertRegistryReady("shelbynet")).rejects.toThrow("ORIA_REGISTRY_NOT_INITIALIZED");
  });

  it("allows publishing when the module and Registry resource are available", async () => {
    vi.stubEnv("VITE_ORIA_REGISTRY_ADDRESS", "0xabc");
    vi.stubEnv("VITE_ORIA_REGISTRY_MODULE", "space_registry_v2");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(new Response("module", { status: 200 }))
        .mockResolvedValueOnce(new Response("resource", { status: 200 })),
    );

    await expect(assertRegistryReady("shelbynet")).resolves.toBeUndefined();
  });
});
