# Ayni Frontend

Dashboard and contract-first WZKLTC mint flow for the Ayni prototype.

## Local setup

```bash
bun install
bun run dev
```

## Dashboard gate

Landing CTAs route to `/dashboard/`. If you want the dashboard protected before launch, enable the password gate in `.env`:

```bash
VITE_DASHBOARD_PASSWORD_ENABLED=true
VITE_DASHBOARD_PASSWORD=your-password
VITE_DASHBOARD_PASSWORD_HINT=
```

Leave `VITE_DASHBOARD_PASSWORD_ENABLED=false` to keep the dashboard open.

## Protocol config

Copy `.env.example` to `.env` and set the Ayni market addresses before using the dashboard:

```bash
VITE_AYNI_PROTOCOL_ADDRESS=0x...
VITE_AYNI_RPC_URL=https://...
VITE_AYNI_CHAIN_ID=
VITE_AYNI_NETWORK_NAME=LitVM Testnet
VITE_AYNI_COLLATERAL_TOKEN_ADDRESS=0x... # WZKLTC
VITE_AYNI_DEBT_TOKEN_ADDRESS=0x... # USDC
```

The dashboard reads one collateral market from `AyniProtocol`: supplied asset `WZKLTC`, borrowed asset `USDC`. It loads the market address through `get_market(collateral, debt)`, reads position data from that vault, approves the vault for supply, and sends `deposit` / `borrow` through the protocol router.

## Wrapper contract config

Copy `.env.example` to `.env` and set the wrapper deployment address before using the mint modal:

```bash
VITE_WZKLTC_CONTRACT_ADDRESS=0x...
VITE_WZKLTC_CHAIN_ID=
VITE_WZKLTC_RPC_URL=https://...
VITE_ZKLTC_TOKEN_ADDRESS=
VITE_WZKLTC_SOURCE_CHAIN_NAME=Liteforge
VITE_WZKLTC_DEST_CHAIN_NAME=Wrapped zkLTC
VITE_WZKLTC_CONTRACT_LABEL=Wrapped zkLTC
```

The modal reads the source-side balance through `VITE_WZKLTC_RPC_URL`. If `VITE_ZKLTC_TOKEN_ADDRESS` is set, it reads `balanceOf` from that token; otherwise it reads the native balance on that chain. Minted `WZKLTC` returns to the connected wallet.
