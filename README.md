# Ayni Frontend

Dashboard and contract-first WZKLTC mint flow for the Ayni prototype.

## Local setup

```bash
bun install
bun run dev
```

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
