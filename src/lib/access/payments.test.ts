import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getLocalPayment, saveLocalPayment, type LocalPaymentRecord } from "./payments";

const storage = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
};

const payment: LocalPaymentRecord = {
  spaceId: "space_1",
  network: "shelbynet",
  payer: "0xAbC",
  creator: "0xCreator",
  txHash: "0xtx1",
  paidAt: 100,
  chainStatus: "verified",
};

describe("local payment access records", () => {
  beforeEach(() => {
    storage.clear();
    vi.stubGlobal("window", {
      localStorage: localStorageMock,
      dispatchEvent: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rehydrates a payment for the exact Space, network, and payer", () => {
    saveLocalPayment(payment);

    expect(
      getLocalPayment({ spaceId: "space_1", network: "shelbynet", payer: "0xabc" }),
    ).toMatchObject(payment);
    expect(
      getLocalPayment({ spaceId: "space_2", network: "shelbynet", payer: "0xabc" }),
    ).toBeNull();
    expect(
      getLocalPayment({ spaceId: "space_1", network: "testnet", payer: "0xabc" }),
    ).toBeNull();
    expect(
      getLocalPayment({ spaceId: "space_1", network: "shelbynet", payer: "0xdef" }),
    ).toBeNull();
  });
});
