# Ayni Frontend

Dashboard and contract-first WZKLTC deposit flow for the Ayni prototype.

## Local setup

```bash
bun install
bun run dev
```

## Dashboard gate

Landing CTAs route to `/dashboard/`, and solver liquidity lives at `/solver/`. The password gate protects both pages whenever `DASHBOARD_PASSWORD` is set, unless you explicitly disable it:

```bash
DASHBOARD_PASSWORD=your-password
DASHBOARD_PASSWORD_ENABLED=true
DASHBOARD_USERNAME=
```

These values are read by `middleware.js`, so they are not bundled into the browser. Set `DASHBOARD_PASSWORD_ENABLED=false` to keep the dashboards open.

## Protocol config

Copy `.env.example` to `.env` and set the public chain config plus Ayni market addresses before using the dashboard:

```bash
VITE_AYNI_PROTOCOL_ADDRESS=0x...
VITE_AYNI_NETWORK_NAME=LitVM Testnet
VITE_AYNI_DEBT_TOKEN_ADDRESS=0x... # USDC
VITE_SOLVER_POOL_ADDRESS=0x... # optional, otherwise read from AyniProtocol
VITE_PUBLIC_RPC_URL=https://...
VITE_PUBLIC_CHAIN_ID=
```

The dashboard reads one collateral market from `AyniProtocol`: supplied asset `WZKLTC`, borrowed asset `USDC`. It uses `VITE_WZKLTC_CONTRACT_ADDRESS` as the WZKLTC balance/collateral token unless you explicitly set a different `VITE_AYNI_COLLATERAL_TOKEN_ADDRESS`, loads the market address through `get_market(collateral, debt)`, reads position data from that vault, approves the vault for supply, and sends `deposit` / `borrow` through the protocol router.

The solver dashboard reads `AyniSolverPool`: total assets, utilization, borrow rate, reserves, wallet shares, cooldown state, deposit/redeem limits, and `fill_with_pool(orderId)`. It uses `VITE_SOLVER_POOL_ADDRESS` when present; otherwise it resolves the pool through `AyniProtocol.get_solver_pool(WZKLTC, USDC)`.

## Wrapper contract config

Copy `.env.example` to `.env` and set the wrapper deployment address before using the deposit modal:

```bash
VITE_WZKLTC_CONTRACT_ADDRESS=0xdB7a824F2662585dd452021801cdEBF0A4b8586e
VITE_WZKLTC_DEPOSIT_CONTRACT_ADDRESS=0x60A84eBC3483fEFB251B76Aea5B8458026Ef4bea
VITE_PUBLIC_RPC_URL=https://liteforge.rpc.caldera.xyz/http
VITE_PUBLIC_CHAIN_ID=4441
VITE_WZKLTC_SOURCE_CHAIN_NAME=Liteforge
VITE_WZKLTC_DEST_CHAIN_NAME=Wrapped zkLTC
VITE_WZKLTC_CONTRACT_LABEL=Wrapped zkLTC
```

The modal reads the native zkLTC balance through `VITE_PUBLIC_RPC_URL` and sends a payable `deposit()` transaction to `VITE_WZKLTC_DEPOSIT_CONTRACT_ADDRESS`, equivalent to:

```bash
cast send 0x60A84eBC3483fEFB251B76Aea5B8458026Ef4bea \
  "deposit()" \
  --value 0.01ether \
  --rpc-url https://liteforge.rpc.caldera.xyz/http \
  --account ayni
```

Wrapped `WZKLTC` returns to the connected wallet.
