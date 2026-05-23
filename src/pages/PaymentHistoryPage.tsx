import { Link } from "react-router-dom";
import { AppHeader } from "../components/layout/AppHeader";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { listChainPayments } from "../lib/access/payment-events";
import { listLocalPayments, listMirroredReceipts, subscribeToPayments, type LocalPaymentRecord } from "../lib/access/payments";
import { getCreatorSales, type CreatorSaleRecord } from "../lib/access/sales";
import { getSpace } from "../lib/spaces/local-store";
import { getTransactionExplorerUrl } from "../lib/utils/explorer";
import { formatDateTime, shortenAddress } from "../lib/utils/format";
import { getAccountAddress } from "../lib/wallet/address";
import { useActiveNetwork } from "../hooks/useActiveNetwork";
import { useSpaces } from "../hooks/useSpaces";
import { useEffect, useMemo, useState } from "react";

function amountLabel(record: LocalPaymentRecord) {
  const space = getSpace(record.spaceId);
  const octas = record.amountOctas ?? space?.payment?.priceOctas;
  return typeof octas === "number" && octas > 0 ? `${(octas / 100_000_000).toLocaleString()} APT` : "Verified";
}

function mergePayments(localRecords: LocalPaymentRecord[], chainRecords: LocalPaymentRecord[]) {
  const byKey = new Map<string, LocalPaymentRecord>();

  for (const record of [...chainRecords, ...localRecords]) {
    const key = `${record.network}:${record.spaceId}:${record.payer.toLowerCase()}:${record.txHash}`;
    const existing = byKey.get(key);
    byKey.set(key, {
      ...record,
      ...existing,
      spaceTitle: existing?.spaceTitle ?? record.spaceTitle,
      amountOctas: existing?.amountOctas ?? record.amountOctas,
      chainStatus: existing?.chainStatus ?? record.chainStatus,
      source: existing?.source ?? record.source,
    });
  }

  return [...byKey.values()].sort((a, b) => b.paidAt - a.paidAt);
}

export function PaymentHistoryPage() {
  const wallet = useWallet();
  const { activeNetwork } = useActiveNetwork();
  const address = getAccountAddress(wallet.account);
  useSpaces(address ? { creator: address, network: activeNetwork } : { network: activeNetwork });
  const [localRecords, setLocalRecords] = useState(() => listLocalPayments());
  const [chainRecords, setChainRecords] = useState<LocalPaymentRecord[]>([]);
  const [mirroredRecords, setMirroredRecords] = useState<LocalPaymentRecord[]>([]);
  const [sales, setSales] = useState<CreatorSaleRecord[]>([]);
  const [salesError, setSalesError] = useState<string | null>(null);
  const [chainSource, setChainSource] = useState("local");
  const [chainError, setChainError] = useState<string | null>(null);

  useEffect(() => subscribeToPayments(() => setLocalRecords(listLocalPayments())), []);

  useEffect(() => {
    if (!address) {
      setChainRecords([]);
      setChainSource("local");
      setChainError(null);
      return;
    }

    let cancelled = false;
    Promise.all([
      listChainPayments({ buyer: address, limit: 100 }),
      listMirroredReceipts({ payer: address, network: activeNetwork }),
    ])
      .then(([payload, mirrored]) => {
        if (cancelled) return;
        setChainRecords(payload.payments);
        setMirroredRecords(mirrored);
        setChainSource(payload.source);
        setChainError(payload.error ?? null);
      })
      .catch((error) => {
        if (cancelled) return;
        setChainRecords([]);
        setMirroredRecords([]);
        setChainSource("local");
        setChainError(error instanceof Error ? error.message : String(error));
      });

    return () => {
      cancelled = true;
    };
  }, [activeNetwork, address]);

  useEffect(() => {
    if (!address) {
      setSales([]);
      setSalesError(null);
      return;
    }

    let cancelled = false;
    getCreatorSales(address)
      .then((payload) => {
        if (cancelled) return;
        setSales((payload?.sales ?? []).filter((sale) => sale.network === activeNetwork));
        setSalesError(null);
      })
      .catch((error) => {
        if (cancelled) return;
        setSales([]);
        setSalesError(error instanceof Error ? error.message : String(error));
      });

    return () => {
      cancelled = true;
    };
  }, [activeNetwork, address]);

  const records = useMemo(
    () => mergePayments(localRecords, [...chainRecords, ...mirroredRecords]),
    [chainRecords, localRecords, mirroredRecords],
  );

  const totalApt = useMemo(
    () =>
      records.reduce((sum, record) => {
        const space = getSpace(record.spaceId);
        return sum + (record.amountOctas ?? space?.payment?.priceOctas ?? 0);
      }, 0) / 100_000_000,
    [records],
  );
  const totalSalesApt = useMemo(
    () => sales.reduce((sum, sale) => sum + Number(sale.amountOctas || 0), 0) / 100_000_000,
    [sales],
  );

  return (
    <>
      <div className="grain" aria-hidden="true" />
      <AppHeader />
      <main className="collection-page payment-page">
        <section className="collection-heading">
          <p className="eyebrow">Payment history</p>
          <h1>Unlocks you can audit.</h1>
          <p>
            Payment receipts are paired with Space metadata, transaction links, and on-chain
            registry events when an indexer is configured.
          </p>
        </section>

        <section className="market-stats" aria-label="Payment summary">
          <article>
            <span>Unlocks</span>
            <strong>{records.length}</strong>
          </article>
          <article>
            <span>Known volume</span>
            <strong>{totalApt.toLocaleString()} APT</strong>
          </article>
          <article>
            <span>Incoming sales</span>
            <strong>{sales.length}</strong>
          </article>
          <article>
            <span>Creator revenue</span>
            <strong>{totalSalesApt.toLocaleString()} APT</strong>
          </article>
        </section>

        {chainError && (
          <section className="payment-state-card">
            <div>
              <span className="tiny-label">Indexer status</span>
              <strong>Showing wallet receipts and registry sales.</strong>
              <p>
                {chainError} Purchase history is still checked from local receipts, while creator
                sales are read from the registry purchases table.
              </p>
            </div>
          </section>
        )}

        <section className="section-label payment-section-heading">
          <div>
            <p className="eyebrow">Creator sales</p>
            <h2>Works buyers unlocked.</h2>
          </div>
          <span>{sales.length} registry sale{sales.length === 1 ? "" : "s"}</span>
        </section>

        {salesError && (
          <section className="payment-state-card failed">
            <div>
              <span className="tiny-label">Sales sync failed</span>
              <strong>Could not read creator sales.</strong>
              <p>{salesError}</p>
            </div>
          </section>
        )}

        {sales.length > 0 ? (
          <section className="payment-list">
            {sales.map((sale, index) => {
              const space = getSpace(sale.spaceId);

              return (
                <article key={`${sale.spaceId}-${sale.buyer}-${index}`} className="payment-row premium sale-row">
                  <div>
                    <div className="payment-badges">
                      <span className="network-badge stable">{sale.network}</span>
                      <span>Paid unlock</span>
                    </div>
                    <h2>{space?.title ?? "Paid Space"}</h2>
                    <p>Buyer {shortenAddress(sale.buyer)}</p>
                    <code>{sale.spaceId}</code>
                  </div>
                  <div>
                    <strong>{(sale.amountOctas / 100_000_000).toLocaleString()} APT</strong>
                    <span>Registry verified</span>
                    <Link to={`/spaces/${sale.spaceId}`}>Open Space</Link>
                  </div>
                </article>
              );
            })}
          </section>
        ) : (
          <section className="empty-state compact-empty">
            <h2>No incoming sales yet.</h2>
            <p>
              When a buyer unlocks one of your paid Spaces, Oria will list the buyer wallet and
              sale amount here from the registry.
            </p>
          </section>
        )}

        <section className="section-label payment-section-heading">
          <div>
            <p className="eyebrow">Buyer receipts</p>
            <h2>Unlocks from this wallet.</h2>
          </div>
          <span>{chainSource === "indexer" ? "On-chain" : "Local receipts"}</span>
        </section>

        {records.length > 0 ? (
          <section className="payment-list">
            {records.map((record) => {
              const space = getSpace(record.spaceId);
              const title = record.spaceTitle ?? space?.title ?? "Imported paid Space";

              return (
                <article key={`${record.spaceId}-${record.payer}-${record.txHash}`} className="payment-row premium">
                  <div>
                    <div className="payment-badges">
                      <span className="network-badge stable">{record.network}</span>
                      <span>{record.chainStatus === "verified" ? "Verified event" : "Receipt saved"}</span>
                    </div>
                    <h2>{title}</h2>
                    <p>Paid by {shortenAddress(record.payer)} on {formatDateTime(record.paidAt)}</p>
                    <code>{record.receiptId ?? record.txHash}</code>
                  </div>
                  <div>
                    <strong>{amountLabel(record)}</strong>
                    <a href={getTransactionExplorerUrl(record.txHash, record.network)} target="_blank" rel="noreferrer">
                      {shortenAddress(record.txHash)}
                    </a>
                    <Link to={`/spaces/${record.spaceId}`}>Open Space</Link>
                  </div>
                </article>
              );
            })}
          </section>
        ) : (
          <section className="empty-state">
            <h2>No paid unlocks yet.</h2>
            <p>
              Paid Space purchases will appear here after a wallet unlock succeeds. Connect the
              same wallet to sync on-chain events when indexing is available.
            </p>
            <Link className="button primary" to="/spaces">
              Discover paid Spaces
            </Link>
          </section>
        )}
      </main>
    </>
  );
}
