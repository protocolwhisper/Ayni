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
VITE_WZKLTC_SOURCE_CHAIN_NAME=Liteforge
VITE_WZKLTC_DEST_CHAIN_NAME=Wrapped zkLTC
VITE_WZKLTC_CONTRACT_LABEL=Wrapped zkLTC
```

The modal calls the wrapper contract with the standard WETH-style `deposit()` flow, so minted `WZKLTC` returns to the connected wallet.
