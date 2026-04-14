#!/usr/bin/env node
/**
 * Seed the Ayni vault with USDC liquidity.
 *
 * Usage:
 *   node scripts/seed-vault.js <amount>
 *
 * Example:
 *   node scripts/seed-vault.js 1000        # sends 1000 USDC
 *   node scripts/seed-vault.js 500.50      # sends 500.50 USDC
 *
 * Reads from .env: TEST_WALLET_PK, VITE_PUBLIC_RPC_URL,
 *   VITE_AYNI_PROTOCOL_ADDRESS, VITE_WZKLTC_CONTRACT_ADDRESS,
 *   VITE_AYNI_DEBT_TOKEN_ADDRESS
 */

import { createPublicClient, createWalletClient, http, parseUnits, formatUnits, isAddress } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// ---------------------------------------------------------------------------
// Load .env manually (no dotenv dependency needed)
// ---------------------------------------------------------------------------
const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '../.env')
const env = {}

try {
  const raw = readFileSync(envPath, 'utf8')
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const value = trimmed.slice(eq + 1).trim()
    env[key] = value
  }
} catch {
  console.error('Could not read .env file at', envPath)
  process.exit(1)
}

// ---------------------------------------------------------------------------
// Validate args
// ---------------------------------------------------------------------------
const amountArg = process.argv[2]
if (!amountArg) {
  console.error('Usage: node scripts/seed-vault.js <amount>')
  console.error('Example: node scripts/seed-vault.js 1000')
  process.exit(1)
}

const PRIVATE_KEY   = env.TEST_WALLET_PK
const RPC_URL       = env.VITE_PUBLIC_RPC_URL
const PROTOCOL_ADDR = env.VITE_AYNI_PROTOCOL_ADDRESS
const COLLATERAL    = env.VITE_WZKLTC_CONTRACT_ADDRESS
const DEBT_TOKEN    = env.VITE_AYNI_DEBT_TOKEN_ADDRESS

const missing = [
  ['TEST_WALLET_PK', PRIVATE_KEY],
  ['VITE_PUBLIC_RPC_URL', RPC_URL],
  ['VITE_AYNI_PROTOCOL_ADDRESS', PROTOCOL_ADDR],
  ['VITE_WZKLTC_CONTRACT_ADDRESS', COLLATERAL],
  ['VITE_AYNI_DEBT_TOKEN_ADDRESS', DEBT_TOKEN],
].filter(([, v]) => !v).map(([k]) => k)

if (missing.length) {
  console.error('Missing required .env values:', missing.join(', '))
  process.exit(1)
}

const pk = PRIVATE_KEY.startsWith('0x') ? PRIVATE_KEY : `0x${PRIVATE_KEY}`

// ---------------------------------------------------------------------------
// ABIs (minimal)
// ---------------------------------------------------------------------------
const ERC20_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
]

const PROTOCOL_ABI = [
  {
    inputs: [
      { name: 'collateral_token', type: 'address' },
      { name: 'debt_asset', type: 'address' },
    ],
    name: 'get_market',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'collateral_token', type: 'address' },
      { name: 'debt_asset', type: 'address' },
    ],
    name: 'available_liquidity',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
]

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const account = privateKeyToAccount(pk)
const publicClient = createPublicClient({ transport: http(RPC_URL) })
const walletClient = createWalletClient({ account, transport: http(RPC_URL) })

console.log('\nAyni Vault USDC Seeder')
console.log('======================')
console.log('Sender  :', account.address)
console.log('RPC     :', RPC_URL)

// Resolve vault address
const vaultAddress = await publicClient.readContract({
  address: PROTOCOL_ADDR,
  abi: PROTOCOL_ABI,
  functionName: 'get_market',
  args: [COLLATERAL, DEBT_TOKEN],
})

if (vaultAddress === '0x0000000000000000000000000000000000000000') {
  console.error('\nMarket not initialized yet — get_market() returned zero address.')
  console.error('The protocol owner must create the market before seeding liquidity.')
  process.exit(1)
}

console.log('Vault   :', vaultAddress)

// Fetch USDC decimals and balances
const [decimals, senderBalance, vaultBefore] = await Promise.all([
  publicClient.readContract({ address: DEBT_TOKEN, abi: ERC20_ABI, functionName: 'decimals' }),
  publicClient.readContract({ address: DEBT_TOKEN, abi: ERC20_ABI, functionName: 'balanceOf', args: [account.address] }),
  publicClient.readContract({ address: DEBT_TOKEN, abi: ERC20_ABI, functionName: 'balanceOf', args: [vaultAddress] }),
])

const liquidityBefore = await publicClient.readContract({
  address: PROTOCOL_ADDR,
  abi: PROTOCOL_ABI,
  functionName: 'available_liquidity',
  args: [COLLATERAL, DEBT_TOKEN],
})

console.log('\nUSDC decimals       :', decimals)
console.log('Sender balance      :', formatUnits(senderBalance, decimals), 'USDC')
console.log('Vault balance before:', formatUnits(vaultBefore, decimals), 'USDC')
console.log('Available liquidity :', formatUnits(liquidityBefore, decimals), 'USDC')

// Parse amount
let amount
try {
  amount = parseUnits(amountArg, decimals)
} catch {
  console.error(`\nInvalid amount: "${amountArg}"`)
  process.exit(1)
}

if (amount <= 0n) {
  console.error('\nAmount must be greater than zero.')
  process.exit(1)
}

if (amount > senderBalance) {
  console.error(`\nInsufficient balance: need ${formatUnits(amount, decimals)} USDC, have ${formatUnits(senderBalance, decimals)} USDC`)
  process.exit(1)
}

console.log('\nSending', formatUnits(amount, decimals), 'USDC to vault...')

// Send transfer
const hash = await walletClient.writeContract({
  address: DEBT_TOKEN,
  abi: ERC20_ABI,
  functionName: 'transfer',
  args: [vaultAddress, amount],
})

console.log('Tx hash :', hash)
console.log('Waiting for receipt...')

const receipt = await publicClient.waitForTransactionReceipt({ hash })
console.log('Status  :', receipt.status === 'success' ? 'SUCCESS' : 'FAILED')
console.log('Block   :', receipt.blockNumber.toString())

if (receipt.status !== 'success') {
  console.error('\nTransaction reverted.')
  process.exit(1)
}

// Confirm new balances
const [vaultAfter, liquidityAfter] = await Promise.all([
  publicClient.readContract({ address: DEBT_TOKEN, abi: ERC20_ABI, functionName: 'balanceOf', args: [vaultAddress] }),
  publicClient.readContract({ address: PROTOCOL_ADDR, abi: PROTOCOL_ABI, functionName: 'available_liquidity', args: [COLLATERAL, DEBT_TOKEN] }),
])

console.log('\nVault balance after :', formatUnits(vaultAfter, decimals), 'USDC')
console.log('Available liquidity :', formatUnits(liquidityAfter, decimals), 'USDC')
console.log('\nDone.')
