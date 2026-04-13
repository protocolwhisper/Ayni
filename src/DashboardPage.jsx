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

const DOCS_URL = 'https://liteforge.hub.caldera.xyz/'
const WALLET_DISCONNECTED_KEY = 'ayni_wallet_disconnected'
const MAX_HEALTH_FACTOR = (1n << 256n) - 1n

const PUBLIC_RPC_URL = import.meta.env.VITE_PUBLIC_RPC_URL ?? import.meta.env.VITE_WZKLTC_RPC_URL ?? ''
const PUBLIC_CHAIN_ID =
  Number.parseInt(import.meta.env.VITE_PUBLIC_CHAIN_ID ?? import.meta.env.VITE_WZKLTC_CHAIN_ID ?? '', 10) || null
const AYNI_PROTOCOL_ADDRESS = import.meta.env.VITE_AYNI_PROTOCOL_ADDRESS ?? ''
const AYNI_RPC_URL = import.meta.env.VITE_AYNI_RPC_URL ?? PUBLIC_RPC_URL
const AYNI_CHAIN_ID = Number.parseInt(import.meta.env.VITE_AYNI_CHAIN_ID ?? '', 10) || PUBLIC_CHAIN_ID
const AYNI_NETWORK_NAME = import.meta.env.VITE_AYNI_NETWORK_NAME ?? 'LitVM Testnet'
const COLLATERAL_TOKEN_ADDRESS =
  import.meta.env.VITE_AYNI_COLLATERAL_TOKEN_ADDRESS ?? import.meta.env.VITE_WZKLTC_CONTRACT_ADDRESS ?? ''
const DEBT_TOKEN_ADDRESS = import.meta.env.VITE_AYNI_DEBT_TOKEN_ADDRESS ?? ''

const COLLATERAL_ASSET = {
  symbol: 'WZKLTC',
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
    name: 'borrow',
    outputs: [],
    stateMutability: 'nonpayable',
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
]

function shortAddress(address) {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function hexValue(value) {
  return `0x${value.toString(16)}`
}

function formatTokenAmount(rawAmount, decimals, maximumFractionDigits = 4) {
  const amount = Number(formatUnits(rawAmount, decimals))
  if (!Number.isFinite(amount)) return '0'
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  })
}

function formatUsdAmount(rawAmount, decimals) {
  const amount = Number(formatUnits(rawAmount, decimals))
  if (!Number.isFinite(amount)) return '$0.00'
  return `$${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function formatHealthFactorLabel(rawAmount) {
  if (rawAmount === 0n || rawAmount === MAX_HEALTH_FACTOR) return '--'

  const amount = Number(formatUnits(rawAmount, 18))
  if (!Number.isFinite(amount)) return '--'
  if (amount >= 999) return '999+'
  return amount >= 10 ? amount.toFixed(1) : amount.toFixed(2)
}

function minBigInt(a, b) {
  return a < b ? a : b
}

function createEmptyDashboardState() {
  return {
    protocolChainId: AYNI_CHAIN_ID,
    marketAddress: zeroAddress,
    collateralDecimals: 18,
    debtDecimals: 6,
    walletBalance: 0n,
    userCollateral: 0n,
    userDebt: 0n,
    collateralUsd: 0n,
    healthFactor: 0n,
    maxBorrow: 0n,
    availableLiquidity: 0n,
    annualInterestBps: 0n,
    marketPaused: false,
    loading: true,
    ready: false,
  }
}

export default function DashboardPage() {
  const [isConnecting, setIsConnecting] = useState(false)
  const [isBridgeOpen, setIsBridgeOpen] = useState(false)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [walletStatus, setWalletStatus] = useState('')
  const [walletAddress, setWalletAddress] = useState('')
  const [walletChainId, setWalletChainId] = useState(null)
  const [showZeroBalances, setShowZeroBalances] = useState(true)
  const [dashboardMessage, setDashboardMessage] = useState({ tone: '', text: '' })
  const [pendingAction, setPendingAction] = useState('')
  const [refreshNonce, setRefreshNonce] = useState(0)
  const [dashboardState, setDashboardState] = useState(createEmptyDashboardState)

  const protocolConfigured =
    Boolean(AYNI_RPC_URL) &&
    isAddress(AYNI_PROTOCOL_ADDRESS) &&
    isAddress(COLLATERAL_TOKEN_ADDRESS) &&
    isAddress(DEBT_TOKEN_ADDRESS)

  const publicClient = useMemo(() => {
    if (!protocolConfigured) return null

    return createPublicClient({
      transport: http(AYNI_RPC_URL),
    })
  }, [protocolConfigured])

  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) return undefined

    const manuallyDisconnected = window.sessionStorage.getItem(WALLET_DISCONNECTED_KEY) === '1'
    const initialWallet = manuallyDisconnected ? '' : (window.ethereum.selectedAddress ?? '')
    const initialChain = window.ethereum.chainId ? Number.parseInt(window.ethereum.chainId, 16) : null

    setWalletAddress(initialWallet)
    setWalletChainId(initialChain)
    setWalletStatus(initialWallet ? `Connected ${shortAddress(initialWallet)}` : '')

    function handleAccountsChanged(accounts) {
      const isDisconnected = window.sessionStorage.getItem(WALLET_DISCONNECTED_KEY) === '1'
      const nextWallet = isDisconnected ? '' : (accounts?.[0] ?? '')
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
          setDashboardState((current) => ({
            ...createEmptyDashboardState(),
            loading: false,
            ready: false,
          }))
        }
        return
      }

      try {
        const [protocolChainId, collateralDecimals, debtDecimals, marketAddress] = await Promise.all([
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
        ])

        if (cancelled) return

        if (marketAddress === zeroAddress) {
          setDashboardState({
            ...createEmptyDashboardState(),
            protocolChainId,
            collateralDecimals,
            debtDecimals,
            loading: false,
            ready: false,
          })
          return
        }

        const [
          availableLiquidity,
          annualInterestBps,
          marketPaused,
          walletBalance,
          positions,
          collateralUsd,
          healthFactor,
          maxBorrow,
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
                address: COLLATERAL_TOKEN_ADDRESS,
                abi: ERC20_ABI,
                functionName: 'balanceOf',
                args: [walletAddress],
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
        ])

        if (cancelled) return

        setDashboardState({
          protocolChainId,
          marketAddress,
          collateralDecimals,
          debtDecimals,
          walletBalance,
          userCollateral: positions[0],
          userDebt: positions[1],
          collateralUsd,
          healthFactor,
          maxBorrow,
          availableLiquidity,
          annualInterestBps,
          marketPaused,
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
  }, [publicClient, refreshNonce, walletAddress])

  async function handleConnectWallet() {
    if (typeof window === 'undefined' || !window.ethereum?.request) {
      setWalletStatus('No compatible wallet was detected.')
      return
    }

    setIsConnecting(true)
    try {
      window.sessionStorage.removeItem(WALLET_DISCONNECTED_KEY)
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
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(WALLET_DISCONNECTED_KEY, '1')
    }

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
    const hash = await window.ethereum.request({
      method: 'eth_sendTransaction',
      params: [{ from: walletAddress, to, data }],
    })
    await publicClient.waitForTransactionReceipt({ hash })
    return hash
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

    const rawInput = window.prompt(
      `Supply ${COLLATERAL_ASSET.symbol}\nWallet balance: ${formatTokenAmount(
        dashboardState.walletBalance,
        dashboardState.collateralDecimals,
        6,
      )}`,
      '',
    )

    if (rawInput == null) return

    let amount
    try {
      amount = parseUnits(rawInput.trim(), dashboardState.collateralDecimals)
    } catch {
      setDashboardMessage({ tone: 'warning', text: 'Enter a valid supply amount.' })
      return
    }

    if (amount <= 0n) {
      setDashboardMessage({ tone: 'warning', text: 'Supply amount must be greater than zero.' })
      return
    }

    if (amount > dashboardState.walletBalance) {
      setDashboardMessage({ tone: 'warning', text: 'Supply amount is above your WZKLTC balance.' })
      return
    }

    const canProceed = await ensureProtocolChain()
    if (!canProceed) return

    setPendingAction('supply')
    setDashboardMessage({ tone: '', text: '' })

    try {
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

      setDashboardMessage({ tone: 'success', text: `Supplied ${rawInput.trim()} ${COLLATERAL_ASSET.symbol}.` })
      setRefreshNonce((value) => value + 1)
    } catch (error) {
      const rejected = error?.code === 4001
      setDashboardMessage({
        tone: 'warning',
        text: rejected ? 'Supply was cancelled.' : 'Supply failed. Please try again.',
      })
    } finally {
      setPendingAction('')
    }
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

    const borrowCapacity = minBigInt(dashboardState.maxBorrow, dashboardState.availableLiquidity)
    if (borrowCapacity <= 0n) {
      setDashboardMessage({ tone: 'warning', text: 'No borrow capacity is available for this wallet yet.' })
      return
    }

    const rawInput = window.prompt(
      `Borrow ${DEBT_ASSET.symbol}\nAvailable now: ${formatTokenAmount(
        borrowCapacity,
        dashboardState.debtDecimals,
        6,
      )}`,
      '',
    )

    if (rawInput == null) return

    let amount
    try {
      amount = parseUnits(rawInput.trim(), dashboardState.debtDecimals)
    } catch {
      setDashboardMessage({ tone: 'warning', text: 'Enter a valid borrow amount.' })
      return
    }

    if (amount <= 0n) {
      setDashboardMessage({ tone: 'warning', text: 'Borrow amount must be greater than zero.' })
      return
    }

    if (amount > borrowCapacity) {
      setDashboardMessage({ tone: 'warning', text: 'Borrow amount is above your available capacity.' })
      return
    }

    const canProceed = await ensureProtocolChain()
    if (!canProceed) return

    setPendingAction('borrow')
    setDashboardMessage({ tone: '', text: `Borrowing ${DEBT_ASSET.symbol}...` })

    try {
      await sendTransaction({
        to: AYNI_PROTOCOL_ADDRESS,
        data: encodeFunctionData({
          abi: AYNI_PROTOCOL_ABI,
          functionName: 'borrow',
          args: [COLLATERAL_TOKEN_ADDRESS, DEBT_TOKEN_ADDRESS, amount],
        }),
      })

      setDashboardMessage({ tone: 'success', text: `Borrowed ${rawInput.trim()} ${DEBT_ASSET.symbol}.` })
      setRefreshNonce((value) => value + 1)
    } catch (error) {
      const rejected = error?.code === 4001
      setDashboardMessage({
        tone: 'warning',
        text: rejected ? 'Borrow was cancelled.' : 'Borrow failed. Please try again.',
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
  const healthFactorStatus = !walletAddress
    ? 'Connect wallet to view live position data.'
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
  const collateralApyLabel = `${formatTokenAmount(dashboardState.annualInterestBps, 2, 2)}%`
  const borrowNotice = !walletAddress
    ? 'Connect wallet to check how much USDC you can borrow.'
    : dashboardState.userCollateral === 0n
      ? 'To borrow you need to supply WZKLTC as collateral.'
      : dashboardState.marketPaused
        ? 'Borrowing is currently paused for this market.'
        : 'Borrow against your supplied WZKLTC.'
  const supplyRows =
    showZeroBalances || dashboardState.walletBalance > 0n || dashboardState.userCollateral > 0n
      ? [COLLATERAL_ASSET]
      : []
  const borrowRows =
    showZeroBalances || borrowAvailable > 0n || dashboardState.userDebt > 0n ? [DEBT_ASSET] : []
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
      label: 'Available now',
      value: `${formatTokenAmount(borrowAvailable, dashboardState.debtDecimals, 6)} ${DEBT_ASSET.symbol}`,
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
            <button type="button" className="dashboard-button dashboard-button-primary" onClick={handleOpenBridge}>
              Get WZKLTC
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
                <strong className="position-value">
                  {formatTokenAmount(dashboardState.userCollateral, dashboardState.collateralDecimals, 6)}{' '}
                  {COLLATERAL_ASSET.symbol}
                </strong>
                <span className="position-meta">{formatUsdAmount(dashboardState.collateralUsd, dashboardState.debtDecimals)}</span>
              </div>
            ) : (
              <p className="lending-empty">Nothing supplied yet</p>
            )}
          </article>

          <article className="lending-card">
            <header className="lending-card-head">
              <h2>Your borrows</h2>
            </header>
            {dashboardState.userDebt > 0n ? (
              <div className="position-stack">
                <strong className="position-value">
                  {formatTokenAmount(dashboardState.userDebt, dashboardState.debtDecimals, 6)} {DEBT_ASSET.symbol}
                </strong>
                <span className="position-meta">
                  Variable APR {formatTokenAmount(dashboardState.annualInterestBps, 2, 2)}%
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
                    <strong>{asset.symbol}</strong>
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
                    <strong>{asset.symbol}</strong>
                  </div>
                  <span>{formatTokenAmount(borrowAvailable, dashboardState.debtDecimals, 6)}</span>
                  <span>{formatTokenAmount(dashboardState.annualInterestBps, 2, 2)}%</span>
                  <button
                    type="button"
                    className="asset-action asset-action-muted"
                    onClick={handleBorrow}
                    disabled={!protocolConfigured || pendingAction === 'borrow'}
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
                <h2>Wrap native zkLTC into WZKLTC</h2>
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
    </main>
  )
}
