import { Link } from "react-router-dom";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { AppHeader } from "../components/layout/AppHeader";
import { getCreatorSales, type CreatorSaleRecord } from "../lib/access/sales";
import { getSpace } from "../lib/spaces/local-store";
import { getTransactionExplorerUrl } from "../lib/utils/explorer";
import { formatDateTime, formatPaymentAmount, shortenAddress } from "../lib/utils/format";
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
  const spaces = useSpaces(address ? { creator: address, network: activeNetwork } : { network: activeNetwork });
  const [sales, setSales] = useState<CreatorSaleRecord[]>([]);
  const [storeMode, setStoreMode] = useState("registry");
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState("newest");
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (!address) {
      setSales([]);
      setError(null);
      setIsSyncing(false);
      return;
    }

    let cancelled = false;
    setIsSyncing(true);
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
      })
      .finally(() => {
        if (!cancelled) setIsSyncing(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeNetwork, address]);

  const spaceTitleById = useMemo(() => {
    const titles = new Map<string, string>();
    for (const space of spaces) titles.set(space.id, space.title);
    return titles;
  }, [spaces]);
  const resolveSpaceTitle = (sale: CreatorSaleRecord) =>
    sale.spaceTitle || spaceTitleById.get(sale.spaceId) || getSpace(sale.spaceId)?.title || "Paid Space";
  const revenueLabel = useMemo(() => {
    const byCurrency = new Map<string, number>();
    for (const sale of sales) {
      const currency = sale.currency || "APT";
      byCurrency.set(currency, (byCurrency.get(currency) || 0) + Number(sale.amountOctas || 0));
    }

    return [...byCurrency.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([currency, amount]) => formatPaymentAmount(amount, currency))
      .join(" + ") || "0 APT";
  }, [sales]);
  const buyers = useMemo(
    () => new Set(sales.map((sale) => sale.buyer.toLowerCase())).size,
    [sales],
  );
  const soldSpaces = useMemo(
    () => new Set(sales.map((sale) => sale.spaceId)).size,
    [sales],
  );
  const filteredSales = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const records = sales.filter((sale) => {
      if (!needle) return true;
      const title = resolveSpaceTitle(sale);

      return (
        title.toLowerCase().includes(needle) ||
        sale.spaceId.toLowerCase().includes(needle) ||
        sale.buyer.toLowerCase().includes(needle) ||
        String(sale.txHash ?? "").toLowerCase().includes(needle)
      );
    });

    return [...records].sort((a, b) => {
      if (sortMode === "highest") return Number(b.amountOctas || 0) - Number(a.amountOctas || 0);
      if (sortMode === "space") return resolveSpaceTitle(a).localeCompare(resolveSpaceTitle(b));
      return saleTimestamp(b) - saleTimestamp(a);
    });
  }, [query, sales, sortMode, spaceTitleById]);
  const revenueBySpace = useMemo(() => {
    const bySpace = new Map<
      string,
      {
        spaceId: string;
        title: string;
        currency: string;
        sales: number;
        revenueOctas: number;
        buyers: Set<string>;
      }
    >();

    for (const sale of sales) {
      const currency = sale.currency || "APT";
      const key = `${sale.spaceId}:${currency}`;
      const current =
        bySpace.get(key) ??
        {
          spaceId: sale.spaceId,
          title: resolveSpaceTitle(sale),
          currency,
          sales: 0,
          revenueOctas: 0,
          buyers: new Set<string>(),
        };

      current.sales += 1;
      current.revenueOctas += Number(sale.amountOctas || 0);
      current.buyers.add(sale.buyer.toLowerCase());
      bySpace.set(key, current);
    }

    return [...bySpace.values()].sort((a, b) => b.revenueOctas - a.revenueOctas);
  }, [sales, spaceTitleById]);
  const exportCsv = () => {
    const rows = [
      ["space_id", "title", "buyer", "amount", "currency", "paid_at", "tx_hash", "source"],
      ...filteredSales.map((sale) => {
        const space = getSpace(sale.spaceId);
        const paidAt = saleTimestamp(sale);

        return [
          sale.spaceId,
          sale.spaceTitle ?? spaceTitleById.get(sale.spaceId) ?? space?.title ?? "Paid Space",
          sale.buyer,
          String(sale.amountOctas / 100_000_000),
          sale.currency ?? "APT",
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
    anchor.download = `oria-sales-${activeNetwork}${query ? "-filtered" : ""}.csv`;
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
            <strong>{revenueLabel}</strong>
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

        {isSyncing && (
          <section className="sync-state-card" aria-label="Sales sync status">
            <span />
            <div>
              <strong>Syncing seller sales</strong>
              <p>Reading registry purchases and mirrored receipts from the active network.</p>
            </div>
          </section>
        )}

        {error && (
          <section className="payment-state-card failed">
            <div>
              <span className="tiny-label">Sales sync failed</span>
              <strong>Could not load seller sales.</strong>
              <p>{error}</p>
            </div>
          </section>
        )}

        {sales.length > 0 && (
          <section className="sales-controls" aria-label="Sales filters">
            <label>
              <span>Search sales</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Space, buyer, tx hash..."
              />
            </label>
            <label>
              <span>Sort</span>
              <select value={sortMode} onChange={(event) => setSortMode(event.target.value)}>
                <option value="newest">Newest</option>
                <option value="highest">Highest amount</option>
                <option value="space">Space title</option>
              </select>
            </label>
          </section>
        )}

        {revenueBySpace.length > 0 && (
          <section className="space-revenue-panel" aria-label="Revenue by Space">
            <div className="section-label">
              <p className="eyebrow">Revenue by Space</p>
              <h2>Top paid works.</h2>
            </div>
            <div className="space-revenue-list">
              {revenueBySpace.slice(0, 5).map((space) => (
                <Link key={`${space.spaceId}-${space.currency}`} to={`/spaces/${space.spaceId}`} className="space-revenue-row">
                  <div>
                    <strong>{space.title}</strong>
                    <span>
                      {space.sales} sale{space.sales === 1 ? "" : "s"} - {space.buyers.size} buyer
                      {space.buyers.size === 1 ? "" : "s"}
                    </span>
                  </div>
                  <b>{formatPaymentAmount(space.revenueOctas, space.currency)}</b>
                </Link>
              ))}
            </div>
          </section>
        )}

        {filteredSales.length > 0 ? (
          <section className="payment-list">
            {filteredSales.map((sale, index) => {
              const title = resolveSpaceTitle(sale);
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
                    <strong>{formatPaymentAmount(sale.amountOctas, sale.currency)}</strong>
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
            <h2>{sales.length > 0 ? "No sales match this filter." : "No sales yet."}</h2>
            {sales.length > 0 ? (
              <p>Try a different buyer wallet, Space title, or transaction hash.</p>
            ) : (
              <>
                <p>
                  When buyers unlock your paid Spaces, they will appear here with buyer wallet, amount,
                  and transaction details when mirrored.
                </p>
                <Link className="button primary" to="/create">
                  Publish paid Space
                </Link>
              </>
            )}
          </section>
        )}
      </main>
    </>
  );
}
