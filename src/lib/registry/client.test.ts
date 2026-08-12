import { afterEach, describe, expect, it, vi } from "vitest";
import { assertRegistryReady, getRegistryAccessOnChain } from "./client";

describe("registry deployment preflight", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("stops when the configured Move module is missing", async () => {
    vi.stubEnv("VITE_ORIA_REGISTRY_ADDRESS", "0xabc");
    vi.stubEnv("VITE_ORIA_REGISTRY_MODULE", "space_registry_v2");
    vi.stubEnv("VITE_ORIA_LEGACY_REGISTRY_MODULE", "");
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

  it("reads purchase and allowlist access from the Move view functions", async () => {
    vi.stubEnv("VITE_ORIA_REGISTRY_ADDRESS", "0xabc");
    vi.stubEnv("VITE_ORIA_REGISTRY_MODULE", "space_registry_v2");
    vi.stubEnv("VITE_ORIA_LEGACY_REGISTRY_MODULE", "");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([true]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([false]), { status: 200 }))
      .mockResolvedValue(new Response(JSON.stringify([false]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      getRegistryAccessOnChain({
        space: { id: "space_1", network: "shelbynet", registryModule: "space_registry_v2" },
        wallet: "0xdef",
      }),
    ).resolves.toEqual({ hasPurchased: true, isAllowlisted: false });

    const requestBodies = fetchMock.mock.calls.map(([, init]) => JSON.parse(String(init?.body)));
    expect(requestBodies.map((body) => body.function)).toContain(
      "0xabc::space_registry_v2::has_purchase",
    );
    expect(requestBodies.map((body) => body.function)).toContain(
      "0xabc::space_registry_v2::is_allowlisted",
    );
  });
});
