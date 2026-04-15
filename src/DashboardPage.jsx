import { useEffect, useMemo, useState } from 'react'
import {
  createPublicClient,
  encodeFunctionData,
  formatUnits,
  http,
  isAddress,
  maxUint256,
  parseUnits,
  zeroAddress,
} from 'viem'
import './DashboardPage.css'
import WrappedBridgeModal from './WrappedBridgeModal.jsx'
import {
  calculateEncumberedCollateral,
  calculateMaxWithdrawableCollateral,
  calculateProjectedHealthFactorAfterWithdraw,
  calculateRepayCap,
  validateRepayAmount,
  validateWithdrawAmount,
  WITHDRAW_HEALTH_FACTOR_MIN,
} from './lendingMath.js'
import {
  MAX_HEALTH_FACTOR,
  formatHealthFactorLabel,
  formatTokenAmount,
  formatUsdAmount,
  hexValue,
  minBigInt,
  shortAddress,
} from './utils.js'
import {
  clearWalletDisconnected,
  markWalletDisconnected,
  readWalletSessionSync,
} from './walletSession.js'

const DOCS_URL = 'https://liteforge.hub.caldera.xyz/'
const DEFAULT_PUBLIC_RPC_URL = 'https://liteforge.rpc.caldera.xyz/http'
const DEFAULT_PUBLIC_CHAIN_ID = 4441
const DEFAULT_WZKLTC_CONTRACT_ADDRESS = '0xdB7a824F2662585dd452021801cdEBF0A4b8586e'
const ZERO_ORDER_ID = `0x${'0'.repeat(64)}`
const CLAIM_STATUS_OPEN = 1
const CLAIM_STATUS_FILLED = 2

const PUBLIC_RPC_URL = import.meta.env.VITE_PUBLIC_RPC_URL || import.meta.env.VITE_WZKLTC_RPC_URL || DEFAULT_PUBLIC_RPC_URL
const PUBLIC_CHAIN_ID =
  Number.parseInt(import.meta.env.VITE_PUBLIC_CHAIN_ID || import.meta.env.VITE_WZKLTC_CHAIN_ID || '', 10) ||
  DEFAULT_PUBLIC_CHAIN_ID
const AYNI_PROTOCOL_ADDRESS = import.meta.env.VITE_AYNI_PROTOCOL_ADDRESS ?? ''
const AYNI_RPC_URL = import.meta.env.VITE_AYNI_RPC_URL || PUBLIC_RPC_URL
const AYNI_CHAIN_ID = Number.parseInt(import.meta.env.VITE_AYNI_CHAIN_ID || '', 10) || PUBLIC_CHAIN_ID
const AYNI_NETWORK_NAME = import.meta.env.VITE_AYNI_NETWORK_NAME ?? 'LitVM Testnet'
const COLLATERAL_TOKEN_ADDRESS =
  import.meta.env.VITE_AYNI_COLLATERAL_TOKEN_ADDRESS ||
  import.meta.env.VITE_WZKLTC_CONTRACT_ADDRESS ||
  DEFAULT_WZKLTC_CONTRACT_ADDRESS
const DEBT_TOKEN_ADDRESS = import.meta.env.VITE_AYNI_DEBT_TOKEN_ADDRESS || ''

const COLLATERAL_ASSET = {
  symbol: 'WzkLTC',
  name: 'Wrapped zkLTC',
  apy: '0.00%',
  collateral: true,
}

const DEBT_ASSET = {
  symbol: 'USDC',
  name: 'USD Coin',
}

const ERC20_ABI = [
  {
    inputs: [{ internalType: 'address', name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'owner', type: 'address' },
      { internalType: 'address', name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'spender', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
]

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
      { internalType: 'address', name: 'user', type: 'address' },
    ],
    name: 'health_factor',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'collateral_token', type: 'address' },
      { internalType: 'address', name: 'debt_asset', type: 'address' },
      { internalType: 'address', name: 'user', type: 'address' },
    ],
    name: 'collateral_usd',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'collateral_token', type: 'address' },
      { internalType: 'address', name: 'debt_asset', type: 'address' },
      { internalType: 'address', name: 'user', type: 'address' },
    ],
    name: 'max_borrow',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
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
  {
    inputs: [
      { internalType: 'address', name: 'collateral_token', type: 'address' },
      { internalType: 'address', name: 'debt_asset', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'deposit',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'collateral_token', type: 'address' },
      { internalType: 'address', name: 'debt_asset', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'withdraw',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'collateral_token', type: 'address' },
      { internalType: 'address', name: 'debt_asset', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'borrow',
    outputs: [{ internalType: 'bytes32', name: 'order_id', type: 'bytes32' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'collateral_token', type: 'address' },
      { internalType: 'address', name: 'debt_asset', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'repay',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'order_id', type: 'bytes32' }],
    name: 'get_debt_position',
    outputs: [
      { internalType: 'address', name: 'vault', type: 'address' },
      { internalType: 'address', name: 'borrower', type: 'address' },
      { internalType: 'address', name: 'recipient', type: 'address' },
      { internalType: 'address', name: 'collateral_token', type: 'address' },
      { internalType: 'address', name: 'debt_asset', type: 'address' },
      { internalType: 'uint256', name: 'principal', type: 'uint256' },
      { internalType: 'uint256', name: 'protocol_fee_bps', type: 'uint256' },
      { internalType: 'uint256', name: 'fill_deadline', type: 'uint256' },
      { internalType: 'uint256', name: 'filled_at', type: 'uint256' },
      { internalType: 'bytes32', name: 'expected_fill_hash', type: 'bytes32' },
      { internalType: 'uint8', name: 'status', type: 'uint8' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
]

const AYNI_VAULT_ABI = [
  {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'positions',
    outputs: [
      { internalType: 'uint256', name: 'collateral', type: 'uint256' },
      { internalType: 'uint256', name: 'debt', type: 'uint256' },
      { internalType: 'uint256', name: 'last_update', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
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
  {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'active_solver_order',
    outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
]


function createEmptyDashboardState() {
  return {
    protocolChainId: AYNI_CHAIN_ID,
    marketAddress: zeroAddress,
    collateralDecimals: 18,
    debtDecimals: 6,
    walletBalance: 0n,
    debtWalletBalance: 0n,
    debtAllowance: 0n,
    userCollateral: 0n,
    userDebt: 0n,
    collateralUsd: 0n,
    healthFactor: 0n,
    maxBorrow: 0n,
    availableLiquidity: 0n,
    annualInterestBps: 0n,
    marketPaused: false,
    activeOrderId: ZERO_ORDER_ID,
    activeOrderPrincipal: 0n,
    activeOrderFillDeadline: 0n,
    activeOrderFilledAt: 0n,
    activeOrderStatus: 0,
    loading: true,
    ready: false,
  }
}

export default function DashboardPage() {
  const [isConnecting, setIsConnecting] = useState(false)
  const [isBridgeOpen, setIsBridgeOpen] = useState(false)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [actionModal, setActionModal] = useState({ type: '', value: '', error: '' })
  const [walletStatus, setWalletStatus] = useState('')
  const [walletAddress, setWalletAddress] = useState('')
  const [walletChainId, setWalletChainId] = useState(null)
  const [showZeroBalances, setShowZeroBalances] = useState(true)
  const [dashboardMessage, setDashboardMessage] = useState({ tone: '', text: '' })
  const [pendingAction, setPendingAction] = useState('')
  const [refreshNonce, setRefreshNonce] = useState(0)
  const [dashboardState, setDashboardState] = useState(createEmptyDashboardState)

  const tokenBalanceConfigured = Boolean(AYNI_RPC_URL) && isAddress(COLLATERAL_TOKEN_ADDRESS)
  const protocolConfigured =
    tokenBalanceConfigured && isAddress(AYNI_PROTOCOL_ADDRESS) && isAddress(DEBT_TOKEN_ADDRESS)

  const publicClient = useMemo(() => {
    if (!tokenBalanceConfigured) return null

    return createPublicClient({
      transport: http(AYNI_RPC_URL),
    })
  }, [tokenBalanceConfigured])

  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) return undefined

    const initialSession = readWalletSessionSync()
    setWalletAddress(initialSession.walletAddress)
    setWalletChainId(initialSession.walletChainId)
    setWalletStatus(initialSession.walletAddress ? `Connected ${shortAddress(initialSession.walletAddress)}` : '')

    function handleAccountsChanged(accounts) {
      const nextWallet = readWalletSessionSync().walletAddress || (accounts?.[0] ?? '')
      setWalletAddress(nextWallet)
      setWalletStatus(nextWallet ? `Connected ${shortAddress(nextWallet)}` : 'Wallet disconnected.')
    }

    function handleChainChanged(chainHex) {
      setWalletChainId(Number.parseInt(chainHex, 16))
    }

    window.ethereum.on?.('accountsChanged', handleAccountsChanged)
    window.ethereum.on?.('chainChanged', handleChainChanged)

    return () => {
      window.ethereum.removeListener?.('accountsChanged', handleAccountsChanged)
      window.ethereum.removeListener?.('chainChanged', handleChainChanged)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadDashboard() {
      if (!publicClient) {
        if (!cancelled) {
          setDashboardState(() => ({
            ...createEmptyDashboardState(),
            loading: false,
            ready: false,
          }))
        }
        return
      }

      try {
        if (!protocolConfigured) {
          const [protocolChainId, collateralDecimals, walletBalance] = await Promise.all([
            publicClient.getChainId(),
            publicClient.readContract({
              address: COLLATERAL_TOKEN_ADDRESS,
              abi: ERC20_ABI,
              functionName: 'decimals',
            }),
            walletAddress
              ? publicClient.readContract({
                  address: COLLATERAL_TOKEN_ADDRESS,
                  abi: ERC20_ABI,
                  functionName: 'balanceOf',
                  args: [walletAddress],
                })
              : Promise.resolve(0n),
          ])

          if (cancelled) return

          setDashboardState({
            ...createEmptyDashboardState(),
            protocolChainId,
            collateralDecimals,
            walletBalance,
            loading: false,
            ready: false,
          })
          return
        }

        const [protocolChainId, collateralDecimals, debtDecimals, marketAddress, walletBalance] = await Promise.all([
          publicClient.getChainId(),
          publicClient.readContract({
            address: COLLATERAL_TOKEN_ADDRESS,
            abi: ERC20_ABI,
            functionName: 'decimals',
          }),
          publicClient.readContract({
            address: DEBT_TOKEN_ADDRESS,
            abi: ERC20_ABI,
            functionName: 'decimals',
          }),
          publicClient.readContract({
            address: AYNI_PROTOCOL_ADDRESS,
            abi: AYNI_PROTOCOL_ABI,
            functionName: 'get_market',
            args: [COLLATERAL_TOKEN_ADDRESS, DEBT_TOKEN_ADDRESS],
          }),
          walletAddress
            ? publicClient.readContract({
                address: COLLATERAL_TOKEN_ADDRESS,
                abi: ERC20_ABI,
                functionName: 'balanceOf',
                args: [walletAddress],
              })
            : Promise.resolve(0n),
        ])

        if (cancelled) return

        if (marketAddress === zeroAddress) {
          setDashboardState({
            ...createEmptyDashboardState(),
            protocolChainId,
            collateralDecimals,
            debtDecimals,
            walletBalance,
            loading: false,
            ready: false,
          })
          return
        }

        const [
          availableLiquidity,
          annualInterestBps,
          marketPaused,
          debtWalletBalance,
          debtAllowance,
          positions,
          collateralUsd,
          healthFactor,
          maxBorrow,
          activeOrderId,
        ] = await Promise.all([
          publicClient.readContract({
            address: AYNI_PROTOCOL_ADDRESS,
            abi: AYNI_PROTOCOL_ABI,
            functionName: 'available_liquidity',
            args: [COLLATERAL_TOKEN_ADDRESS, DEBT_TOKEN_ADDRESS],
          }),
          publicClient.readContract({
            address: marketAddress,
            abi: AYNI_VAULT_ABI,
            functionName: 'annual_interest_bps',
          }),
          publicClient.readContract({
            address: marketAddress,
            abi: AYNI_VAULT_ABI,
            functionName: 'paused',
          }),
          walletAddress
            ? publicClient.readContract({
                address: DEBT_TOKEN_ADDRESS,
                abi: ERC20_ABI,
                functionName: 'balanceOf',
                args: [walletAddress],
              })
            : Promise.resolve(0n),
          walletAddress
            ? publicClient.readContract({
                address: DEBT_TOKEN_ADDRESS,
                abi: ERC20_ABI,
                functionName: 'allowance',
                args: [walletAddress, AYNI_PROTOCOL_ADDRESS],
              })
            : Promise.resolve(0n),
          walletAddress
            ? publicClient.readContract({
                address: marketAddress,
                abi: AYNI_VAULT_ABI,
                functionName: 'positions',
                args: [walletAddress],
              })
            : Promise.resolve([0n, 0n, 0n]),
          walletAddress
            ? publicClient.readContract({
                address: AYNI_PROTOCOL_ADDRESS,
                abi: AYNI_PROTOCOL_ABI,
                functionName: 'collateral_usd',
                args: [COLLATERAL_TOKEN_ADDRESS, DEBT_TOKEN_ADDRESS, walletAddress],
              })
            : Promise.resolve(0n),
          walletAddress
            ? publicClient.readContract({
                address: AYNI_PROTOCOL_ADDRESS,
                abi: AYNI_PROTOCOL_ABI,
                functionName: 'health_factor',
                args: [COLLATERAL_TOKEN_ADDRESS, DEBT_TOKEN_ADDRESS, walletAddress],
              })
            : Promise.resolve(0n),
          walletAddress
            ? publicClient.readContract({
                address: AYNI_PROTOCOL_ADDRESS,
                abi: AYNI_PROTOCOL_ABI,
                functionName: 'max_borrow',
                args: [COLLATERAL_TOKEN_ADDRESS, DEBT_TOKEN_ADDRESS, walletAddress],
              })
            : Promise.resolve(0n),
          walletAddress
            ? publicClient.readContract({
                address: marketAddress,
                abi: AYNI_VAULT_ABI,
                functionName: 'active_solver_order',
                args: [walletAddress],
              })
            : Promise.resolve(ZERO_ORDER_ID),
        ])

        const activeOrderPosition =
          walletAddress && activeOrderId !== ZERO_ORDER_ID
            ? await publicClient.readContract({
                address: AYNI_PROTOCOL_ADDRESS,
                abi: AYNI_PROTOCOL_ABI,
                functionName: 'get_debt_position',
                args: [activeOrderId],
              })
            : null

        if (cancelled) return

        setDashboardState({
          protocolChainId,
          marketAddress,
          collateralDecimals,
          debtDecimals,
          walletBalance,
          debtWalletBalance,
          debtAllowance,
          userCollateral: positions[0],
          userDebt: positions[1],
          collateralUsd,
          healthFactor,
          maxBorrow,
          availableLiquidity,
          annualInterestBps,
          marketPaused,
          activeOrderId,
          activeOrderPrincipal: activeOrderPosition?.[5] ?? 0n,
          activeOrderFillDeadline: activeOrderPosition?.[7] ?? 0n,
          activeOrderFilledAt: activeOrderPosition?.[8] ?? 0n,
          activeOrderStatus: activeOrderPosition?.[10] ?? 0,
          loading: false,
          ready: true,
        })
      } catch {
        if (!cancelled) {
          setDashboardState((current) => ({
            ...current,
            loading: false,
            ready: false,
          }))
        }
      }
    }

    loadDashboard()

    return () => {
      cancelled = true
    }
  }, [protocolConfigured, publicClient, refreshNonce, walletAddress])

  async function handleConnectWallet() {
    if (typeof window === 'undefined' || !window.ethereum?.request) {
      setWalletStatus('No compatible wallet was detected.')
      return
    }

    setIsConnecting(true)
    try {
      clearWalletDisconnected()
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
      const nextWallet = accounts?.[0] ?? ''
      const nextChain = window.ethereum.chainId ? Number.parseInt(window.ethereum.chainId, 16) : null
      setWalletAddress(nextWallet)
      setWalletChainId(nextChain)
      setWalletStatus(nextWallet ? `Connected ${shortAddress(nextWallet)}` : 'Wallet connected.')
    } catch (error) {
      const rejected = error?.code === 4001
      setWalletStatus(rejected ? 'Wallet connection was cancelled.' : 'Unable to connect wallet.')
    } finally {
      setIsConnecting(false)
    }
  }

  async function handleDisconnectWallet() {
    markWalletDisconnected()

    try {
      await window.ethereum?.request?.({
        method: 'wallet_revokePermissions',
        params: [{ eth_accounts: {} }],
      })
    } catch {
      // Most injected wallets do not support programmatic disconnect; clearing the app session is enough here.
    }

    setWalletAddress('')
    setWalletChainId(null)
    setWalletStatus('Wallet disconnected.')
    setIsBridgeOpen(false)
  }

  async function handleWalletButton() {
    if (walletAddress) {
      await handleDisconnectWallet()
      return
    }

    await handleConnectWallet()
  }

  function handleOpenBridge() {
    setIsBridgeOpen(true)
    if (!walletAddress) {
      setWalletStatus('Connect your wallet to wrap zkLTC.')
    }
  }

  async function ensureProtocolChain() {
    if (typeof window === 'undefined' || !window.ethereum?.request) return false

    const targetChainId = dashboardState.protocolChainId ?? AYNI_CHAIN_ID
    if (!targetChainId) return true
    if (walletChainId === targetChainId) return true

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: hexValue(BigInt(targetChainId)) }],
      })
      setWalletChainId(targetChainId)
      return true
    } catch (error) {
      const rejected = error?.code === 4001
      setDashboardMessage({
        tone: 'warning',
        text: rejected ? 'Chain switch was cancelled.' : `Switch your wallet to chain ${targetChainId}.`,
      })
      return false
    }
  }

  async function sendTransaction({ to, data }) {
    const gasPrice = await publicClient.getGasPrice()
    const gasPriceHex = `0x${gasPrice.toString(16)}`

    let gas
    try {
      const gasEstimate = await publicClient.estimateGas({ account: walletAddress, to, data })
      gas = `0x${((gasEstimate * 130n) / 100n).toString(16)}`
    } catch {
      gas = '0x7A120' // 500 000 fallback
    }

    const hash = await window.ethereum.request({
      method: 'eth_sendTransaction',
      params: [{ from: walletAddress, to, data, gas, gasPrice: gasPriceHex }],
    })
    await publicClient.waitForTransactionReceipt({ hash })
    return hash
  }

  function closeActionModal() {
    setActionModal({ type: '', value: '', error: '' })
  }

  async function handleSupply() {
    if (!walletAddress) {
      await handleConnectWallet()
      return
    }

    if (!publicClient || !dashboardState.ready || dashboardState.marketAddress === zeroAddress) {
      setDashboardMessage({ tone: 'warning', text: 'Supply market is not available yet.' })
      return
    }

    if (dashboardState.marketPaused) {
      setDashboardMessage({ tone: 'warning', text: 'The market is currently paused.' })
      return
    }

    setActionModal({ type: 'supply', value: '', error: '' })
  }

  async function handleBorrow() {
    if (!walletAddress) {
      await handleConnectWallet()
      return
    }

    if (!publicClient || !dashboardState.ready || dashboardState.marketAddress === zeroAddress) {
      setDashboardMessage({ tone: 'warning', text: 'Borrow market is not available yet.' })
      return
    }

    if (dashboardState.marketPaused) {
      setDashboardMessage({ tone: 'warning', text: 'Borrowing is currently paused.' })
      return
    }

    if (dashboardState.activeOrderId !== ZERO_ORDER_ID) {
      setDashboardMessage({
        tone: 'warning',
        text:
          dashboardState.activeOrderStatus === CLAIM_STATUS_OPEN
            ? 'Borrow request pending. Wait for solver fill before borrowing again.'
            : 'Active debt exists. Repay your outstanding USDC before opening a new borrow.',
      })
      return
    }

    if (dashboardState.maxBorrow <= 0n) {
      setDashboardMessage({ tone: 'warning', text: 'No borrow capacity is available for this wallet yet.' })
      return
    }

    setActionModal({ type: 'borrow', value: '', error: '' })
  }

  async function handleRepay() {
    if (!walletAddress) {
      await handleConnectWallet()
      return
    }

    if (!publicClient || !dashboardState.ready || dashboardState.marketAddress === zeroAddress) {
      setDashboardMessage({ tone: 'warning', text: 'Repay market is not available yet.' })
      return
    }

    if (dashboardState.marketPaused) {
      setDashboardMessage({ tone: 'warning', text: 'Repaying is currently paused.' })
      return
    }

    if (dashboardState.userDebt <= 0n) {
      setDashboardMessage({ tone: 'warning', text: 'No borrow position is available to repay.' })
      return
    }

    setActionModal({ type: 'repay', value: '', error: '' })
  }

  function handleSetSupplyMax() {
    if (dashboardState.walletBalance <= 0n) {
      setActionModal((current) => ({ ...current, error: `You don't have any ${COLLATERAL_ASSET.symbol} to supply.` }))
      return
    }

    setActionModal((current) => ({
      ...current,
      value: formatUnits(dashboardState.walletBalance, dashboardState.collateralDecimals),
      error: '',
    }))
  }

  function handleSetBorrowMax() {
    const borrowCap = minBigInt(dashboardState.maxBorrow, dashboardState.availableLiquidity)
    if (borrowCap <= 0n) {
      setActionModal((current) => ({ ...current, error: `No ${DEBT_ASSET.symbol} borrow capacity available.` }))
      return
    }

    setActionModal((current) => ({
      ...current,
      value: formatUnits(borrowCap, dashboardState.debtDecimals),
      error: '',
    }))
  }

  function handleSetRepayMax() {
    const repayCap = calculateRepayCap(dashboardState.userDebt, dashboardState.debtWalletBalance)
    if (repayCap <= 0n) {
      setActionModal((current) => ({ ...current, error: `You don't have repayable ${DEBT_ASSET.symbol} right now.` }))
      return
    }

    setActionModal((current) => ({
      ...current,
      value: formatUnits(repayCap, dashboardState.debtDecimals),
      error: '',
    }))
  }

  async function handleWithdraw() {
    if (!walletAddress) {
      await handleConnectWallet()
      return
    }

    if (!publicClient || !dashboardState.ready || dashboardState.marketAddress === zeroAddress) {
      setDashboardMessage({ tone: 'warning', text: 'Withdraw market is not available yet.' })
      return
    }

    if (dashboardState.marketPaused) {
      setDashboardMessage({ tone: 'warning', text: 'Withdrawing is currently paused.' })
      return
    }

    if (dashboardState.userCollateral <= 0n) {
      setDashboardMessage({ tone: 'warning', text: 'No supplied collateral is available to withdraw.' })
      return
    }

    setActionModal({ type: 'withdraw', value: '', error: '' })
  }

  function handleSetWithdrawMax() {
    const withdrawCap = calculateMaxWithdrawableCollateral({
      userCollateral: dashboardState.userCollateral,
      userDebt: dashboardState.userDebt,
      healthFactor: dashboardState.healthFactor,
    })
    if (withdrawCap <= 0n) {
      setActionModal((current) => ({
        ...current,
        error: `No ${COLLATERAL_ASSET.symbol} can be safely withdrawn at this health factor.`,
      }))
      return
    }

    setActionModal((current) => ({
      ...current,
      value: formatUnits(withdrawCap, dashboardState.collateralDecimals),
      error: '',
    }))
  }

  async function submitActionModal() {
    const isWithdraw = actionModal.type === 'withdraw'
    const isBorrow = actionModal.type === 'borrow'
    const isRepay = actionModal.type === 'repay'
    const isSupply = actionModal.type === 'supply'
    const decimals = isSupply || isWithdraw ? dashboardState.collateralDecimals : dashboardState.debtDecimals
    const trimmedValue = actionModal.value.trim()
    let amount

    if (!isSupply && !isBorrow && !isRepay && !isWithdraw) return

    try {
      amount = parseUnits(trimmedValue, decimals)
    } catch {
      const actionLabel = isSupply ? 'supply' : (isBorrow ? 'borrow' : (isRepay ? 'repay' : 'withdraw'))
      setActionModal((current) => ({ ...current, error: `Enter a valid ${actionLabel} amount.` }))
      return
    }

    if (amount <= 0n) {
      const actionLabel = isSupply ? 'Supply' : (isBorrow ? 'Borrow' : (isRepay ? 'Repay' : 'Withdraw'))
      setActionModal((current) => ({
        ...current,
        error: `${actionLabel} amount must be greater than zero.`,
      }))
      return
    }

    if (isSupply && amount > dashboardState.walletBalance) {
      setActionModal((current) => ({ ...current, error: 'Supply amount is above your WzkLTC balance.' }))
      return
    }

    const maxWithdrawable = calculateMaxWithdrawableCollateral({
      userCollateral: dashboardState.userCollateral,
      userDebt: dashboardState.userDebt,
      healthFactor: dashboardState.healthFactor,
    })
    const projectedHealthFactor = calculateProjectedHealthFactorAfterWithdraw({
      userCollateral: dashboardState.userCollateral,
      userDebt: dashboardState.userDebt,
      healthFactor: dashboardState.healthFactor,
      withdrawAmount: amount,
      maxHealthFactor: MAX_HEALTH_FACTOR,
    })
    const withdrawValidationError = isWithdraw
      ? validateWithdrawAmount({
          amount,
          userCollateral: dashboardState.userCollateral,
          maxWithdrawable,
          projectedHealthFactor,
          minHealthFactor: WITHDRAW_HEALTH_FACTOR_MIN,
        })
      : ''

    if (withdrawValidationError === 'above_collateral') {
      setActionModal((current) => ({ ...current, error: 'Withdraw amount is above your supplied collateral.' }))
      return
    }
    if (withdrawValidationError === 'above_safe_max') {
      setActionModal((current) => ({
        ...current,
        error: `Withdraw amount exceeds the safe maximum at health factor ${formatHealthFactorLabel(WITHDRAW_HEALTH_FACTOR_MIN)}.`,
      }))
      return
    }
    if (withdrawValidationError === 'below_min_health') {
      setActionModal((current) => ({
        ...current,
        error: `Withdraw amount would drop health factor below ${formatHealthFactorLabel(WITHDRAW_HEALTH_FACTOR_MIN)}.`,
      }))
      return
    }

    if (isBorrow && amount > dashboardState.maxBorrow) {
      setActionModal((current) => ({ ...current, error: 'Borrow amount is above your collateral-backed limit.' }))
      return
    }

    const repayValidationError = isRepay
      ? validateRepayAmount({
          amount,
          userDebt: dashboardState.userDebt,
          debtWalletBalance: dashboardState.debtWalletBalance,
        })
      : ''
    if (repayValidationError === 'above_debt') {
      setActionModal((current) => ({ ...current, error: 'Repay amount is above your outstanding debt.' }))
      return
    }
    if (repayValidationError === 'above_wallet_balance') {
      setActionModal((current) => ({
        ...current,
        error: `Repay amount is above your ${DEBT_ASSET.symbol} wallet balance.`,
      }))
      return
    }

    const canProceed = await ensureProtocolChain()
    if (!canProceed) return

    setPendingAction(actionModal.type)
    setDashboardMessage({ tone: '', text: '' })

    try {
      if (isSupply) {
        const allowance = await publicClient.readContract({
          address: COLLATERAL_TOKEN_ADDRESS,
          abi: ERC20_ABI,
          functionName: 'allowance',
          args: [walletAddress, dashboardState.marketAddress],
        })

        if (allowance < amount) {
          setDashboardMessage({ tone: '', text: `Approve ${COLLATERAL_ASSET.symbol} in your wallet.` })
          await sendTransaction({
            to: COLLATERAL_TOKEN_ADDRESS,
            data: encodeFunctionData({
              abi: ERC20_ABI,
              functionName: 'approve',
              args: [dashboardState.marketAddress, maxUint256],
            }),
          })
        }

        setDashboardMessage({ tone: '', text: `Supplying ${COLLATERAL_ASSET.symbol}...` })
        await sendTransaction({
          to: AYNI_PROTOCOL_ADDRESS,
          data: encodeFunctionData({
            abi: AYNI_PROTOCOL_ABI,
            functionName: 'deposit',
            args: [COLLATERAL_TOKEN_ADDRESS, DEBT_TOKEN_ADDRESS, amount],
          }),
        })

        setDashboardMessage({ tone: 'success', text: `Supplied ${trimmedValue} ${COLLATERAL_ASSET.symbol}.` })
      } else if (isBorrow) {
        const borrowWillBePending = amount > dashboardState.availableLiquidity
        let predictedOrderId = ''

        try {
          const simulation = await publicClient.simulateContract({
            account: walletAddress,
            address: AYNI_PROTOCOL_ADDRESS,
            abi: AYNI_PROTOCOL_ABI,
            functionName: 'borrow',
            args: [COLLATERAL_TOKEN_ADDRESS, DEBT_TOKEN_ADDRESS, amount],
          })
          predictedOrderId = simulation.result
        } catch {
          predictedOrderId = ''
        }

        setDashboardMessage({
          tone: '',
          text: borrowWillBePending
            ? `Opening a borrow request for solver fill...`
            : `Borrowing ${DEBT_ASSET.symbol}...`,
        })
        await sendTransaction({
          to: AYNI_PROTOCOL_ADDRESS,
          data: encodeFunctionData({
            abi: AYNI_PROTOCOL_ABI,
            functionName: 'borrow',
            args: [COLLATERAL_TOKEN_ADDRESS, DEBT_TOKEN_ADDRESS, amount],
          }),
        })

        setDashboardMessage({
          tone: 'success',
          text: borrowWillBePending
            ? `Borrow request pending. Waiting for solver fill${predictedOrderId ? ` (${shortAddress(predictedOrderId)})` : ''}.`
            : `Borrowed ${trimmedValue} ${DEBT_ASSET.symbol}. Debt is active.`,
        })
      } else if (isWithdraw) {
        setDashboardMessage({ tone: '', text: `Withdrawing ${COLLATERAL_ASSET.symbol}...` })
        await sendTransaction({
          to: AYNI_PROTOCOL_ADDRESS,
          data: encodeFunctionData({
            abi: AYNI_PROTOCOL_ABI,
            functionName: 'withdraw',
            args: [COLLATERAL_TOKEN_ADDRESS, DEBT_TOKEN_ADDRESS, amount],
          }),
        })

        setDashboardMessage({ tone: 'success', text: `Withdrew ${trimmedValue} ${COLLATERAL_ASSET.symbol}.` })
      } else {
        const allowance = await publicClient.readContract({
          address: DEBT_TOKEN_ADDRESS,
          abi: ERC20_ABI,
          functionName: 'allowance',
          args: [walletAddress, AYNI_PROTOCOL_ADDRESS],
        })

        if (allowance < amount) {
          setDashboardMessage({ tone: '', text: `Approve ${DEBT_ASSET.symbol} in your wallet.` })
          await sendTransaction({
            to: DEBT_TOKEN_ADDRESS,
            data: encodeFunctionData({
              abi: ERC20_ABI,
              functionName: 'approve',
              args: [AYNI_PROTOCOL_ADDRESS, maxUint256],
            }),
          })
        }

        setDashboardMessage({ tone: '', text: `Repaying ${DEBT_ASSET.symbol}...` })
        await sendTransaction({
          to: AYNI_PROTOCOL_ADDRESS,
          data: encodeFunctionData({
            abi: AYNI_PROTOCOL_ABI,
            functionName: 'repay',
            args: [COLLATERAL_TOKEN_ADDRESS, DEBT_TOKEN_ADDRESS, amount],
          }),
        })

        setDashboardMessage({ tone: 'success', text: `Repaid ${trimmedValue} ${DEBT_ASSET.symbol}.` })
      }

      closeActionModal()
      setRefreshNonce((value) => value + 1)
    } catch (error) {
      const rejected = error?.code === 4001
      const actionLabel = isSupply ? 'Supply' : (isBorrow ? 'Borrow' : (isRepay ? 'Repay' : 'Withdraw'))
      setDashboardMessage({
        tone: 'warning',
        text: rejected
          ? `${actionLabel} was cancelled.`
          : `${actionLabel} failed: ${error?.shortMessage || error?.message || 'unknown error'}`,
      })
    } finally {
      setPendingAction('')
    }
  }

  function handleBorrowDetails() {
    setIsDetailsOpen(true)
  }

  const walletLabel = walletAddress ? shortAddress(walletAddress) : (isConnecting ? 'Connecting...' : 'Connect Wallet')
  const netWorthRaw =
    dashboardState.collateralUsd > dashboardState.userDebt
      ? dashboardState.collateralUsd - dashboardState.userDebt
      : 0n
  const netWorthLabel = formatUsdAmount(netWorthRaw, dashboardState.debtDecimals)
  const healthFactorLabel = dashboardState.userDebt > 0n ? formatHealthFactorLabel(dashboardState.healthFactor) : '--'
  const healthFactorValue =
    dashboardState.userDebt > 0n ? Number(formatUnits(dashboardState.healthFactor, 18)) : 0
  const hasActiveOrder = dashboardState.activeOrderId !== ZERO_ORDER_ID
  const borrowPending = hasActiveOrder && dashboardState.activeOrderStatus === CLAIM_STATUS_OPEN
  const borrowActive = hasActiveOrder && dashboardState.activeOrderStatus === CLAIM_STATUS_FILLED
  const healthFactorStatus = !walletAddress
    ? 'Connect wallet to view live position data.'
    : borrowPending
      ? 'Borrow request pending'
      : dashboardState.userDebt === 0n
      ? 'No borrow yet'
      : healthFactorValue < 1
        ? 'At liquidation risk'
        : healthFactorValue < 1.2
          ? 'Watch closely'
          : 'Healthy'
  const healthFactorFillWidth = dashboardState.userDebt === 0n ? '22%' : `${Math.min(100, Math.max(12, healthFactorValue * 40))}%`
  const borrowAvailable = walletAddress
    ? minBigInt(dashboardState.maxBorrow, dashboardState.availableLiquidity)
    : dashboardState.availableLiquidity
  const borrowRequestLimit = walletAddress ? dashboardState.maxBorrow : dashboardState.availableLiquidity
  const repayAvailable = walletAddress ? dashboardState.debtWalletBalance : 0n
  const withdrawAvailable = walletAddress
    ? calculateMaxWithdrawableCollateral({
        userCollateral: dashboardState.userCollateral,
        userDebt: dashboardState.userDebt,
        healthFactor: dashboardState.healthFactor,
      })
    : 0n
  const collateralApyLabel = `${formatTokenAmount(dashboardState.annualInterestBps, 2, 2)}%`
  const borrowNotice = !walletAddress
    ? 'Connect wallet to check how much USDC you can borrow.'
    : dashboardState.userCollateral === 0n
      ? 'To borrow you need to supply WzkLTC as collateral.'
      : borrowPending
        ? 'Borrow request pending. Your WzkLTC is locked while waiting for solver fill.'
        : borrowActive
          ? 'Active debt exists. Repay your outstanding USDC before opening a new borrow.'
          : dashboardState.marketPaused
            ? 'Borrowing is currently paused for this market.'
            : 'Borrow against your supplied WzkLTC.'
  const supplyRows =
    showZeroBalances || dashboardState.walletBalance > 0n || dashboardState.userCollateral > 0n
      ? [COLLATERAL_ASSET]
      : []
  const borrowRows =
    showZeroBalances || borrowRequestLimit > 0n || dashboardState.userDebt > 0n || borrowPending ? [DEBT_ASSET] : []
  const actionModalOpen =
    actionModal.type === 'supply' ||
    actionModal.type === 'borrow' ||
    actionModal.type === 'repay' ||
    actionModal.type === 'withdraw'
  const actionModalIsSupply = actionModal.type === 'supply'
  const actionModalIsBorrow = actionModal.type === 'borrow'
  const actionModalIsRepay = actionModal.type === 'repay'
  const actionModalIsWithdraw = actionModal.type === 'withdraw'
  const actionModalTitle = actionModalIsSupply
    ? `Supply ${COLLATERAL_ASSET.symbol}`
    : actionModalIsBorrow
      ? `Borrow ${DEBT_ASSET.symbol}`
      : actionModalIsRepay
        ? `Repay ${DEBT_ASSET.symbol}`
        : `Withdraw ${COLLATERAL_ASSET.symbol}`
  const actionModalKicker = actionModalIsSupply
    ? 'Supply'
    : actionModalIsBorrow
      ? 'Borrow'
      : actionModalIsRepay
        ? 'Repay'
        : 'Withdraw'
  const actionModalBalanceLabel = actionModalIsSupply
    ? 'Wallet balance'
    : actionModalIsBorrow
      ? 'Instant now'
      : actionModalIsRepay
        ? 'Repayable now'
        : 'Withdrawable now'
  const actionModalBalanceValue = actionModalIsSupply
    ? `${formatTokenAmount(dashboardState.walletBalance, dashboardState.collateralDecimals, 6)} ${COLLATERAL_ASSET.symbol}`
    : actionModalIsBorrow
      ? `${formatTokenAmount(borrowAvailable, dashboardState.debtDecimals, 6)} ${DEBT_ASSET.symbol}`
      : actionModalIsRepay
        ? `${formatTokenAmount(repayAvailable, dashboardState.debtDecimals, 6)} ${DEBT_ASSET.symbol}`
        : `${formatTokenAmount(withdrawAvailable, dashboardState.collateralDecimals, 6)} ${COLLATERAL_ASSET.symbol}`
  const actionModalHint = actionModalIsRepay
    ? `Wallet balance ${formatTokenAmount(dashboardState.debtWalletBalance, dashboardState.debtDecimals, 6)} ${DEBT_ASSET.symbol} • Outstanding debt ${formatTokenAmount(dashboardState.userDebt, dashboardState.debtDecimals, 6)} ${DEBT_ASSET.symbol}`
    : ''
  const actionModalAllowanceHint = actionModalIsRepay
    ? dashboardState.debtAllowance > 0n
      ? 'Allowance detected for repay.'
      : `Approval may be required for ${DEBT_ASSET.symbol} before repay.`
    : ''
  const actionModalButtonLabel =
    pendingAction === actionModal.type
      ? actionModalIsSupply
        ? 'Supplying...'
        : actionModalIsBorrow
          ? 'Borrowing...'
          : actionModalIsRepay
            ? 'Repaying...'
            : 'Withdrawing...'
      : actionModalIsSupply
        ? 'Confirm supply'
        : actionModalIsBorrow
          ? 'Confirm borrow'
          : actionModalIsRepay
            ? 'Confirm repay'
            : 'Confirm withdraw'
  const borrowDetailsRows = [
    {
      label: 'Vault',
      value: dashboardState.marketAddress === zeroAddress ? 'Unavailable' : shortAddress(dashboardState.marketAddress),
    },
    {
      label: 'Supplied',
      value: `${formatTokenAmount(dashboardState.userCollateral, dashboardState.collateralDecimals, 6)} ${COLLATERAL_ASSET.symbol}`,
    },
    {
      label: 'Borrowed',
      value: `${formatTokenAmount(dashboardState.userDebt, dashboardState.debtDecimals, 6)} ${DEBT_ASSET.symbol}`,
    },
    {
      label: 'Instant now',
      value: `${formatTokenAmount(borrowAvailable, dashboardState.debtDecimals, 6)} ${DEBT_ASSET.symbol}`,
    },
    {
      label: 'Request up to',
      value: `${formatTokenAmount(borrowRequestLimit, dashboardState.debtDecimals, 6)} ${DEBT_ASSET.symbol}`,
    },
    {
      label: 'State',
      value: borrowPending
        ? 'Waiting for solver fill'
        : borrowActive
          ? 'Debt active'
          : 'No debt',
    },
    {
      label: 'Repay flow',
      value: 'Normal market repay',
    },
    {
      label: 'Variable APR',
      value: `${formatTokenAmount(dashboardState.annualInterestBps, 2, 2)}%`,
    },
  ]

  return (
    <main className="dashboard-page">
      <div className="dashboard-shell">
        <header className="dashboard-header">
          <a className="dashboard-back-link" href="/">
            Back to main page
          </a>
          <div className="dashboard-actions">
            <a className="dashboard-button dashboard-button-ghost" href="/solver/">
              Provider dashboard
            </a>
            <button type="button" className="dashboard-button dashboard-button-primary" onClick={handleOpenBridge}>
              Get WzkLTC
            </button>
            <button
              type="button"
              className="dashboard-button dashboard-button-ghost"
              onClick={handleWalletButton}
              disabled={isConnecting}
            >
              {walletLabel}
            </button>
          </div>
        </header>

        {walletStatus ? <p className="wallet-status">{walletStatus}</p> : null}
        {dashboardMessage.text ? (
          <p className={`dashboard-status dashboard-status-${dashboardMessage.tone || 'neutral'}`}>{dashboardMessage.text}</p>
        ) : null}
        {!protocolConfigured ? (
          <p className="dashboard-status dashboard-status-warning">
            Dashboard balances need protocol and USDC addresses in the deployment config.
          </p>
        ) : null}

        <section className="lending-grid">
          <article className="lending-card litvm-network-card">
            <header className="lending-card-head">
              <h2>{AYNI_NETWORK_NAME}</h2>
            </header>
            <div className="network-metrics">
              <div className="network-networth">
                <span>Net worth</span>
                <strong>{netWorthLabel}</strong>
              </div>
              <div className="health-factor-widget">
                <div className="health-factor-widget-head">
                  <span>Health factor</span>
                  <strong>{healthFactorLabel}</strong>
                </div>
                <div className="health-factor-track" aria-hidden="true">
                  <span className="health-factor-fill" style={{ width: healthFactorFillWidth }} />
                </div>
                <p>{healthFactorStatus}</p>
              </div>
            </div>
          </article>

          <article className="lending-card">
            <header className="lending-card-head">
              <h2>Your supplies</h2>
            </header>
            {dashboardState.userCollateral > 0n ? (
              <div className="position-stack">
                <div className="position-value-row">
                  <div className="position-value-with-meta">
                    <strong className="position-value">
                      {formatTokenAmount(dashboardState.userCollateral, dashboardState.collateralDecimals, 6)}{' '}
                      {COLLATERAL_ASSET.symbol}
                    </strong>
                    <span className="position-meta position-meta-inline">
                      {formatUsdAmount(dashboardState.collateralUsd, dashboardState.debtDecimals)}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="dashboard-button dashboard-button-primary position-action-button"
                    onClick={handleWithdraw}
                    disabled={!protocolConfigured || pendingAction === 'withdraw'}
                  >
                    {pendingAction === 'withdraw' ? 'Withdrawing...' : 'Withdraw'}
                  </button>
                </div>
                <div className="position-meta-pairs">
                  <span className="position-meta-subtle position-meta-label">Encumbered:</span>
                  <span className="position-meta-subtle position-meta-value">
                    {formatTokenAmount(
                      calculateEncumberedCollateral(dashboardState.userCollateral, withdrawAvailable),
                      dashboardState.collateralDecimals,
                      6,
                    )}{' '}
                    {COLLATERAL_ASSET.symbol}
                  </span>
                  <span className="position-meta-subtle position-meta-label">Available:</span>
                  <span className="position-meta-subtle position-meta-value">
                    {formatTokenAmount(withdrawAvailable, dashboardState.collateralDecimals, 6)} {COLLATERAL_ASSET.symbol}
                  </span>
                </div>
              </div>
            ) : (
              <p className="lending-empty">Nothing supplied yet</p>
            )}
          </article>

          <article className="lending-card">
            <header className="lending-card-head">
              <h2>Your borrows</h2>
            </header>
            {borrowPending ? (
              <div className="position-stack">
                <div className="position-value-row">
                  <div className="position-value-with-meta">
                    <strong className="position-value">Borrow request pending</strong>
                    <span className="pending-borrow-pill">Waiting for solver fill</span>
                  </div>
                </div>
                <span className="position-meta">
                  Your WzkLTC collateral is locked, but USDC has not arrived yet.
                </span>
                <div className="position-meta-pairs">
                  <span className="position-meta-subtle position-meta-label">Requested:</span>
                  <span className="position-meta-subtle position-meta-value">
                    {formatTokenAmount(dashboardState.activeOrderPrincipal, dashboardState.debtDecimals, 6)} {DEBT_ASSET.symbol}
                  </span>
                  <span className="position-meta-subtle position-meta-label">Order:</span>
                  <span className="position-meta-subtle position-meta-value">{shortAddress(dashboardState.activeOrderId)}</span>
                </div>
              </div>
            ) : dashboardState.userDebt > 0n ? (
              <div className="position-stack">
                <div className="position-value-row">
                  <strong className="position-value">
                    {formatTokenAmount(dashboardState.userDebt, dashboardState.debtDecimals, 6)} {DEBT_ASSET.symbol}
                  </strong>
                  <button
                    type="button"
                    className="dashboard-button dashboard-button-primary position-action-button"
                    onClick={handleRepay}
                    disabled={!protocolConfigured || pendingAction === 'repay'}
                  >
                    {pendingAction === 'repay' ? 'Repaying...' : 'Repay'}
                  </button>
                </div>
                <span className="position-meta">
                  Variable APR {formatTokenAmount(dashboardState.annualInterestBps, 2, 2)}% • Repay stays in the normal market flow.
                </span>
              </div>
            ) : (
              <p className="lending-empty">Nothing borrowed yet</p>
            )}
          </article>

          <article className="lending-card lending-card-table">
            <header className="lending-card-head">
              <h3>Assets to supply</h3>
              <div className="table-head-actions">
                <button type="button" className="table-pill">
                  All Categories
                </button>
                <button type="button" className="table-text-button">
                  Hide
                </button>
              </div>
            </header>

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={showZeroBalances}
                onChange={(event) => setShowZeroBalances(event.target.checked)}
              />
              Show assets with 0 balance
            </label>

            <div className="asset-table">
              <div className="asset-row asset-row-head">
                <span>Asset</span>
                <span>Wallet balance</span>
                <span>APY</span>
                <span>Can be collateral</span>
                <span className="asset-head-action" aria-hidden />
              </div>
              {supplyRows.map((asset) => (
                <div key={asset.symbol} className="asset-row">
                  <div className="asset-cell-main">
                    <span className="asset-orb">{asset.symbol.slice(0, 1)}</span>
                    <span className="asset-copy">
                      <strong>{asset.symbol}</strong>
                      <small>{shortAddress(COLLATERAL_TOKEN_ADDRESS)}</small>
                    </span>
                  </div>
                  <span>{formatTokenAmount(dashboardState.walletBalance, dashboardState.collateralDecimals, 6)}</span>
                  <span>{collateralApyLabel}</span>
                  <span>{asset.collateral ? '✓' : '—'}</span>
                  <button
                    type="button"
                    className="asset-action"
                    onClick={handleSupply}
                    disabled={!protocolConfigured || pendingAction === 'supply'}
                  >
                    {pendingAction === 'supply' ? 'Supplying...' : 'Supply'}
                  </button>
                </div>
              ))}
              {supplyRows.length === 0 ? <p className="lending-empty">No supply assets in view</p> : null}
            </div>
          </article>

          <article className="lending-card lending-card-table">
            <header className="lending-card-head">
              <h3>Assets to borrow</h3>
              <div className="table-head-actions">
                <button type="button" className="table-pill">
                  All Categories
                </button>
                <button type="button" className="table-text-button">
                  Hide
                </button>
              </div>
            </header>

            <div className="borrow-notice">{borrowNotice}</div>

            <div className="asset-table">
              <div className="asset-row asset-row-head">
                <span>Asset</span>
                <span>Available</span>
                <span>APY, variable</span>
                <span className="asset-head-action" aria-hidden />
                <span className="asset-head-action" aria-hidden />
              </div>
              {borrowRows.map((asset) => (
                <div key={asset.symbol} className="asset-row">
                  <div className="asset-cell-main">
                    <span className="asset-orb">{asset.symbol.slice(0, 1)}</span>
                    <span className="asset-copy">
                      <strong>{asset.symbol}</strong>
                      <small>{borrowPending ? 'Borrow request pending' : 'Standard borrow flow'}</small>
                    </span>
                  </div>
                  <span>{formatTokenAmount(borrowAvailable, dashboardState.debtDecimals, 6)}</span>
                  <span>{formatTokenAmount(dashboardState.annualInterestBps, 2, 2)}%</span>
                  <button
                    type="button"
                    className="asset-action asset-action-muted"
                    onClick={handleBorrow}
                    disabled={!protocolConfigured || pendingAction === 'borrow' || borrowPending || borrowActive}
                  >
                    {pendingAction === 'borrow' ? 'Borrowing...' : 'Borrow'}
                  </button>
                  <button type="button" className="asset-action asset-action-muted" onClick={handleBorrowDetails}>
                    Details
                  </button>
                </div>
              ))}
              {borrowRows.length === 0 ? <p className="lending-empty">No borrow assets in view</p> : null}
            </div>
          </article>

          <article className="dashboard-link-card">
            <div className="dashboard-link-card-copy">
              <div className="dashboard-link-card-mark" aria-hidden="true">
                <span>◈</span>
              </div>
              <div>
                <h2>Wrap native zkLTC into WzkLTC</h2>
              </div>
            </div>
            <a className="dashboard-link-card-button" href={DOCS_URL} target="_blank" rel="noreferrer">
              <span className="dashboard-link-card-button-icon">?</span>
              How it works
            </a>
          </article>
        </section>
      </div>

      <WrappedBridgeModal
        isOpen={isBridgeOpen}
        onClose={() => setIsBridgeOpen(false)}
        walletAddress={walletAddress}
        onConnectWallet={handleConnectWallet}
        isConnecting={isConnecting}
      />

      {isDetailsOpen ? (
        <div className="dashboard-mini-modal-backdrop" onClick={() => setIsDetailsOpen(false)} role="presentation">
          <div
            className="dashboard-mini-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="borrow-details-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="dashboard-mini-modal-head">
              <div>
                <p className="dashboard-mini-modal-kicker">Borrow</p>
                <h2 id="borrow-details-title">USDC details</h2>
              </div>
              <button
                type="button"
                className="dashboard-mini-modal-close"
                onClick={() => setIsDetailsOpen(false)}
                aria-label="Close details"
              >
                ×
              </button>
            </div>

            <div className="dashboard-mini-modal-body">
              {borrowDetailsRows.map((item) => (
                <div key={item.label} className="dashboard-mini-modal-row">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {actionModalOpen ? (
        <div className="dashboard-mini-modal-backdrop" onClick={closeActionModal} role="presentation">
          <div
            className="dashboard-action-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="action-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="dashboard-mini-modal-head">
              <div>
                <p className="dashboard-mini-modal-kicker">{actionModalKicker}</p>
                <h2 id="action-modal-title">{actionModalTitle}</h2>
              </div>
              <button
                type="button"
                className="dashboard-mini-modal-close"
                onClick={closeActionModal}
                aria-label="Close action modal"
              >
                ×
              </button>
            </div>

            <div className="dashboard-action-modal-body">
              <div className="dashboard-action-balance-card">
                <span>{actionModalBalanceLabel}</span>
                <strong>{actionModalBalanceValue}</strong>
              </div>

              <label className="dashboard-action-input-wrap">
                <span>Amount</span>
                <div className="dashboard-action-input-row">
                  <input
                    className="dashboard-action-input"
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    value={actionModal.value}
                    onChange={(event) =>
                      setActionModal((current) => ({
                        ...current,
                        value: event.target.value.replace(/[^0-9.]/g, ''),
                        error: '',
                      }))
                    }
                  />
                  <button
                    type="button"
                    className="dashboard-action-inline"
                    onClick={
                      actionModalIsSupply
                        ? handleSetSupplyMax
                        : actionModalIsBorrow
                          ? handleSetBorrowMax
                          : actionModalIsRepay
                            ? handleSetRepayMax
                            : handleSetWithdrawMax
                    }
                  >
                    Max
                  </button>
                </div>
              </label>

              {actionModalHint ? <p className="dashboard-action-hint">{actionModalHint}</p> : null}
              {actionModalAllowanceHint ? <p className="dashboard-action-hint">{actionModalAllowanceHint}</p> : null}
              {actionModal.error ? <p className="dashboard-status dashboard-status-warning">{actionModal.error}</p> : null}

              <div className="dashboard-action-modal-actions">
                <button type="button" className="dashboard-button dashboard-button-ghost" onClick={closeActionModal}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="dashboard-button dashboard-button-primary"
                  onClick={submitActionModal}
                  disabled={
                    pendingAction === 'supply' ||
                    pendingAction === 'borrow' ||
                    pendingAction === 'repay' ||
                    pendingAction === 'withdraw'
                  }
                >
                  {actionModalButtonLabel}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}
