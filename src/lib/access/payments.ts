import type { OriaNetwork } from "../../types/network";
import type { SpacePaymentCurrency } from "../../types/space";
import { getDiscoveryApiUrl } from "../discovery/client";

export type LocalPaymentRecord = {
  spaceId: string;
  network: OriaNetwork;
  payer: string;
  txHash: string;
  paidAt: number;
  amountOctas?: number;
  currency?: SpacePaymentCurrency;
  spaceTitle?: string;
  creator?: string;
  receiptId?: string;
  source?: "registry" | "local" | "receipt_mirror";
  chainStatus?: "pending" | "verified" | "failed";
  verifiedAt?: number;
  transactionVersion?: string;
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

export function createPaymentReceiptId(record: Pick<LocalPaymentRecord, "network" | "spaceId" | "txHash">) {
  return `oria-${record.network}-${record.spaceId.slice(-8)}-${record.txHash.slice(-8)}`;
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
  const normalizedRecord = {
    ...record,
    receiptId: record.receiptId ?? createPaymentReceiptId(record),
    source: record.source ?? "registry",
    chainStatus: record.chainStatus ?? "pending",
  };
  const nextRecords = [
    normalizedRecord,
    ...records.filter(
      (item) =>
        !(
          item.spaceId === normalizedRecord.spaceId &&
          item.network === normalizedRecord.network &&
          item.payer.toLowerCase() === normalizedRecord.payer.toLowerCase()
        ),
    ),
  ];

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextRecords));
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

export async function mirrorPaymentReceipt(record: LocalPaymentRecord) {
  const baseUrl = getDiscoveryApiUrl();
  if (!baseUrl) return null;

  let response: Response | null = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    response = await fetch(`${baseUrl.replace(/\/$/, "")}/receipts`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(record),
    });

    if (response.ok || attempt === 2) break;
    await new Promise((resolve) => window.setTimeout(resolve, 1400));
  }

  if (!response || !response.ok) {
    const detail = response ? await response.text() : "";
    throw new Error(`Receipt mirror returned ${response?.status ?? "unknown"}. ${detail}`);
  }

  return (await response.json()) as {
    receipt: LocalPaymentRecord;
    store: { mode: string; persistent: boolean };
  };
}

export async function listMirroredReceipts(params: {
  payer?: string;
  creator?: string;
  spaceId?: string;
  network?: OriaNetwork;
}) {
  const baseUrl = getDiscoveryApiUrl();
  if (!baseUrl) return [];

  const query = new URLSearchParams();
  if (params.payer) query.set("payer", params.payer);
  if (params.creator) query.set("creator", params.creator);
  if (params.spaceId) query.set("spaceId", params.spaceId);
  if (params.network) query.set("network", params.network);

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/receipts?${query.toString()}`);
  if (!response.ok) {
    throw new Error(`Receipt mirror returned ${response.status}.`);
  }

  const payload = (await response.json()) as { receipts: LocalPaymentRecord[] };
  return payload.receipts ?? [];
}

export function subscribeToPayments(callback: () => void) {
  window.addEventListener(STORAGE_EVENT, callback);
  window.addEventListener("storage", callback);

  return () => {
    window.removeEventListener(STORAGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
