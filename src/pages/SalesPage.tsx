import { Link } from "react-router-dom";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { AppHeader } from "../components/layout/AppHeader";
import { getCreatorSales, type CreatorSaleRecord } from "../lib/access/sales";
import { getSpace } from "../lib/spaces/local-store";
import { getTransactionExplorerUrl } from "../lib/utils/explorer";
import { formatDateTime, shortenAddress } from "../lib/utils/format";
import { getAccountAddress } from "../lib/wallet/address";
import { useActiveNetwork } from "../hooks/useActiveNetwork";
import { useSpaces } from "../hooks/useSpaces";
import { useEffect, useMemo, useState } from "react";

function saleTimestamp(sale: CreatorSaleRecord) {
  if (sale.paidAt) return sale.paidAt;
  if (sale.updatedAtMicros) return Math.floor(Number(sale.updatedAtMicros) / 1000);
  return 0;
}

export function SalesPage() {
  const wallet = useWallet();
  const address = getAccountAddress(wallet.account);
  const { activeNetwork } = useActiveNetwork();
  useSpaces(address ? { creator: address, network: activeNetwork } : { network: activeNetwork });
  const [sales, setSales] = useState<CreatorSaleRecord[]>([]);
  const [storeMode, setStoreMode] = useState("registry");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) {
      setSales([]);
      setError(null);
      return;
    }

    let cancelled = false;
    getCreatorSales(address)
      .then((payload) => {
        if (cancelled) return;
        setSales((payload?.sales ?? []).filter((sale) => sale.network === activeNetwork));
        setStoreMode(payload?.receiptStore?.persistent ? "Persistent mirror" : "Registry + local mirror");
        setError(null);
      })
      .catch((caught) => {
        if (cancelled) return;
        setSales([]);
        setError(caught instanceof Error ? caught.message : String(caught));
      });

    return () => {
      cancelled = true;
    };
  }, [activeNetwork, address]);

  const revenueApt = useMemo(
    () => sales.reduce((sum, sale) => sum + Number(sale.amountOctas || 0), 0) / 100_000_000,
    [sales],
  );
  const buyers = useMemo(
    () => new Set(sales.map((sale) => sale.buyer.toLowerCase())).size,
    [sales],
  );
  const soldSpaces = useMemo(
    () => new Set(sales.map((sale) => sale.spaceId)).size,
    [sales],
  );
  const exportCsv = () => {
    const rows = [
      ["space_id", "title", "buyer", "amount_apt", "paid_at", "tx_hash", "source"],
      ...sales.map((sale) => {
        const space = getSpace(sale.spaceId);
        const paidAt = saleTimestamp(sale);

        return [
          sale.spaceId,
          sale.spaceTitle ?? space?.title ?? "Paid Space",
          sale.buyer,
          String(sale.amountOctas / 100_000_000),
          paidAt ? new Date(paidAt).toISOString() : "",
          sale.txHash ?? "",
          sale.source ?? "registry_purchases_table",
        ];
      }),
    ];
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `oria-sales-${activeNetwork}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="grain" aria-hidden="true" />
      <AppHeader />
      <main className="collection-page sales-page">
        <section className="collection-heading">
          <p className="eyebrow">Seller dashboard</p>
          <h1>Sales you can actually see.</h1>
          <p>
            Track paid unlocks for your Spaces from registry purchases and mirrored receipts. This
            gives creators a clear view after buyer payments settle into their wallet.
          </p>
        </section>

        <section className="market-stats" aria-label="Sales summary">
          <article>
            <span>Sales</span>
            <strong>{sales.length}</strong>
          </article>
          <article>
            <span>Revenue</span>
            <strong>{revenueApt.toLocaleString()} APT</strong>
          </article>
          <article>
            <span>Buyers</span>
            <strong>{buyers}</strong>
          </article>
          <article>
            <span>Sold Spaces</span>
            <strong>{soldSpaces}</strong>
          </article>
        </section>

        <section className="payment-state-card">
          <div>
            <span className="tiny-label">Receipt source</span>
            <strong>{storeMode}</strong>
            <p>
              Tx hash and exact timestamp appear when the buyer receipt mirror is available. Registry
              purchases still verify buyer access even without Shelbynet event indexing.
            </p>
          </div>
          <div className="sales-actions">
            <button className="button secondary" type="button" disabled={sales.length === 0} onClick={exportCsv}>
              Export CSV
            </button>
            <Link className="button secondary" to="/payments">
              Buyer receipts
            </Link>
          </div>
        </section>

        {error && (
          <section className="payment-state-card failed">
            <div>
              <span className="tiny-label">Sales sync failed</span>
              <strong>Could not load seller sales.</strong>
              <p>{error}</p>
            </div>
          </section>
        )}

        {sales.length > 0 ? (
          <section className="payment-list">
            {sales.map((sale, index) => {
              const space = getSpace(sale.spaceId);
              const title = sale.spaceTitle ?? space?.title ?? "Paid Space";
              const paidAt = saleTimestamp(sale);

              return (
                <article key={`${sale.spaceId}-${sale.buyer}-${sale.txHash ?? index}`} className="payment-row premium sale-row">
                  <div>
                    <div className="payment-badges">
                      <span className="network-badge stable">{sale.network}</span>
                      <span>{sale.txHash ? "Receipt mirrored" : "Registry verified"}</span>
                    </div>
                    <h2>{title}</h2>
                    <p>Buyer {shortenAddress(sale.buyer)}</p>
                    <code>{sale.txHash ?? sale.spaceId}</code>
                  </div>
                  <div>
                    <strong>{(sale.amountOctas / 100_000_000).toLocaleString()} APT</strong>
                    <span>{paidAt ? formatDateTime(paidAt) : "Timestamp pending"}</span>
                    {sale.txHash ? (
                      <a href={getTransactionExplorerUrl(sale.txHash, sale.network)} target="_blank" rel="noreferrer">
                        Explorer tx
                      </a>
                    ) : (
                      <span>Tx hash pending</span>
                    )}
                    <Link to={`/spaces/${sale.spaceId}`}>Open Space</Link>
                  </div>
                </article>
              );
            })}
          </section>
        ) : (
          <section className="empty-state">
            <h2>No sales yet.</h2>
            <p>
              When buyers unlock your paid Spaces, they will appear here with buyer wallet, amount,
              and transaction details when mirrored.
            </p>
            <Link className="button primary" to="/create">
              Publish paid Space
            </Link>
          </section>
        )}
      </main>
    </>
  );
}
