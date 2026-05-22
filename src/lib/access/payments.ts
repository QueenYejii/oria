import type { OriaNetwork } from "../../types/network";

export type LocalPaymentRecord = {
  spaceId: string;
  network: OriaNetwork;
  payer: string;
  txHash: string;
  paidAt: number;
};

const STORAGE_KEY = "oria:payments:v1";
const STORAGE_EVENT = "oria-payments-updated";

function readRecords(): LocalPaymentRecord[] {
  if (typeof window === "undefined") return [];

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function listLocalPayments() {
  return readRecords().sort((a, b) => b.paidAt - a.paidAt);
}

export function hasLocalPayment(params: {
  spaceId: string;
  network: OriaNetwork;
  payer?: string;
}) {
  if (!params.payer) return false;
  const payer = params.payer.toLowerCase();

  return readRecords().some(
    (record) =>
      record.spaceId === params.spaceId &&
      record.network === params.network &&
      record.payer.toLowerCase() === payer,
  );
}

export function saveLocalPayment(record: LocalPaymentRecord) {
  const records = readRecords();
  const nextRecords = [
    record,
    ...records.filter(
      (item) =>
        !(
          item.spaceId === record.spaceId &&
          item.network === record.network &&
          item.payer.toLowerCase() === record.payer.toLowerCase()
        ),
    ),
  ];

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextRecords));
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

export function subscribeToPayments(callback: () => void) {
  window.addEventListener(STORAGE_EVENT, callback);
  window.addEventListener("storage", callback);

  return () => {
    window.removeEventListener(STORAGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
