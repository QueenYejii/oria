# Oria

Oria is a creator publishing and discovery dApp built for Shelby-backed media on
Aptos. It turns large files, archives, previews, datasets, and paid drops into
clean shareable Spaces stored on Shelby and anchored through an Aptos registry.

Oria is currently focused on **Shelbynet**. The app is not finished 100% yet and
is still under active development, but the core Shelbynet product flow is live
and usable for serious early testing.

Live app: https://oria-queenyeji.vercel.app  
Repository: https://github.com/QueenYejii/oria

## What Oria Does

Creators can use Oria to publish large digital releases without turning Shelby
into a raw infrastructure experience. The app provides a polished product layer
for:

- Uploading media and release bundles as Shelby blobs.
- Creating public, wallet-gated, or paid Spaces.
- Registering Space metadata on-chain through an Aptos Move registry.
- Browsing globally discoverable Spaces through a gallery-style Discover page.
- Previewing images, video, audio, PDF, JSON, and file metadata before download.
- Unlocking paid Spaces through Aptos wallet transactions.
- Tracking buyer receipts and creator sales.
- Managing creator profiles with avatar, bio, and social links.
- Updating manifests with version history and hash tracking.

The goal is to make Shelby feel useful for real creator and community workflows:
large media drops, archives, private releases, public galleries, gated files, and
paid downloads.

## Current Status

Oria is in **Shelbynet development**. The frontend is deployed on Vercel, the
discovery API is available through Vercel serverless routes, and the Move
registry is deployed and initialized on the current Shelbynet ledger.

Implemented:

- React, Vite, and TypeScript app shell.
- Aptos wallet adapter integration.
- Shelby Protocol SDK integration.
- Shelbynet-first network flow.
- Shelbynet is the active publishing network; retired testnet records remain in
  the data schema for migration only.
- File upload to Shelby blobs.
- Manifest generation, upload, hashing, and versioning.
- Public, wallet-gated, and paid Space modes.
- APT paid unlock flow.
- ShelbyUSD-ready registry v2 and frontend flow.
- Move source for the v2 registry plus a legacy-compatible registry module.
- Registry deployment preflight that stops publishing before Shelby uploads when
  the configured module or `Registry` resource is unavailable.
- Legacy registry fallback so existing v1 Spaces remain discoverable.
- Discovery API for Spaces, creator pages, access checks, payments, and health.
- Marketplace-style Discover page with search, filters, sorting, thumbnails, and
  gated/paid preview treatment.
- Space detail pages with premium preview layout and download controls.
- Creator profile page and editor.
- Seller sales page and payment history foundation.
- Receipt mirroring and transaction verification foundation.
- Edit Space flow for metadata, cover, visibility, price, currency, and allowlist.
- Upload retry, cancel best-effort, draft/session recovery, and file validation.
- Toast notifications and polished loading/error/empty states.
- GSAP-powered landing, route, gallery, and preview motion.
- Vitest and Playwright test coverage for core logic and main UI flows.

Still in progress:

- Full ShelbyUSD end-to-end wallet testing with live ShelbyUSD balances.
- Production-grade resumable upload across refresh/tab close for very large
  multi-chunk uploads.
- Stronger indexing/cache strategy for larger community scale.
- More complete creator analytics and sales reporting.
- More granular on-chain access policies such as token or NFT ownership.
- Continued Shelbynet validation as the network evolves.

## Live Network State

Primary network: **Shelbynet**

Configured registry account:

```text
0xf8430410ed52de75e5311a4c8401cafb4b627eaf92c4f99bfb22ce1946407904
```

Configured registry module:

```text
space_registry_v2
```

Legacy registry module:

```text
space_registry
```

ShelbyUSD metadata address:

```text
0x1b18363a9f1fe5e6ebf247daba5cc1c18052bb232efdc4c50f556053922d98e1
```

The registry is deployed and initialized on the current Shelbynet ledger. The
latest publish transaction is
`0xda59f73af76f36fd78a38c380706d523744f04432f23899596874deb74e3107c` and the
v2 initialize transaction is
`0x4708566945243f3eaa06df140a9805f43d9b95c9fd96b0874cb41d7879c30d95`.
Oria still checks the module and `Registry` resource before starting a Shelby
upload, so a future network reset fails safely instead of opening a bad wallet
signature request.

Production API:

```text
https://oria-queenyeji.vercel.app/api/health
https://oria-queenyeji.vercel.app/api/spaces
```

The production API reads `space_registry_v2` first and falls back to the legacy
`space_registry` module so existing Spaces remain visible while new Spaces are
registered through v2.

## Product Concepts

### Space

A Space is the main publishing unit in Oria. It represents one release, archive,
media bundle, dataset, preview set, or paid drop.

Each Space can include:

- Space id
- registry module
- creator wallet address
- network
- title and description
- visibility mode
- access rule
- optional allowlist
- optional payment configuration
- thumbnail or public cover
- Shelby blob names
- manifest blob name
- manifest hash
- manifest version history
- creation and update timestamps

### Manifest

The manifest is a JSON document uploaded to Shelby. It records the Space
metadata, file list, access model, payment data, and version information. Oria
hashes each manifest so updates can be tracked.

### Registry

The Move registry stores minimal global discovery data on Aptos:

- `space_id`
- creator address
- network
- manifest blob name
- manifest hash
- manifest version
- visibility
- access rule
- price
- payment currency and asset
- timestamps

Registry v2 also includes creator profile state and ShelbyUSD-ready purchases.

### Discovery API

The discovery API reads Aptos resources/events and exposes a frontend-friendly
HTTP surface.

Key endpoints:

- `GET /api/health`
- `GET /api/spaces`
- `GET /api/spaces/:spaceId`
- `GET /api/creators/:address`
- `GET /api/creators/:address/sales`
- `GET /api/sales/:address`
- `GET /api/payments`
- `GET /api/receipts`
- `POST /api/receipts`
- `GET /api/spaces/:spaceId/access/:wallet`

## Tech Stack

- React 18
- Vite 6
- TypeScript
- Aptos TypeScript SDK
- Aptos wallet adapter
- Aptos Move
- Shelby Protocol React SDK
- Shelby Protocol TypeScript SDK
- TanStack Query
- React Router
- GSAP
- Zod
- Vitest
- Playwright
- Vercel

## Project Structure

```text
.
|-- api/
|   |-- _discovery.js
|   |-- _receipts.js
|   |-- creators/
|   |-- payments/
|   |-- receipts/
|   |-- sales/
|   `-- spaces/
|-- move/
|   |-- Move.toml
|   `-- sources/
|       |-- space_registry.move
|       `-- space_registry_legacy.move
|-- public/
|   `-- brand/
|-- server/
|   `-- discovery-api.mjs
|-- src/
|   |-- app/
|   |-- components/
|   |   |-- landing/
|   |   |-- layout/
|   |   |-- spaces/
|   |   `-- upload/
|   |-- config/
|   |-- hooks/
|   |-- lib/
|   |   |-- access/
|   |   |-- creator/
|   |   |-- discovery/
|   |   |-- registry/
|   |   |-- shelby/
|   |   |-- spaces/
|   |   |-- upload/
|   |   |-- utils/
|   |   `-- wallet/
|   |-- pages/
|   |-- providers/
|   |-- styles/
|   `-- types/
|-- e2e/
|-- .env.example
|-- package.json
|-- playwright.config.ts
|-- tsconfig.json
|-- vercel.json
`-- vite.config.ts
```

## Getting Started

### Requirements

- Node.js 20 or newer
- npm
- Aptos CLI for Move work
- Aptos-compatible wallet, such as Petra
- Shelbynet wallet/network configuration
- Shelby API key when the target endpoint requires authenticated requests

### Install

```bash
npm install
```

### Environment

Create a local environment file:

```bash
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Important variables:

```bash
VITE_DEFAULT_ORIA_NETWORK=shelbynet
VITE_APTOS_API_KEY=
VITE_SHELBY_API_KEY=
VITE_SHELBYNET_API_KEY= # Required for browser uploads on Shelbynet.
VITE_SHELBY_TESTNET_API_KEY= # Shelby Testnet is retired; kept for legacy config only.
VITE_SHELBY_LOCATION_HINT=shelbynet-1 # Active Shelbynet write location; optional override.

VITE_ORIA_REGISTRY_ADDRESS=0xf8430410ed52de75e5311a4c8401cafb4b627eaf92c4f99bfb22ce1946407904 # Active Shelbynet registry account.
VITE_ORIA_REGISTRY_MODULE=space_registry_v2
VITE_ORIA_LEGACY_REGISTRY_MODULE=space_registry
VITE_ORIA_PAYMENT_V2=1
VITE_SHELBY_USD_METADATA_ADDRESS=0x1b18363a9f1fe5e6ebf247daba5cc1c18052bb232efdc4c50f556053922d98e1
VITE_ORIA_DISCOVERY_API_URL=

ORIA_REGISTRY_ADDRESS=0xf8430410ed52de75e5311a4c8401cafb4b627eaf92c4f99bfb22ce1946407904
ORIA_REGISTRY_MODULE=space_registry_v2
ORIA_LEGACY_REGISTRY_MODULE=space_registry
APTOS_NODE_URL=https://api.shelbynet.shelby.xyz/v1
APTOS_INDEXER_URL=
PORT=8787
```

For local development, leaving `VITE_ORIA_DISCOVERY_API_URL` empty lets the app
use local/browser metadata. In production, Vercel routes serve `/api`.

Browser uploads require a Geomi client API key for the active Shelby network.
Create a client key for `shelbynet` at [geomi.dev](https://geomi.dev/), add it
to Vercel as `VITE_SHELBYNET_API_KEY` under the Production environment, and
redeploy. Vite embeds `VITE_*` variables during the build, so changing the
variable without a new deployment will not update the dApp. Do not use a
private/server key in the browser. New Shelbynet accounts without a location
preference use `shelbynet-1` as the default write location; override it with
`VITE_SHELBY_LOCATION_HINT` only when Shelby activates a different location.

### Run

```bash
npm run dev
```

### Run Local Discovery API

```bash
npm run dev:api
```

Default local API:

```text
http://127.0.0.1:8787
```

### Build

```bash
npm run build
```

### Test

```bash
npm run test
npm run test:e2e
```

## Move Registry

The Move package lives in `move/`.

The active Shelbynet deployment uses the registry deployer account shown above.
If Shelbynet resets again, use an Aptos profile controlled by that deployer,
then verify the module and resource before setting
`VITE_ORIA_REGISTRY_ADDRESS` and `VITE_ORIA_REGISTRY_MODULE` in Vercel or local
`.env`.

Compile:

```bash
aptos move compile --package-dir move --named-addresses oria=<DEPLOYER_ADDRESS>
```

Publish:

```bash
aptos move publish --profile <PROFILE> --package-dir move --named-addresses oria=<DEPLOYER_ADDRESS>
```

Initialize v2:

```bash
aptos move run \
  --profile <PROFILE> \
  --function-id <DEPLOYER_ADDRESS>::space_registry_v2::initialize
```

Verify the deployment with the active fullnode:

```bash
curl "https://api.shelbynet.shelby.xyz/v1/accounts/<DEPLOYER_ADDRESS>/module/space_registry_v2"
curl "https://api.shelbynet.shelby.xyz/v1/accounts/<DEPLOYER_ADDRESS>/resource/<DEPLOYER_ADDRESS>%3A%3Aspace_registry_v2%3A%3ARegistry"
```

The package keeps a legacy-compatible `space_registry` module and adds
`space_registry_v2` side-by-side. This avoids breaking already-published Spaces
while allowing new registry features.

## Main User Flows

### Publish a Space

1. Connect an Aptos wallet.
2. Use Shelbynet from the header network switcher.
3. Add title, description, visibility, and expiration.
4. Choose public, wallet-gated, or paid access.
5. Set APT or ShelbyUSD pricing for paid Spaces.
6. Add an optional public cover for gated/paid Spaces.
7. Drop files into Oria.
8. Sign wallet requests for Shelby upload and registry registration.
9. Share or open the created Space.

### Discover Spaces

1. Open `/spaces`.
2. Search by title, creator, or Space id.
3. Filter by access mode and media type.
4. Sort by newest, largest, or most files.
5. Open a Space detail page for preview, access context, and downloads.

### Edit a Space

Owners can update:

- title
- description
- cover
- visibility
- price
- payment currency
- allowlist
- manifest version

The app uploads a new manifest and attempts on-chain updates through the active
registry module.

### Paid Unlock

1. Buyer opens a paid Space.
2. Buyer connects a wallet.
3. Buyer signs the payment transaction.
4. Oria saves a receipt locally and mirrors it to the API when available.
5. Seller can inspect incoming sales from the Sales/Payments pages.

## Design Direction

Oria intentionally avoids loud web3 visual language. The interface is designed
to feel calm, premium, creator-oriented, and media-first.

Design priorities:

- strong visual hierarchy
- editorial layout
- premium preview surfaces
- clear wallet and network state
- polished but restrained motion
- readable marketplace cards
- responsive pages that remain usable on ordinary laptops and phones

GSAP is used for landing choreography, route transitions, gallery card reveal,
preview transitions, and smooth interface motion. CSS transitions handle common
micro-interactions such as buttons, cards, filters, and toasts.

## Verification

Current local verification used during development:

```bash
npm run build
npm run test
npm run test:e2e
aptos move compile --package-dir move --named-addresses oria=0xf8430410ed52de75e5311a4c8401cafb4b627eaf92c4f99bfb22ce1946407904
```

Known build note:

- The Aptos SDK chunk is larger than Vite's default warning threshold. The app
  already lazy-loads pages and separates major chunks, but further wallet/Aptos
  bundle optimization remains a performance task.

## Roadmap

Short-term priorities:

- Test ShelbyUSD paid unlocks end-to-end with real ShelbyUSD wallet balances.
- Improve large-file resumable uploads beyond best-effort session recovery.
- Add stronger API caching and pagination for larger community usage.
- Polish creator profile analytics and sales insights.
- Improve transaction explorer links and receipt reconciliation.

Medium-term priorities:

- Keep validating the active Shelbynet integration as protocol endpoints evolve.
- Add richer creator identity and profile indexing.
- Add token/NFT-based access rules.
- Add creator analytics dashboard.
- Add more extensive e2e coverage for wallet, upload, and paid flows.
- Improve preview streaming for very large media files.

## Links

- App: https://oria-queenyeji.vercel.app
- GitHub: https://github.com/QueenYejii/oria
- Telegram: https://t.me/QueenYejii24
- X: https://x.com/QueenYejii24
- Shelby Discord: https://discord.com/invite/shelbyserves

## License

No open-source license has been selected yet. Add a license before accepting
external contributions or allowing production reuse.
