import { handleOptions, listCreatorSales, sendJson } from "../../_discovery.js";
import { getReceiptStoreStatus, listReceipts } from "../../_receipts.js";

function receiptToSale(receipt) {
  return {
    spaceId: receipt.spaceId,
    creator: receipt.creator,
    network: receipt.network,
    manifestBlobName: receipt.manifestBlobName || "",
    buyer: receipt.payer || receipt.buyer,
    amountOctas: Number(receipt.amountOctas || 0),
    currency: receipt.currency || "APT",
    updatedAtMicros: Number(receipt.paidAt || 0) * 1000,
    paidAt: Number(receipt.paidAt || 0),
    txHash: receipt.txHash,
    transactionVersion: receipt.transactionVersion,
    spaceTitle: receipt.spaceTitle,
    source: "receipt_mirror",
  };
}

function mergeSales(registrySales, receiptSales) {
  const byKey = new Map();

  for (const sale of [...registrySales, ...receiptSales]) {
    const key = `${sale.network}:${sale.spaceId}:${String(sale.buyer).toLowerCase()}`;
    const existing = byKey.get(key);
    const existingTitle = existing?.spaceTitle;
    const saleTitle = sale.spaceTitle;
    const title =
      saleTitle && saleTitle !== "Paid Space"
        ? saleTitle
        : existingTitle && existingTitle !== "Paid Space"
          ? existingTitle
          : saleTitle || existingTitle;

    byKey.set(key, {
      ...existing,
      ...sale,
      amountOctas: Number(sale.amountOctas || 0) > 0 ? sale.amountOctas : existing?.amountOctas,
      currency: sale.currency ?? existing?.currency ?? "APT",
      txHash: sale.txHash ?? existing?.txHash,
      paidAt: sale.paidAt ?? existing?.paidAt,
      transactionVersion: sale.transactionVersion ?? existing?.transactionVersion,
      spaceTitle: title,
      source: sale.source ?? existing?.source ?? "registry_purchases_table",
    });
  }

  return [...byKey.values()].sort((a, b) => Number(b.paidAt || b.updatedAtMicros || 0) - Number(a.paidAt || a.updatedAtMicros || 0));
}

export default async function handler(request, response) {
  if (handleOptions(request, response)) return;

  try {
    const { address } = request.query;
    const url = new URL(request.url || "/", `https://${request.headers.host || "oria.local"}`);
    const registryPayload = await listCreatorSales(String(address), url.searchParams);
    const receiptSales = (await listReceipts({
      creator: String(address),
      network: url.searchParams.get("network"),
    })).map(receiptToSale);
    const sales = mergeSales(registryPayload.sales, receiptSales);

    sendJson(response, 200, {
      ...registryPayload,
      sales,
      summary: {
        ...registryPayload.summary,
        sales: sales.length,
        estimatedRevenueOctas: sales.reduce((sum, sale) => sum + Number(sale.amountOctas || 0), 0),
      },
      receiptStore: getReceiptStoreStatus(),
    });
  } catch (error) {
    sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) });
  }
}
