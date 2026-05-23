import { expect, test, type Page } from "@playwright/test";

const creator = "0x4665c3aecbc8c79ba50b344ce26db478884027cba08cdf30cd5890223e19d35c";
const now = Date.UTC(2026, 4, 23, 3, 10, 0);

const spaces = [
  {
    id: "space_public_e2e",
    network: "shelbynet",
    creator,
    title: "Public Studio Drop",
    description: "A public Shelby-backed image release.",
    thumbnailBlobName: "oria/space_public_e2e/01-cover.png",
    manifestBlobName: "oria/space_public_e2e/manifest.json",
    manifestHash: "a".repeat(64),
    manifestVersion: 1,
    files: [
      {
        id: "file_public_image",
        blobName: "oria/space_public_e2e/01-cover.png",
        fileName: "cover.png",
        mimeType: "image/png",
        size: 959_000,
      },
    ],
    visibility: "public",
    access: { rule: "public" },
    expiresAt: now + 30 * 24 * 60 * 60 * 1000,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "space_paid_e2e",
    network: "shelbynet",
    creator,
    title: "Paid Audio Vault",
    description: "A paid creator release that should stay locked before purchase.",
    manifestBlobName: "oria/space_paid_e2e/manifest.json",
    manifestHash: "b".repeat(64),
    manifestVersion: 1,
    files: [
      {
        id: "file_paid_audio",
        blobName: "oria/space_paid_e2e/01-session.wav",
        fileName: "session.wav",
        mimeType: "audio/wav",
        size: 4_200_000,
      },
    ],
    visibility: "paid",
    access: { rule: "paid" },
    payment: {
      currency: "APT",
      priceOctas: 1_000_000,
      recipient: creator,
    },
    expiresAt: now + 30 * 24 * 60 * 60 * 1000,
    createdAt: now - 1000,
    updatedAt: now - 1000,
  },
  {
    id: "space_gated_e2e",
    network: "shelbynet",
    creator,
    title: "Allowlist Research Pack",
    description: "A wallet-gated dataset release.",
    manifestBlobName: "oria/space_gated_e2e/manifest.json",
    manifestHash: "c".repeat(64),
    manifestVersion: 2,
    files: [
      {
        id: "file_gated_json",
        blobName: "oria/space_gated_e2e/01-data.json",
        fileName: "data.json",
        mimeType: "application/json",
        size: 12_000,
      },
    ],
    visibility: "wallet_gated",
    access: { rule: "allowlist", allowlist: ["0xabc"] },
    expiresAt: now + 30 * 24 * 60 * 60 * 1000,
    createdAt: now - 2000,
    updatedAt: now - 2000,
  },
];

async function seedSpaces(page: Page) {
  await page.route("**/shelby/**", (route) => route.abort());
  await page.addInitScript((seededSpaces) => {
    window.localStorage.setItem("oria:spaces:v1", JSON.stringify(seededSpaces));
  }, spaces);
}

test.beforeEach(async ({ page }) => {
  await seedSpaces(page);
});

test("discovers seeded Spaces and opens a public detail page", async ({ page }) => {
  await page.goto("/spaces");

  await expect(page.getByRole("heading", { name: /Discover Shelby-backed drops/i })).toBeVisible();
  await expect(page.getByText("Public Studio Drop")).toBeVisible();
  await expect(page.getByText("Paid Audio Vault")).toBeVisible();
  await expect(page.getByText("Allowlist Research Pack")).toBeVisible();

  await page.getByText("Public Studio Drop").click();
  await expect(page.getByRole("heading", { name: "Public Studio Drop" })).toBeVisible();
  await expect(page.getByText("Downloads unlocked")).toBeVisible();
  await expect(page.getByText("1 Shelby blobs")).toBeVisible();
  await expect(page.getByRole("button", { name: /Download cover\.png/i })).toBeVisible();
});

test("keeps paid and wallet-gated Spaces locked without a connected wallet", async ({ page }) => {
  await page.goto("/spaces/space_paid_e2e");

  await expect(page.getByRole("heading", { name: "Paid Audio Vault" })).toBeVisible();
  await expect(page.getByText("Downloads locked")).toBeVisible();
  await expect(page.getByRole("button", { name: "Pay to unlock" })).toBeDisabled();
  await expect(page.getByText("Locked", { exact: true })).toBeVisible();

  await page.goto("/spaces/space_gated_e2e");
  await expect(page.getByRole("heading", { name: "Allowlist Research Pack" })).toBeVisible();
  await expect(page.getByText("Downloads locked")).toBeVisible();
  await expect(page.getByText("Connect a wallet to unlock this Space.")).toBeVisible();
});

test("shows a polished creator profile with stats and creator Spaces", async ({ page }) => {
  await page.goto(`/u/${creator}`);

  await expect(page.getByRole("heading", { name: /0x4665.*19d35c/i })).toBeVisible();
  await expect(page.getByText("Latest release")).toBeVisible();
  await expect(page.getByText("Access mix")).toBeVisible();
  await expect(page.getByRole("link", { name: /Public Studio Drop/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Paid Audio Vault/i })).toBeVisible();
  await expect(page.getByRole("link", { name: "GitHub" })).toBeVisible();
});
