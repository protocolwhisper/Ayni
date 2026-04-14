# Ayni Frontend

Dashboard and contract-first WZKLTC deposit flow for the Ayni prototype.

## Local setup

```bash
bun install
bun run dev
```

## Dashboard gate

Landing CTAs route to `/dashboard/`. If you want the dashboard protected before launch, enable the server-side password gate in Vercel or your deployment environment:

```bash
DASHBOARD_PASSWORD_ENABLED=true
DASHBOARD_PASSWORD=your-password
DASHBOARD_USERNAME=
```

These values are read by `middleware.js`, so they are not bundled into the browser. Leave `DASHBOARD_PASSWORD_ENABLED=false` to keep the dashboard open.

## Protocol config

Copy `.env.example` to `.env` and set the public chain config plus Ayni market addresses before using the dashboard:

```bash
VITE_AYNI_PROTOCOL_ADDRESS=0x...
VITE_AYNI_NETWORK_NAME=LitVM Testnet
VITE_AYNI_DEBT_TOKEN_ADDRESS=0x... # USDC
VITE_PUBLIC_RPC_URL=https://...
VITE_PUBLIC_CHAIN_ID=
```

The dashboard reads one collateral market from `AyniProtocol`: supplied asset `WZKLTC`, borrowed asset `USDC`. It uses `VITE_WZKLTC_CONTRACT_ADDRESS` as the collateral token unless you explicitly set a different `VITE_AYNI_COLLATERAL_TOKEN_ADDRESS`, loads the market address through `get_market(collateral, debt)`, reads position data from that vault, approves the vault for supply, and sends `deposit` / `borrow` through the protocol router.

## Wrapper contract config

Copy `.env.example` to `.env` and set the wrapper deployment address before using the deposit modal:

```bash
VITE_WZKLTC_CONTRACT_ADDRESS=0x60A84eBC3483fEFB251B76Aea5B8458026Ef4bea
VITE_PUBLIC_RPC_URL=https://liteforge.rpc.caldera.xyz/http
VITE_PUBLIC_CHAIN_ID=4441
VITE_WZKLTC_SOURCE_CHAIN_NAME=Liteforge
VITE_WZKLTC_DEST_CHAIN_NAME=Wrapped zkLTC
VITE_WZKLTC_CONTRACT_LABEL=Wrapped zkLTC
```

The modal reads the native zkLTC balance through `VITE_PUBLIC_RPC_URL` and sends a payable `deposit()` transaction to `VITE_WZKLTC_CONTRACT_ADDRESS`, equivalent to:

```bash
cast send 0x60A84eBC3483fEFB251B76Aea5B8458026Ef4bea \
  "deposit()" \
  --value 0.01ether \
  --rpc-url https://liteforge.rpc.caldera.xyz/http \
  --account ayni
```

Wrapped `WZKLTC` returns to the connected wallet.
