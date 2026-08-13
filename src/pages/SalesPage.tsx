import { Link } from "react-router-dom";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { ArrowUpRight, FileDown, RefreshCw, ReceiptText } from "lucide-react";
import { AppHeader } from "../components/layout/AppHeader";
import { getCreatorSales, getRevenueByCurrency, type CreatorSaleRecord, type CreatorSalesPayload } from "../lib/access/sales";
import { getSpace } from "../lib/spaces/local-store";
import { getTransactionExplorerUrl } from "../lib/utils/explorer";
import { formatDateTime, formatPaymentAmount, shortenAddress } from "../lib/utils/format";
import { getAccountAddress } from "../lib/wallet/address";
import { useActiveNetwork } from "../hooks/useActiveNetwork";
import { useSpaces } from "../hooks/useSpaces";
import { useEffect, useMemo, useState } from "react";

type SalesLoadState = "idle" | "loading" | "ready" | "unavailable" | "error";

function sourceLabel(payload: CreatorSalesPayload | null) {
  if (!payload) return "Not connected";
  if (payload.source === "registry_purchases_table_direct") return "Registry direct";
  if (payload.source === "registry_purchases_table_with_tx_scan") return "Registry + tx scan";
  return payload.receiptStore?.persistent ? "Registry + persistent mirror" : "Registry + receipt mirror";
}

function sourceDescription(payload: CreatorSalesPayload | null, state: SalesLoadState) {
  if (state === "idle") return "Connect the creator wallet to read paid unlocks for this account.";
  if (state === "loading") return "Reading the active registry and matching verified purchase receipts.";
  if (state === "unavailable") return "Revenue is not confirmed because no registry or Discovery API source is available.";
  if (state === "error") return "The seller source could not be read. Retry after the network or API is available.";
  if (payload?.source === "registry_purchases_table_direct") {
    return "Read-only fullnode data from the active registry. Amounts use the registered Space price.";
  }
  return "Registry buyers are combined with verified transaction and receipt data when available.";
}

function saleTimestamp(sale: CreatorSaleRecord) {
  if (sale.paidAt) return sale.paidAt;
  if (sale.updatedAtMicros) return Math.floor(Number(sale.updatedAtMicros) / 1000);
  return 0;
}

function fallbackSpaceLabel(spaceId: string) {
  return `Space ${spaceId.replace(/^space_/, "").slice(0, 8)}`;
}

export function SalesPage() {
  const wallet = useWallet();
  const address = getAccountAddress(wallet.account);
  const { activeNetwork } = useActiveNetwork();
  const spaces = useSpaces(address ? { creator: address, network: activeNetwork } : { network: activeNetwork });
  const [sales, setSales] = useState<CreatorSaleRecord[]>([]);
  const [payload, setPayload] = useState<CreatorSalesPayload | null>(null);
  const [storeMode, setStoreMode] = useState("registry");
  const [error, setError] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<SalesLoadState>("idle");
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState("newest");
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (!address) {
      setSales([]);
      setPayload(null);
      setError(null);
      setLoadState("idle");
      setLastSyncedAt(null);
      return;
    }

    let cancelled = false;
    setIsSyncing(true);
    setLoadState("loading");
    getCreatorSales(address, activeNetwork)
      .then((payload) => {
        if (cancelled) return;
        const nextSales = (payload?.sales ?? []).filter((sale) => sale.network === activeNetwork);
        setPayload(payload);
        setSales(nextSales);
        setStoreMode(sourceLabel(payload));
        setLoadState(payload ? "ready" : "unavailable");
        setLastSyncedAt(payload ? Date.now() : null);
        setError(payload ? null : "No registry or Discovery API source is configured for this environment.");
      })
      .catch((caught) => {
        if (cancelled) return;
        setPayload(null);
        setSales([]);
        setStoreMode("Unavailable");
        setLoadState("error");
        setError(caught instanceof Error ? caught.message : String(caught));
      })
      .finally(() => {
        if (!cancelled) setIsSyncing(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeNetwork, address, refreshNonce]);

  const spaceTitleById = useMemo(() => {
    const titles = new Map<string, string>();
    for (const space of spaces) titles.set(space.id, space.title);
    return titles;
  }, [spaces]);
  const resolveSpaceTitle = (sale: CreatorSaleRecord) =>
    sale.spaceTitle || spaceTitleById.get(sale.spaceId) || getSpace(sale.spaceId)?.title || fallbackSpaceLabel(sale.spaceId);
  const revenueLabel = useMemo(() => {
    return [...getRevenueByCurrency(sales).entries()]
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
          sale.spaceTitle ?? spaceTitleById.get(sale.spaceId) ?? space?.title ?? fallbackSpaceLabel(sale.spaceId),
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
  const metricsAvailable = loadState === "ready";
  const metric = (value: string | number) => (metricsAvailable ? value : "-");
  const retrySync = () => setRefreshNonce((value) => value + 1);

  return (
    <>
      <div className="grain" aria-hidden="true" />
      <AppHeader />
      <main className="collection-page sales-page">
        <section className="collection-heading">
          <p className="eyebrow">Seller dashboard</p>
          <h1>Creator sales ledger.</h1>
          <p>
            Track paid unlocks from registry purchases and mirrored receipts, with buyer, amount,
            timestamp, and transaction context in one place.
          </p>
        </section>

        <section className="market-stats sales-metrics" aria-label="Sales summary">
          <article>
            <span>Sales</span>
            <strong>{metric(sales.length)}</strong>
          </article>
          <article>
            <span>Revenue</span>
            <strong>{metric(revenueLabel)}</strong>
          </article>
          <article>
            <span>Buyers</span>
            <strong>{metric(buyers)}</strong>
          </article>
          <article>
            <span>Sold Spaces</span>
            <strong>{metric(soldSpaces)}</strong>
          </article>
        </section>

        <section className={`payment-state-card sales-source-card ${loadState}`} aria-label="Sales data source">
          <div className="sales-source-copy">
            <div className="sales-source-heading">
              <span className="tiny-label">Sales data source</span>
              <span className={`sales-status-dot ${loadState}`} aria-hidden="true" />
              <span className="sales-status-label">
                {loadState === "ready" ? "Synced" : loadState === "loading" ? "Syncing" : loadState === "idle" ? "Wallet required" : "Needs attention"}
              </span>
            </div>
            <strong>{address ? storeMode : "Connect creator wallet"}</strong>
            <p>{sourceDescription(payload, loadState)}</p>
            {lastSyncedAt && <time dateTime={new Date(lastSyncedAt).toISOString()}>Last checked {formatDateTime(lastSyncedAt)}</time>}
          </div>
          <div className="sales-actions">
            <button className="button secondary" type="button" disabled={!address || isSyncing} onClick={retrySync}>
              <RefreshCw size={15} aria-hidden="true" className={isSyncing ? "spin-icon" : undefined} />
              {isSyncing ? "Syncing" : "Refresh"}
            </button>
            <button className="button secondary" type="button" disabled={!metricsAvailable || sales.length === 0} onClick={exportCsv}>
              <FileDown size={15} aria-hidden="true" />
              Export CSV
            </button>
            <Link className="button secondary" to="/payments">
              <ReceiptText size={15} aria-hidden="true" />
              Buyer receipts
            </Link>
          </div>
        </section>

        {isSyncing && (
          <section className="sync-state-card" aria-label="Sales sync status">
            <span />
            <div>
              <strong>Syncing seller sales</strong>
              <p>Reading registry purchases and mirrored receipts from the active {activeNetwork} network.</p>
            </div>
          </section>
        )}

        {error && loadState !== "unavailable" && (
          <section className="payment-state-card failed">
            <div>
              <span className="tiny-label">Sales sync failed</span>
              <strong>Could not load seller sales.</strong>
              <p>{error}</p>
              <button className="button secondary" type="button" onClick={retrySync}>
                <RefreshCw size={15} aria-hidden="true" />
                Try again
              </button>
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
              <h2>Top paid Spaces.</h2>
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
                      <span>{sale.txHash ? "Receipt verified" : sale.isEstimated ? "Registry estimate" : "Registry verified"}</span>
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
                    <Link to={`/spaces/${sale.spaceId}`}>
                      Open Space <ArrowUpRight size={14} aria-hidden="true" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </section>
        ) : (
          <section className={`empty-state sales-empty-state ${loadState}`}>
            <span className="sales-empty-kicker">{loadState === "ready" ? "Seller ledger" : "Sales sync"}</span>
            <h2>
              {sales.length > 0
                ? "No sales match this filter."
                : loadState === "loading"
                  ? "Loading seller revenue."
                  : loadState === "error" || loadState === "unavailable"
                    ? "Sales data is unavailable."
                    : address
                      ? "No paid unlocks yet."
                      : "Connect a creator wallet."}
            </h2>
            {sales.length > 0 ? (
              <p>Try a different buyer wallet, Space title, or transaction hash.</p>
            ) : loadState === "loading" ? (
              <p>Oria is checking the active registry. Confirmed sales will appear here when the sync completes.</p>
            ) : loadState === "error" || loadState === "unavailable" ? (
              <>
                <p>{error ?? "Oria could not confirm seller revenue from the active registry."}</p>
                <button className="button primary" type="button" onClick={retrySync}>
                  <RefreshCw size={15} aria-hidden="true" />
                  Retry sync
                </button>
              </>
            ) : address ? (
              <>
                <p>
                  When buyers unlock your paid Spaces, they will appear here with buyer wallet, amount,
                  and transaction details when mirrored.
                </p>
                <Link className="button primary" to="/create">
                  Publish paid Space
                </Link>
              </>
            ) : (
              <p>Use the wallet control in the header to open the sales ledger for your published Spaces.</p>
            )}
          </section>
        )}
      </main>
    </>
  );
}
