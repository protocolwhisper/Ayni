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
import './SolverDashboardPage.css'
import { formatTokenAmount, hexValue, shortAddress } from './utils.js'

const WALLET_DISCONNECTED_KEY = 'ayni_solver_wallet_disconnected'
const DEFAULT_PUBLIC_RPC_URL = 'https://liteforge.rpc.caldera.xyz/http'
const DEFAULT_PUBLIC_CHAIN_ID = 4441
const DEFAULT_WZKLTC_CONTRACT_ADDRESS = '0xdB7a824F2662585dd452021801cdEBF0A4b8586e'
const RAY_DECIMALS = 27
const SECONDS_PER_YEAR = 31_536_000
const COOLDOWN_PERIOD = 7 * 24 * 60 * 60
const WITHDRAW_WINDOW = 2 * 24 * 60 * 60

const PUBLIC_RPC_URL = import.meta.env.VITE_PUBLIC_RPC_URL || import.meta.env.VITE_WZKLTC_RPC_URL || DEFAULT_PUBLIC_RPC_URL
const PUBLIC_CHAIN_ID =
  Number.parseInt(import.meta.env.VITE_PUBLIC_CHAIN_ID || import.meta.env.VITE_WZKLTC_CHAIN_ID || '', 10) ||
  DEFAULT_PUBLIC_CHAIN_ID
const AYNI_PROTOCOL_ADDRESS = import.meta.env.VITE_AYNI_PROTOCOL_ADDRESS || ''
const COLLATERAL_TOKEN_ADDRESS =
  import.meta.env.VITE_AYNI_COLLATERAL_TOKEN_ADDRESS ||
  import.meta.env.VITE_WZKLTC_CONTRACT_ADDRESS ||
  DEFAULT_WZKLTC_CONTRACT_ADDRESS
const DEBT_TOKEN_ADDRESS = import.meta.env.VITE_AYNI_DEBT_TOKEN_ADDRESS || ''
const CONFIGURED_SOLVER_POOL_ADDRESS =
  import.meta.env.VITE_SOLVER_POOL_ADDRESS || import.meta.env.VITE_AYNI_SOLVER_POOL_ADDRESS || ''

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
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
]

const PROTOCOL_ABI = [
  {
    inputs: [
      { internalType: 'address', name: 'collateral_token', type: 'address' },
      { internalType: 'address', name: 'debt_asset', type: 'address' },
    ],
    name: 'get_solver_pool',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'order_id', type: 'bytes32' }],
    name: 'fill_with_pool',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
]

const SOLVER_POOL_ABI = [
  {
    inputs: [],
    name: 'asset',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'name',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalAssets',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalPrincipalOut',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'reserveBalance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'currentBorrowRate',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'utilizationRate',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'liquidityIndex',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'owner_', type: 'address' }],
    name: 'maxWithdraw',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'owner_', type: 'address' }],
    name: 'maxRedeem',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'shares', type: 'uint256' }],
    name: 'convertToAssets',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'cooldowns',
    outputs: [
      { internalType: 'uint40', name: 'timestamp', type: 'uint40' },
      { internalType: 'uint216', name: 'shares', type: 'uint216' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'assets', type: 'uint256' },
      { internalType: 'address', name: 'receiver', type: 'address' },
    ],
    name: 'deposit',
    outputs: [{ internalType: 'uint256', name: 'shares', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'cooldown',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'shares', type: 'uint256' },
      { internalType: 'address', name: 'receiver', type: 'address' },
      { internalType: 'address', name: 'owner_', type: 'address' },
    ],
    name: 'redeem',
    outputs: [{ internalType: 'uint256', name: 'assets', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
]

function emptySolverState() {
  return {
    poolAddress: zeroAddress,
    assetAddress: zeroAddress,
    poolName: 'Ayni Solver Pool',
    poolSymbol: 'asUSDC',
    assetSymbol: 'USDC',
    assetDecimals: 6,
    walletAssetBalance: 0n,
    assetAllowance: 0n,
    totalAssets: 0n,
    totalSupply: 0n,
    totalPrincipalOut: 0n,
    reserveBalance: 0n,
    currentBorrowRate: 0n,
    utilizationRate: 0n,
    liquidityIndex: 0n,
    walletShares: 0n,
    walletShareAssets: 0n,
    maxWithdraw: 0n,
    maxRedeem: 0n,
    cooldownTimestamp: 0,
    cooldownShares: 0n,
    loading: true,
    ready: false,
  }
}

function formatPercentRay(value) {
  const amount = Number(formatUnits(value, RAY_DECIMALS))
  if (!Number.isFinite(amount)) return '0%'
  return `${(amount * 100).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}%`
}

function formatAnnualRate(value) {
  return formatPercentRay(value)
}

function formatCooldown(timestamp) {
  if (!timestamp) return 'Not started'

  const now = Math.floor(Date.now() / 1000)
  const opensAt = timestamp + COOLDOWN_PERIOD
  const closesAt = opensAt + WITHDRAW_WINDOW

  if (now < opensAt) {
    const days = Math.ceil((opensAt - now) / 86_400)
    return `${days} day${days === 1 ? '' : 's'} until redeem window`
  }

  if (now <= closesAt) {
    const hours = Math.ceil((closesAt - now) / 3_600)
    return `Redeem window open for ${hours}h`
  }

  return 'Expired; start cooldown again'
}

function isBytes32(value) {
  return /^0x[a-fA-F0-9]{64}$/.test(value)
}

export default function SolverDashboardPage() {
  const [isConnecting, setIsConnecting] = useState(false)
  const [walletAddress, setWalletAddress] = useState('')
  const [walletChainId, setWalletChainId] = useState(null)
  const [walletStatus, setWalletStatus] = useState('')
  const [solverState, setSolverState] = useState(emptySolverState)
  const [depositAmount, setDepositAmount] = useState('')
  const [redeemShares, setRedeemShares] = useState('')
  const [orderId, setOrderId] = useState('')
  const [pendingAction, setPendingAction] = useState('')
  const [solverMessage, setSolverMessage] = useState({ tone: '', text: '' })
  const [refreshNonce, setRefreshNonce] = useState(0)

  const client = useMemo(() => {
    if (!PUBLIC_RPC_URL) return null
    return createPublicClient({ transport: http(PUBLIC_RPC_URL) })
  }, [])

  const canResolvePool =
    isAddress(CONFIGURED_SOLVER_POOL_ADDRESS) ||
    (isAddress(AYNI_PROTOCOL_ADDRESS) && isAddress(COLLATERAL_TOKEN_ADDRESS) && isAddress(DEBT_TOKEN_ADDRESS))
  const poolConfigured = isAddress(solverState.poolAddress)
  const connectedToTargetChain = !PUBLIC_CHAIN_ID || walletChainId === PUBLIC_CHAIN_ID

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

    async function loadSolverState() {
      if (!client || !canResolvePool) {
        setSolverState((current) => ({ ...current, loading: false, ready: false }))
        return
      }

      try {
        const poolAddress = isAddress(CONFIGURED_SOLVER_POOL_ADDRESS)
          ? CONFIGURED_SOLVER_POOL_ADDRESS
          : await client.readContract({
              address: AYNI_PROTOCOL_ADDRESS,
              abi: PROTOCOL_ABI,
              functionName: 'get_solver_pool',
              args: [COLLATERAL_TOKEN_ADDRESS, DEBT_TOKEN_ADDRESS],
            })

        if (!isAddress(poolAddress) || poolAddress === zeroAddress) {
          if (!cancelled) setSolverState((current) => ({ ...current, poolAddress, loading: false, ready: false }))
          return
        }

        const [
          assetAddress,
          poolName,
          poolSymbol,
          totalAssets,
          totalSupply,
          totalPrincipalOut,
          reserveBalance,
          currentBorrowRate,
          utilizationRate,
          liquidityIndex,
          walletShares,
          maxWithdraw,
          maxRedeem,
          cooldown,
        ] = await Promise.all([
          client.readContract({ address: poolAddress, abi: SOLVER_POOL_ABI, functionName: 'asset' }),
          client.readContract({ address: poolAddress, abi: SOLVER_POOL_ABI, functionName: 'name' }),
          client.readContract({ address: poolAddress, abi: SOLVER_POOL_ABI, functionName: 'symbol' }),
          client.readContract({ address: poolAddress, abi: SOLVER_POOL_ABI, functionName: 'totalAssets' }),
          client.readContract({ address: poolAddress, abi: SOLVER_POOL_ABI, functionName: 'totalSupply' }),
          client.readContract({ address: poolAddress, abi: SOLVER_POOL_ABI, functionName: 'totalPrincipalOut' }),
          client.readContract({ address: poolAddress, abi: SOLVER_POOL_ABI, functionName: 'reserveBalance' }),
          client.readContract({ address: poolAddress, abi: SOLVER_POOL_ABI, functionName: 'currentBorrowRate' }),
          client.readContract({ address: poolAddress, abi: SOLVER_POOL_ABI, functionName: 'utilizationRate' }),
          client.readContract({ address: poolAddress, abi: SOLVER_POOL_ABI, functionName: 'liquidityIndex' }),
          walletAddress
            ? client.readContract({
                address: poolAddress,
                abi: SOLVER_POOL_ABI,
                functionName: 'balanceOf',
                args: [walletAddress],
              })
            : Promise.resolve(0n),
          walletAddress
            ? client.readContract({
                address: poolAddress,
                abi: SOLVER_POOL_ABI,
                functionName: 'maxWithdraw',
                args: [walletAddress],
              })
            : Promise.resolve(0n),
          walletAddress
            ? client.readContract({
                address: poolAddress,
                abi: SOLVER_POOL_ABI,
                functionName: 'maxRedeem',
                args: [walletAddress],
              })
            : Promise.resolve(0n),
          walletAddress
            ? client.readContract({
                address: poolAddress,
                abi: SOLVER_POOL_ABI,
                functionName: 'cooldowns',
                args: [walletAddress],
              })
            : Promise.resolve([0, 0n]),
        ])

        const [assetDecimals, assetSymbol, walletAssetBalance, assetAllowance, walletShareAssets] = await Promise.all([
          client.readContract({ address: assetAddress, abi: ERC20_ABI, functionName: 'decimals' }),
          client.readContract({ address: assetAddress, abi: ERC20_ABI, functionName: 'symbol' }),
          walletAddress
            ? client.readContract({
                address: assetAddress,
                abi: ERC20_ABI,
                functionName: 'balanceOf',
                args: [walletAddress],
              })
            : Promise.resolve(0n),
          walletAddress
            ? client.readContract({
                address: assetAddress,
                abi: ERC20_ABI,
                functionName: 'allowance',
                args: [walletAddress, poolAddress],
              })
            : Promise.resolve(0n),
          walletShares > 0n
            ? client.readContract({
                address: poolAddress,
                abi: SOLVER_POOL_ABI,
                functionName: 'convertToAssets',
                args: [walletShares],
              })
            : Promise.resolve(0n),
        ])

        if (cancelled) return

        setSolverState({
          poolAddress,
          assetAddress,
          poolName,
          poolSymbol,
          assetSymbol,
          assetDecimals,
          walletAssetBalance,
          assetAllowance,
          totalAssets,
          totalSupply,
          totalPrincipalOut,
          reserveBalance,
          currentBorrowRate,
          utilizationRate,
          liquidityIndex,
          walletShares,
          walletShareAssets,
          maxWithdraw,
          maxRedeem,
          cooldownTimestamp: Number(cooldown[0] ?? 0),
          cooldownShares: cooldown[1] ?? 0n,
          loading: false,
          ready: true,
        })
      } catch {
        if (!cancelled) {
          setSolverState((current) => ({ ...current, loading: false, ready: false }))
        }
      }
    }

    loadSolverState()

    return () => {
      cancelled = true
    }
  }, [canResolvePool, client, refreshNonce, walletAddress])

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
      setWalletStatus(error?.code === 4001 ? 'Wallet connection was cancelled.' : 'Unable to connect wallet.')
    } finally {
      setIsConnecting(false)
    }
  }

  async function handleWalletButton() {
    if (!walletAddress) {
      await handleConnectWallet()
      return
    }

    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(WALLET_DISCONNECTED_KEY, '1')
    }

    setWalletAddress('')
    setWalletChainId(null)
    setWalletStatus('Wallet disconnected.')
  }

  async function ensureTargetChain() {
    if (!PUBLIC_CHAIN_ID || typeof window === 'undefined' || !window.ethereum?.request) return true
    if (walletChainId === PUBLIC_CHAIN_ID) return true

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: hexValue(BigInt(PUBLIC_CHAIN_ID)) }],
      })
      setWalletChainId(PUBLIC_CHAIN_ID)
      return true
    } catch (error) {
      setSolverMessage({
        tone: 'warning',
        text: error?.code === 4001 ? 'Chain switch was cancelled.' : `Switch your wallet to chain ${PUBLIC_CHAIN_ID}.`,
      })
      return false
    }
  }

  async function sendTransaction({ to, data }) {
    const hash = await window.ethereum.request({
      method: 'eth_sendTransaction',
      params: [{ from: walletAddress, to, data }],
    })

    await client?.waitForTransactionReceipt({ hash })
    setRefreshNonce((value) => value + 1)
    return hash
  }

  async function handleDeposit() {
    if (!walletAddress) {
      await handleConnectWallet()
      return
    }

    if (!solverState.ready) {
      setSolverMessage({ tone: 'warning', text: 'Solver pool is not configured yet.' })
      return
    }

    const amountText = depositAmount.trim()
    const amount = amountText ? parseUnits(amountText, solverState.assetDecimals) : 0n
    if (amount <= 0n) {
      setSolverMessage({ tone: 'warning', text: `Enter a ${solverState.assetSymbol} deposit amount.` })
      return
    }

    if (amount > solverState.walletAssetBalance) {
      setSolverMessage({ tone: 'warning', text: 'Deposit amount is above your wallet balance.' })
      return
    }

    if (!(await ensureTargetChain())) return

    setPendingAction('deposit')
    setSolverMessage({ tone: '', text: '' })

    try {
      if (solverState.assetAllowance < amount) {
        await sendTransaction({
          to: solverState.assetAddress,
          data: encodeFunctionData({
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [solverState.poolAddress, maxUint256],
          }),
        })
      }

      await sendTransaction({
        to: solverState.poolAddress,
        data: encodeFunctionData({
          abi: SOLVER_POOL_ABI,
          functionName: 'deposit',
          args: [amount, walletAddress],
        }),
      })

      setDepositAmount('')
      setSolverMessage({ tone: 'success', text: 'Deposit complete.' })
    } catch (error) {
      setSolverMessage({
        tone: 'warning',
        text: error?.code === 4001 ? 'Transaction signature was cancelled.' : 'Deposit failed. Please try again.',
      })
    } finally {
      setPendingAction('')
    }
  }

  async function handleCooldown() {
    if (!walletAddress) {
      await handleConnectWallet()
      return
    }

    if (!solverState.ready || solverState.walletShares <= 0n) {
      setSolverMessage({ tone: 'warning', text: 'No solver shares are available for cooldown.' })
      return
    }

    if (!(await ensureTargetChain())) return

    setPendingAction('cooldown')
    setSolverMessage({ tone: '', text: '' })

    try {
      await sendTransaction({
        to: solverState.poolAddress,
        data: encodeFunctionData({ abi: SOLVER_POOL_ABI, functionName: 'cooldown' }),
      })
      setSolverMessage({ tone: 'success', text: 'Cooldown started.' })
    } catch (error) {
      setSolverMessage({
        tone: 'warning',
        text: error?.code === 4001 ? 'Transaction signature was cancelled.' : 'Cooldown failed. Please try again.',
      })
    } finally {
      setPendingAction('')
    }
  }

  async function handleRedeem() {
    if (!walletAddress) {
      await handleConnectWallet()
      return
    }

    if (!solverState.ready) {
      setSolverMessage({ tone: 'warning', text: 'Solver pool is not configured yet.' })
      return
    }

    const amountText = redeemShares.trim()
    const shares = amountText ? parseUnits(amountText, solverState.assetDecimals) : 0n
    if (shares <= 0n) {
      setSolverMessage({ tone: 'warning', text: `Enter ${solverState.poolSymbol} shares to redeem.` })
      return
    }

    if (shares > solverState.maxRedeem) {
      setSolverMessage({ tone: 'warning', text: 'Redeem amount is above your currently redeemable shares.' })
      return
    }

    if (!(await ensureTargetChain())) return

    setPendingAction('redeem')
    setSolverMessage({ tone: '', text: '' })

    try {
      await sendTransaction({
        to: solverState.poolAddress,
        data: encodeFunctionData({
          abi: SOLVER_POOL_ABI,
          functionName: 'redeem',
          args: [shares, walletAddress, walletAddress],
        }),
      })
      setRedeemShares('')
      setSolverMessage({ tone: 'success', text: 'Redeem complete.' })
    } catch (error) {
      setSolverMessage({
        tone: 'warning',
        text: error?.code === 4001 ? 'Transaction signature was cancelled.' : 'Redeem failed. Check cooldown window.',
      })
    } finally {
      setPendingAction('')
    }
  }

  async function handleFillOrder() {
    if (!walletAddress) {
      await handleConnectWallet()
      return
    }

    if (!isAddress(AYNI_PROTOCOL_ADDRESS)) {
      setSolverMessage({ tone: 'warning', text: 'Protocol address is required to fill orders.' })
      return
    }

    if (!isBytes32(orderId.trim())) {
      setSolverMessage({ tone: 'warning', text: 'Enter a valid bytes32 order id.' })
      return
    }

    if (!(await ensureTargetChain())) return

    setPendingAction('fill')
    setSolverMessage({ tone: '', text: '' })

    try {
      await sendTransaction({
        to: AYNI_PROTOCOL_ADDRESS,
        data: encodeFunctionData({
          abi: PROTOCOL_ABI,
          functionName: 'fill_with_pool',
          args: [orderId.trim()],
        }),
      })
      setOrderId('')
      setSolverMessage({ tone: 'success', text: 'Order filled from solver pool.' })
    } catch (error) {
      setSolverMessage({
        tone: 'warning',
        text: error?.code === 4001 ? 'Transaction signature was cancelled.' : 'Fill failed. Check order status and pool liquidity.',
      })
    } finally {
      setPendingAction('')
    }
  }

  const lockedLiquidity = solverState.totalPrincipalOut + solverState.reserveBalance
  const idleLiquidity = solverState.totalAssets > lockedLiquidity ? solverState.totalAssets - lockedLiquidity : 0n
  const cooldownStatus = formatCooldown(solverState.cooldownTimestamp)
  const solverRows = [
    ['Pool', poolConfigured ? shortAddress(solverState.poolAddress) : 'Not configured'],
    ['Asset', isAddress(solverState.assetAddress) ? `${solverState.assetSymbol} ${shortAddress(solverState.assetAddress)}` : 'Waiting'],
    ['Chain', PUBLIC_CHAIN_ID ? `Chain ${PUBLIC_CHAIN_ID}` : 'Any wallet chain'],
    ['Index', solverState.liquidityIndex ? formatUnits(solverState.liquidityIndex, RAY_DECIMALS) : '0'],
  ]

  return (
    <main className="dashboard-page solver-page">
      <div className="dashboard-shell">
        <header className="dashboard-header">
          <a className="dashboard-back-link" href="/dashboard/">
            Borrower dashboard
          </a>
          <div className="dashboard-actions">
            <a className="dashboard-button dashboard-button-ghost" href="/">
              Main page
            </a>
            <button
              type="button"
              className="dashboard-button dashboard-button-primary"
              onClick={handleWalletButton}
              disabled={isConnecting}
            >
              {walletAddress ? shortAddress(walletAddress) : isConnecting ? 'Connecting...' : 'Connect wallet'}
            </button>
          </div>
        </header>

        {walletStatus ? <p className="wallet-status">{walletStatus}</p> : null}
        {solverMessage.text ? (
          <p className={`dashboard-status dashboard-status-${solverMessage.tone || 'neutral'}`}>{solverMessage.text}</p>
        ) : null}
        {!canResolvePool ? (
          <p className="dashboard-status dashboard-status-warning">
            Add a solver pool address, or set protocol plus collateral and USDC addresses.
          </p>
        ) : null}
        {walletAddress && !connectedToTargetChain ? (
          <p className="dashboard-status dashboard-status-warning">Wallet is connected to a different chain.</p>
        ) : null}

        <section className="solver-hero lending-card">
          <div>
            <p className="dashboard-mini-modal-kicker">Solver liquidity</p>
            <h1>{solverState.poolName}</h1>
            <p>Deposit {solverState.assetSymbol} into the pool, monitor utilization, and fill open borrower orders.</p>
          </div>
          <div className="solver-hero-metrics">
            <span>Total assets</span>
            <strong>{formatTokenAmount(solverState.totalAssets, solverState.assetDecimals, 2)} {solverState.assetSymbol}</strong>
          </div>
        </section>

        <section className="solver-grid">
          <article className="lending-card solver-metric-card">
            <span>Idle liquidity</span>
            <strong>{formatTokenAmount(idleLiquidity, solverState.assetDecimals, 2)} {solverState.assetSymbol}</strong>
            <p>Available for new claim fills.</p>
          </article>
          <article className="lending-card solver-metric-card">
            <span>Utilization</span>
            <strong>{formatPercentRay(solverState.utilizationRate)}</strong>
            <p>{formatTokenAmount(solverState.totalPrincipalOut, solverState.assetDecimals, 2)} principal out.</p>
          </article>
          <article className="lending-card solver-metric-card">
            <span>Borrow rate</span>
            <strong>{formatAnnualRate(solverState.currentBorrowRate)}</strong>
            <p>Annualized from the pool rate model.</p>
          </article>
          <article className="lending-card solver-metric-card">
            <span>Reserve</span>
            <strong>{formatTokenAmount(solverState.reserveBalance, solverState.assetDecimals, 2)} {solverState.assetSymbol}</strong>
            <p>Interest retained for pool protection.</p>
          </article>
        </section>

        <section className="solver-grid solver-grid-wide">
          <article className="lending-card solver-panel">
            <header className="lending-card-head">
              <h2>Your solver position</h2>
            </header>
            <div className="solver-position-list">
              <div>
                <span>Wallet {solverState.assetSymbol}</span>
                <strong>{formatTokenAmount(solverState.walletAssetBalance, solverState.assetDecimals, 6)}</strong>
              </div>
              <div>
                <span>Shares</span>
                <strong>{formatTokenAmount(solverState.walletShares, solverState.assetDecimals, 6)} {solverState.poolSymbol}</strong>
              </div>
              <div>
                <span>Share value</span>
                <strong>{formatTokenAmount(solverState.walletShareAssets, solverState.assetDecimals, 6)} {solverState.assetSymbol}</strong>
              </div>
              <div>
                <span>Cooldown</span>
                <strong>{cooldownStatus}</strong>
              </div>
            </div>
          </article>

          <article className="lending-card solver-panel">
            <header className="lending-card-head">
              <h2>LP actions</h2>
            </header>
            <label className="dashboard-action-input-wrap solver-input-wrap">
              <span>Deposit {solverState.assetSymbol}</span>
              <div className="dashboard-action-input-row">
                <input
                  className="dashboard-action-input"
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  value={depositAmount}
                  onChange={(event) => setDepositAmount(event.target.value.replace(/[^0-9.]/g, ''))}
                />
                <button type="button" className="dashboard-action-inline" onClick={() => setDepositAmount(formatUnits(solverState.walletAssetBalance, solverState.assetDecimals))}>
                  Max
                </button>
              </div>
            </label>
            <button type="button" className="dashboard-button dashboard-button-primary solver-wide-button" onClick={handleDeposit} disabled={pendingAction === 'deposit'}>
              {pendingAction === 'deposit' ? 'Depositing...' : `Deposit ${solverState.assetSymbol}`}
            </button>

            <div className="solver-action-split">
              <button type="button" className="dashboard-button dashboard-button-ghost" onClick={handleCooldown} disabled={pendingAction === 'cooldown'}>
                {pendingAction === 'cooldown' ? 'Starting...' : 'Start cooldown'}
              </button>
              <button type="button" className="dashboard-button dashboard-button-ghost" onClick={() => setRedeemShares(formatUnits(solverState.maxRedeem, solverState.assetDecimals))}>
                Max redeem
              </button>
            </div>

            <label className="dashboard-action-input-wrap solver-input-wrap">
              <span>Redeem shares</span>
              <div className="dashboard-action-input-row">
                <input
                  className="dashboard-action-input"
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  value={redeemShares}
                  onChange={(event) => setRedeemShares(event.target.value.replace(/[^0-9.]/g, ''))}
                />
              </div>
            </label>
            <button type="button" className="dashboard-button dashboard-button-primary solver-wide-button" onClick={handleRedeem} disabled={pendingAction === 'redeem'}>
              {pendingAction === 'redeem' ? 'Redeeming...' : `Redeem ${solverState.poolSymbol}`}
            </button>
          </article>
        </section>

        <section className="solver-grid solver-grid-wide">
          <article className="lending-card solver-panel">
            <header className="lending-card-head">
              <h2>Fill borrower order</h2>
            </header>
            <p className="solver-panel-copy">Use an open ERC-7683 order id. The protocol routes the fill through the configured solver pool.</p>
            <label className="dashboard-action-input-wrap solver-input-wrap">
              <span>Order id</span>
              <div className="dashboard-action-input-row">
                <input
                  className="dashboard-action-input solver-order-input"
                  type="text"
                  placeholder="0x..."
                  value={orderId}
                  onChange={(event) => setOrderId(event.target.value.trim())}
                />
              </div>
            </label>
            <button type="button" className="dashboard-button dashboard-button-primary solver-wide-button" onClick={handleFillOrder} disabled={pendingAction === 'fill'}>
              {pendingAction === 'fill' ? 'Filling...' : 'Fill with pool'}
            </button>
          </article>

          <article className="lending-card solver-panel">
            <header className="lending-card-head">
              <h2>Pool config</h2>
            </header>
            <div className="solver-config-list">
              {solverRows.map(([label, value]) => (
                <div key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
            <p className="solver-panel-copy">
              Withdrawals require a 7 day cooldown and stay redeemable for 2 days.
            </p>
          </article>
        </section>
      </div>
    </main>
  )
}
