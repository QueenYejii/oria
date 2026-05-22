# Oria

Oria is a creator-focused publishing dApp for large digital work on Aptos and
Shelby. It helps creators turn large media, archives, datasets, previews, and
release bundles into clean, shareable Spaces backed by Shelby storage and Aptos
wallet identity.

Live app: https://oria-queenyeji.vercel.app  
Repository: https://github.com/QueenYejii/oria

## Why Oria

Large creative releases are usually scattered across centralized storage,
download links, and private community posts. Oria is designed as a polished
front-end layer for Shelby where creators can:

- Upload large files as Shelby blobs.
- Publish a Space manifest that describes the release.
- Share a public Space URL with previews and access context.
- Connect an Aptos wallet for identity, signing, ownership, and payments.
- Discover creator Spaces through a registry/indexer flow.
- Experiment with public, wallet-gated, and paid access models.

The goal is to make Shelby feel usable in real creator and community workflows,
not only as a low-level storage primitive.

## Product Status

Oria is an active testnet-stage dApp. The frontend is live and the core product
surface is implemented. The current primary target is Shelbynet because it is
available for early testing. Shelby Testnet support remains in the app and will
be validated after early access is approved.

Implemented:

- Vite, React, TypeScript app shell.
- Aptos wallet adapter integration.
- Shelby SDK integration structure.
- Shelbynet-first network flow with Shelby Testnet support kept available.
- Space creation flow with manifest generation.
- Local metadata persistence.
- Public, wallet-gated, and paid Space UI.
- Payment transaction flow with local payment history fallback.
- Discovery/gallery page with search, filters, sorting, and marketplace-style cards.
- Creator profile pages.
- Space detail pages with media preview.
- Lazy/manual preview load for large files.
- Manifest version update UI.
- Local Space delete.
- Upload retry, cancel best-effort, and file validation.
- Notifications/toasts.
- GSAP-powered landing, route, gallery, and preview motion.
- Move registry contract foundation.
- Discovery API service foundation.
- Vitest tests for manifest and access logic.

Still required for full production:

- Compile, test, and deploy the Move registry contract with Aptos CLI.
- Initialize registry resources on the target network.
- Configure `VITE_ORIA_REGISTRY_ADDRESS`.
- Host the discovery API and configure `VITE_ORIA_DISCOVERY_API_URL`.
- Verify real on-chain purchase and allowlist state from the registry/indexer.
- Replace local payment fallback with fully indexed on-chain history.
- Validate Shelby Testnet upload/retrieval behavior after early access is approved.

## Tech Stack

- React 18
- Vite 6
- TypeScript
- Aptos TypeScript SDK
- Aptos wallet adapter
- Shelby Protocol React SDK
- Shelby Protocol TypeScript SDK
- TanStack Query
- React Router
- GSAP
- Zod
- Vitest
- Aptos Move

## Networks

Oria supports two Shelby-oriented network targets:

| Network | Purpose | Aptos node | Shelby RPC |
| --- | --- | --- | --- |
| Shelby Testnet | Stable demos and repeatable testing | `https://api.testnet.aptoslabs.com/v1` | `https://api.testnet.shelby.xyz/shelby` |
| Shelbynet | Experimental protocol testing | `https://api.shelbynet.shelby.xyz/v1` | `https://api.shelbynet.shelby.xyz/shelby` |

The default network is Shelbynet. It can be changed with `VITE_DEFAULT_ORIA_NETWORK`.

## Core Concepts

### Space

A Space is the main publishing unit in Oria. It represents one release, archive,
media drop, dataset, or bundle.

Each Space contains:

- `space_id`
- creator wallet address
- target network
- title and description
- visibility mode
- access rule
- file metadata
- Shelby blob names
- manifest blob name
- manifest hash
- manifest version
- created and updated timestamps
- optional payment data

### Manifest

The manifest is a JSON document uploaded as a Shelby blob. It records the Space
metadata and file list. Oria hashes the manifest so future versions can be
tracked and verified.

### Registry

The Move registry is intended to make Spaces globally discoverable. Instead of
only relying on browser `localStorage`, the registry stores a minimal on-chain
pointer to each Space manifest.

The registry foundation supports:

- registering a Space
- updating manifest version and hash
- adding allowlisted wallets
- purchasing a paid Space
- checking purchase and allowlist state

### Discovery API

The discovery API reads registry resources from Aptos and exposes a simple HTTP
surface for the frontend.

Endpoints:

- `GET /health`
- `GET /spaces`
- `GET /spaces/:spaceId`
- `GET /creators/:address`
- `GET /spaces/:spaceId/access/:wallet`

## Project Structure

```text
.
|-- move/
|   |-- Move.toml
|   `-- sources/
|       `-- space_registry.move
|-- public/
|   `-- brand/
|       `-- oria-mark.svg
|-- server/
|   `-- discovery-api.mjs
|-- src/
|   |-- app/
|   |   `-- App.tsx
|   |-- components/
|   |   |-- landing/
|   |   |-- layout/
|   |   |-- spaces/
|   |   `-- upload/
|   |-- config/
|   |   `-- networks.ts
|   |-- hooks/
|   |-- lib/
|   |   |-- access/
|   |   |-- discovery/
|   |   |-- registry/
|   |   |-- shelby/
|   |   |-- spaces/
|   |   |-- utils/
|   |   `-- wallet/
|   |-- pages/
|   |-- providers/
|   |-- styles/
|   |   `-- globals.css
|   `-- types/
|-- .env.example
|-- package.json
`-- vite.config.ts
```

## Getting Started

### Prerequisites

- Node.js 20 or newer
- npm
- Aptos-compatible wallet
- Shelbynet access for current live testing
- Shelby early access credentials for Shelby Testnet validation later
- Aptos CLI for Move contract compile/deploy work

### Install

```bash
npm install
```

### Environment

Copy the example env file:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Available variables:

```bash
VITE_DEFAULT_ORIA_NETWORK=shelbynet
VITE_APTOS_API_KEY=
VITE_SHELBY_API_KEY=
VITE_ORIA_REGISTRY_ADDRESS=
VITE_ORIA_DISCOVERY_API_URL=

PORT=8787
ORIA_REGISTRY_ADDRESS=
APTOS_NODE_URL=https://api.shelbynet.shelby.xyz/v1
```

Frontend variables:

- `VITE_DEFAULT_ORIA_NETWORK`: `testnet` or `shelbynet`.
- `VITE_APTOS_API_KEY`: optional Aptos API key.
- `VITE_SHELBY_API_KEY`: Shelby API key when required by the target network.
- `VITE_ORIA_REGISTRY_ADDRESS`: deployed registry module/account address.
- `VITE_ORIA_DISCOVERY_API_URL`: hosted discovery API base URL.

Server variables:

- `PORT`: discovery API port.
- `ORIA_REGISTRY_ADDRESS`: deployed registry account address.
- `APTOS_NODE_URL`: Aptos REST node used by the discovery API.

### Run the App

```bash
npm run dev
```

### Run the Discovery API

```bash
npm run dev:api
```

The API starts on:

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
```

## Move Registry

The registry package lives in `move/`.

Planned Aptos CLI flow:

```bash
cd move
aptos move compile --named-addresses oria=<DEPLOYER_ADDRESS>
aptos move publish --named-addresses oria=<DEPLOYER_ADDRESS>
```

After publishing, initialize the registry and set:

```bash
VITE_ORIA_REGISTRY_ADDRESS=<DEPLOYER_ADDRESS>
ORIA_REGISTRY_ADDRESS=<DEPLOYER_ADDRESS>
```

The contract is a foundation for testnet integration and should be compiled,
audited, and tested before production use.

## User Flows

### Create a Space

1. Connect an Aptos wallet.
2. Use Shelbynet by default, or switch network from the header when needed.
3. Add title, description, visibility, and optional price or allowlist.
4. Drop files into Oria.
5. Sign upload and registry transactions.
6. Oria uploads files and manifest to Shelby.
7. The Space is saved locally and can be shared.

### Discover Spaces

1. Open `/spaces`.
2. Search by title, creator, or Space id.
3. Filter by visibility and media type.
4. Sort by newest, largest, or most files.
5. Open a Space detail page.

### Update a Manifest

1. Open a Space as its owner.
2. Edit metadata or access rules.
3. Publish the next manifest version.
4. Oria uploads the updated manifest and attempts an on-chain registry update
   when registry configuration is available.

### Paid Unlock

1. Open a paid Space.
2. Connect a wallet.
3. Submit payment.
4. Oria records local payment state and, when registry is configured, can verify
   purchase state through the registry/discovery flow.

## Design Direction

Oria is intentionally quiet, premium, and creator-oriented. The interface avoids
heavy web3 aesthetics and focuses on:

- calm editorial layout
- polished publishing flows
- strong media preview surfaces
- clear network and wallet state
- restrained motion
- responsive, scan-friendly pages

GSAP is used selectively for page choreography:

- landing hero reveal
- section reveal
- route transitions
- marketplace card stagger
- detail preview transitions

CSS transitions handle hover states, buttons, cards, toasts, and upload progress.
Reduced motion preferences are respected.

## Deployment

Frontend deployment target:

- Vercel

Current production URL:

```text
https://oria-queenyeji.vercel.app
```

Recommended production topology:

- Vercel for the frontend.
- Railway, Fly.io, Render, or similar for the discovery API.
- Shelbynet for the first registry deployment target.
- Shelby Testnet credentials for blob upload and retrieval after early access.

## Known Limitations

- Without a deployed registry address, Spaces are primarily local/browser based.
- Without a hosted discovery API, global browsing falls back to local/imported
  metadata.
- Wallet-gated and paid flows have UI and local fallback behavior until registry
  verification is fully configured.
- Real resumable upload per chunk depends on a wallet-compatible Shelby SDK flow.
  The current app includes retry, cancel best-effort, and validation.
- Move contract needs compile, deploy, and testnet validation before production
  use.

## Roadmap

- Deploy and initialize the Space Registry on Shelbynet first.
- Validate Shelby Testnet after early access is accepted.
- Host the discovery API.
- Add fully indexed creator profiles.
- Add public profile customization.
- Add registry-backed payment history.
- Add creator analytics.
- Improve media preview streaming for very large assets.
- Add end-to-end tests for wallet, upload, preview, and paid unlock flows.
- Expand on-chain access policies for NFT/token ownership.

## Links

- App: https://oria-queenyeji.vercel.app
- GitHub: https://github.com/QueenYejii/oria
- Telegram: https://t.me/QueenYejii24
- X: https://x.com/QueenYejii24
- Shelby Discord: https://discord.com/invite/shelbyserves

## License

License has not been selected yet. Add a license before accepting external
contributions or production reuse.
