import { Network } from "@aptos-labs/ts-sdk";
import { describe, expect, it } from "vitest";
import { getWalletNetworkLabel, isWalletNetworkCompatible } from "./address";

describe("wallet network compatibility", () => {
  it("accepts direct Shelbynet wallet reports", () => {
    expect(
      isWalletNetworkCompatible({
        expectedNetwork: Network.SHELBYNET,
        walletNetwork: { name: Network.SHELBYNET, chainId: 113 },
      })
    ).toBe(true);
  });

  it("accepts Petra custom reports for Shelbynet", () => {
    expect(
      isWalletNetworkCompatible({
        expectedNetwork: Network.SHELBYNET,
        walletNetwork: { name: Network.CUSTOM, chainId: 113 },
      })
    ).toBe(true);

    expect(getWalletNetworkLabel({ name: Network.CUSTOM, chainId: 113 })).toBe("Shelbynet");
  });

  it("rejects custom networks when the active network is not Shelbynet", () => {
    expect(
      isWalletNetworkCompatible({
        expectedNetwork: Network.TESTNET,
        walletNetwork: { name: Network.CUSTOM, chainId: 113 },
      })
    ).toBe(false);
  });
});
