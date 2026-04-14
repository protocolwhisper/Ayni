/**
 * Contract read tests — hits the live Liteforge RPC (chain 4441).
 * Run only when you have network access: vitest run --reporter=verbose tests/contract
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { createPublicClient, http, isAddress, zeroAddress } from 'viem'

const RPC_URL = import.meta.env.VITE_PUBLIC_RPC_URL
const AYNI_PROTOCOL_ADDRESS = import.meta.env.VITE_AYNI_PROTOCOL_ADDRESS
const COLLATERAL_TOKEN_ADDRESS = import.meta.env.VITE_WZKLTC_CONTRACT_ADDRESS
const DEBT_TOKEN_ADDRESS = import.meta.env.VITE_AYNI_DEBT_TOKEN_ADDRESS ?? ''

const client = createPublicClient({ transport: http(RPC_URL) })

const AYNI_PROTOCOL_ABI = [
  {
    inputs: [
      { internalType: 'address', name: 'collateral_token', type: 'address' },
      { internalType: 'address', name: 'debt_asset', type: 'address' },
    ],
    name: 'get_market',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'collateral_token', type: 'address' },
      { internalType: 'address', name: 'debt_asset', type: 'address' },
    ],
    name: 'available_liquidity',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
]

const AYNI_VAULT_ABI = [
  {
    inputs: [],
    name: 'annual_interest_bps',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'paused',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
]

const ERC20_ABI = [
  {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
]

// ---------------------------------------------------------------------------
// RPC reachability
// ---------------------------------------------------------------------------
describe('RPC / chain', () => {
  it('resolves chain ID 4441', async () => {
    const chainId = await client.getChainId()
    expect(chainId).toBe(4441)
  })

  it('returns a block number', async () => {
    const block = await client.getBlockNumber()
    expect(block).toBeGreaterThan(0n)
  })
})

// ---------------------------------------------------------------------------
// WZKLTC contract smoke test
// ---------------------------------------------------------------------------
describe('WZKLTC contract', () => {
  it('is a valid address', () => {
    expect(isAddress(COLLATERAL_TOKEN_ADDRESS)).toBe(true)
  })

  it('balanceOf(zeroAddress) returns a BigInt', async () => {
    const balance = await client.readContract({
      address: COLLATERAL_TOKEN_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [zeroAddress],
    })
    expect(typeof balance).toBe('bigint')
    expect(balance).toBeGreaterThanOrEqual(0n)
  })
})

// ---------------------------------------------------------------------------
// Ayni Protocol contract
// ---------------------------------------------------------------------------
describe('Ayni Protocol', () => {
  it('protocol address is valid', () => {
    expect(isAddress(AYNI_PROTOCOL_ADDRESS)).toBe(true)
  })

  it.skipIf(!DEBT_TOKEN_ADDRESS)('get_market call resolves (returns address)', async () => {
    // Pre-launch: market may not be initialized yet — zeroAddress is acceptable.
    // Post-initialization: expect a non-zero vault address here.
    const market = await client.readContract({
      address: AYNI_PROTOCOL_ADDRESS,
      abi: AYNI_PROTOCOL_ABI,
      functionName: 'get_market',
      args: [COLLATERAL_TOKEN_ADDRESS, DEBT_TOKEN_ADDRESS],
    })
    expect(isAddress(market)).toBe(true)
    // TODO: uncomment after market is initialized on-chain:
    // expect(market).not.toBe(zeroAddress)
  })

  it.skipIf(!DEBT_TOKEN_ADDRESS)('available_liquidity is accessible once market is initialized', async () => {
    const market = await client.readContract({
      address: AYNI_PROTOCOL_ADDRESS,
      abi: AYNI_PROTOCOL_ABI,
      functionName: 'get_market',
      args: [COLLATERAL_TOKEN_ADDRESS, DEBT_TOKEN_ADDRESS],
    })

    if (market === zeroAddress) {
      // Market not yet initialized — skip liquidity check
      return
    }

    const liquidity = await client.readContract({
      address: AYNI_PROTOCOL_ADDRESS,
      abi: AYNI_PROTOCOL_ABI,
      functionName: 'available_liquidity',
      args: [COLLATERAL_TOKEN_ADDRESS, DEBT_TOKEN_ADDRESS],
    })
    expect(typeof liquidity).toBe('bigint')
    expect(liquidity).toBeGreaterThanOrEqual(0n)
  })
})

// ---------------------------------------------------------------------------
// Ayni Vault (market contract) — only runs after market is initialized on-chain
// ---------------------------------------------------------------------------
describe.skipIf(!DEBT_TOKEN_ADDRESS)('Ayni Vault', () => {
  let marketAddress

  beforeAll(async () => {
    marketAddress = await client.readContract({
      address: AYNI_PROTOCOL_ADDRESS,
      abi: AYNI_PROTOCOL_ABI,
      functionName: 'get_market',
      args: [COLLATERAL_TOKEN_ADDRESS, DEBT_TOKEN_ADDRESS],
    })
  })

  it('vault is not paused pre-launch', async () => {
    if (marketAddress === zeroAddress) {
      console.warn('Market not initialized — vault paused check skipped')
      return
    }
    const paused = await client.readContract({
      address: marketAddress,
      abi: AYNI_VAULT_ABI,
      functionName: 'paused',
    })
    expect(paused).toBe(false)
  })

  it('annual_interest_bps is a reasonable value (0–5000 bps)', async () => {
    if (marketAddress === zeroAddress) {
      console.warn('Market not initialized — interest rate check skipped')
      return
    }
    const bps = await client.readContract({
      address: marketAddress,
      abi: AYNI_VAULT_ABI,
      functionName: 'annual_interest_bps',
    })
    expect(bps).toBeGreaterThanOrEqual(0n)
    expect(bps).toBeLessThanOrEqual(5000n)
  })
})
