import { describe, expect, it } from "vitest";
import {
  getRevenueByCurrency,
  mergeCreatorSales,
  mergeCreatorSalesPayload,
  type CreatorSaleRecord,
} from "./sales";

function sale(overrides: Partial<CreatorSaleRecord> = {}): CreatorSaleRecord {
  return {
    spaceId: "space_paid",
    creator: "0xCreator",
    network: "shelbynet",
    manifestBlobName: "manifest.json",
    buyer: "0xBuyer",
    amountOctas: 250_000_000,
    currency: "APT",
    updatedAtMicros: 100,
    ...overrides,
  };
}

describe("creator sales aggregation", () => {
  it("deduplicates a registry sale and its verified receipt mirror", () => {
    const merged = mergeCreatorSales([
      sale({ source: "registry_purchases_table_direct", isEstimated: true }),
      sale({
        source: "receipt_mirror",
        txHash: "0xpurchase",
        paidAt: 200,
        spaceTitle: "Release Room",
        isEstimated: false,
      }),
    ]);

    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({
      amountOctas: 250_000_000,
      txHash: "0xpurchase",
      spaceTitle: "Release Room",
      isEstimated: false,
      source: "receipt_mirror",
    });
  });

  it("keeps revenue totals separate for APT and ShelbyUSD", () => {
    const totals = getRevenueByCurrency([
      sale(),
      sale({ spaceId: "space_usd", currency: "SHELBY_USD", amountOctas: 400_000_000 }),
    ]);

    expect(totals.get("APT")).toBe(250_000_000);
    expect(totals.get("SHELBY_USD")).toBe(400_000_000);
  });

  it("uses direct registry sales when the API payload is empty", () => {
    const payload = mergeCreatorSalesPayload(
      {
        creator: "0xCreator",
        spaces: [],
        sales: [],
        summary: { paidSpaces: 0, sales: 0, estimatedRevenueOctas: 0 },
        source: "registry_purchases_table",
      },
      {
        creator: "0xCreator",
        spaces: [],
        sales: [sale({ source: "registry_purchases_table_direct", isEstimated: true })],
        summary: { paidSpaces: 1, sales: 1, estimatedRevenueOctas: 250_000_000 },
        source: "registry_purchases_table_direct",
      },
    );

    expect(payload?.sales).toHaveLength(1);
    expect(payload?.summary).toMatchObject({ sales: 1, estimatedRevenueOctas: 250_000_000 });
    expect(payload?.source).toBe("registry_purchases_table_direct");
  });
});
