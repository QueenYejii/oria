export function getErrorMessage(error: unknown) {
  const rawMessage =
    error instanceof Error ? error.message : typeof error === "string" ? error : "Something went wrong";
  const message = rawMessage.replace(/\s+/g, " ").trim();

  if (/anonymous requests are not allowed|401 \(unauthorized\)|status.*401/i.test(message)) {
    return "Shelby rejected the request. Check that the Shelbynet API key is active for this project, then try again.";
  }

  if (/field ['"]?blobs['"]? not found|query_root/i.test(message)) {
    return "Shelby Blob Indexer is not configured correctly. Use the Shelby blob indexer endpoint for uploads.";
  }

  if (/user rejected|rejected by user|cancelled by user/i.test(message)) {
    return "Wallet confirmation was cancelled.";
  }

  if (/insufficient|not enough|balance/i.test(message)) {
    return "The wallet does not have enough balance for this transaction.";
  }

  if (/network|chain/i.test(message) && /mismatch|wrong|custom/i.test(message)) {
    return "Wallet network does not match Oria. Switch the wallet to Shelbynet and reconnect.";
  }

  if (message.length > 260) {
    return `${message.slice(0, 257)}...`;
  }

  if (message) return message;
  return "Something went wrong";
}
