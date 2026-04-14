import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    exclude: ['tests/e2e/**', 'node_modules/**'],
    env: {
      VITE_PUBLIC_RPC_URL: 'https://liteforge.rpc.caldera.xyz/http',
      VITE_PUBLIC_CHAIN_ID: '4441',
      VITE_AYNI_PROTOCOL_ADDRESS: '0xcd02907e3677f7726f4a062001b08215394bc07c',
      VITE_WZKLTC_CONTRACT_ADDRESS: '0xdb7a824f2662585dd452021801cdebf0a4b8586e',
      VITE_AYNI_NETWORK_NAME: 'LitVM Testnet',
      VITE_WZKLTC_SOURCE_CHAIN_NAME: 'Liteforge',
      VITE_WZKLTC_DEST_CHAIN_NAME: 'Wrapped zkLTC',
      VITE_WZKLTC_CONTRACT_LABEL: 'Wrapped zkLTC',
      VITE_AYNI_DEBT_TOKEN_ADDRESS: '0x48D89Bd5B1FC923967ebB5803E5e58Ea8fcE76B3',
    },
  },
})
