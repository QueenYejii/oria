import { Link } from "react-router-dom";
import { AppHeader } from "../components/layout/AppHeader";
import { listLocalPayments, subscribeToPayments } from "../lib/access/payments";
import { getSpace } from "../lib/spaces/local-store";
import { formatDate, shortenAddress } from "../lib/utils/format";
import { useEffect, useMemo, useState } from "react";

export function PaymentHistoryPage() {
  const [records, setRecords] = useState(() => listLocalPayments());

  useEffect(() => subscribeToPayments(() => setRecords(listLocalPayments())), []);

  const totalApt = useMemo(
    () =>
      records.reduce((sum, record) => {
        const space = getSpace(record.spaceId);
        return sum + (space?.payment?.priceOctas ?? 0);
      }, 0) / 100_000_000,
    [records],
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
            Local payment records are paired with Space metadata so creators and collectors can
            review paid unlocks while the on-chain registry/indexer comes online.
          </p>
        </section>

        <section className="market-stats compact" aria-label="Payment summary">
          <article>
            <span>Unlocks</span>
            <strong>{records.length}</strong>
          </article>
          <article>
            <span>Known volume</span>
            <strong>{totalApt.toLocaleString()} APT</strong>
          </article>
          <article>
            <span>Source</span>
            <strong>Local + registry</strong>
          </article>
        </section>

        {records.length > 0 ? (
          <section className="payment-list">
            {records.map((record) => {
              const space = getSpace(record.spaceId);

              return (
                <article key={`${record.spaceId}-${record.payer}`} className="payment-row">
                  <div>
                    <span className="network-badge stable">{record.network}</span>
                    <h2>{space?.title ?? "Imported paid Space"}</h2>
                    <p>Paid by {shortenAddress(record.payer)} on {formatDate(record.paidAt)}</p>
                  </div>
                  <div>
                    <strong>
                      {space?.payment ? `${space.payment.priceOctas / 100_000_000} APT` : "Verified"}
                    </strong>
                    <a href={`https://explorer.aptoslabs.com/txn/${record.txHash}`} target="_blank" rel="noreferrer">
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
            <p>Paid Space purchases will appear here after a wallet unlock succeeds.</p>
            <Link className="button primary" to="/spaces">
              Discover paid Spaces
            </Link>
          </section>
        )}
      </main>
    </>
  );
}
