import {
  ChainArchitecture,
  MetalayerClient,
  OrderStatus,
  TransactionType,
  formatQuoteProvider,
} from '@metalayer/sdk'
import { createPublicClient, formatUnits, http, parseUnits, toHex } from 'viem'
import { useEffect, useMemo, useState } from 'react'
import './DashboardPage.css'

const METALAYER_API_KEY = import.meta.env.VITE_METALAYER_API_KEY
const METALAYER_ENV = import.meta.env.VITE_METALAYER_ENV === 'mainnet' ? 'mainnet' : 'testnet'

const LITVM_CHAIN = {
  identifier: {
    id: 4441,
    architecture: ChainArchitecture.ETHEREUM,
  },
  name: 'LitVM',
  isTestnet: true,
  imageUrl: '',
  nativeCurrency: {
    name: 'zkLTC',
    symbol: 'zkLTC',
    decimals: 18,
  },
  defaultRpc: {
    http: 'https://liteforge.rpc.caldera.xyz/http',
    websocket: 'wss://liteforge.rpc.caldera.xyz/ws',
  },
  alternativeRpcs: [],
  blockExplorer: {
    name: 'Sepolia Settlement',
    url: 'https://sepolia.etherscan.io',
  },
}

const LITVM_DETAILS = [
  { label: 'Chain ID', value: '4441' },
  { label: 'Native Token', value: 'zkLTC' },
  { label: 'Data Availability', value: 'Arbitrum AnyTrust' },
  { label: 'Settlement Layer', value: 'Sepolia · 11155111' },
  { label: 'Rollup Stack', value: 'Arbitrum Nitro' },
  { label: 'Rollup Files', value: 'nodeConfig.json · contracts.json' },
  { label: 'RPC (HTTP)', value: 'liteforge.rpc.caldera.xyz/http', href: 'https://liteforge.rpc.caldera.xyz/http' },
  { label: 'RPC (WS)', value: 'liteforge.rpc.caldera.xyz/ws', href: 'wss://liteforge.rpc.caldera.xyz/ws' },
]

const FINAL_ORDER_STATUSES = new Set([
  OrderStatus.FULFILLED,
  OrderStatus.REFUNDED,
  OrderStatus.FAILED,
])

const SOURCE_CHAIN_PRIORITY = [11155111, 84532, 421614, 8453, 42161, 1]

const ERC20_BALANCE_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: 'balance', type: 'uint256' }],
  },
]

const vaults = [
  {
    name: 'Ayni Prime USDC',
    tag: 'Core Yield',
    deposits: '$84.6M',
    asset: 'USDC',
    apy: '6.12%',
    exposure: 'USDC / T-Bills',
    curator: 'Ayni',
  },
  {
    name: 'Treasury Ladder',
    tag: 'Low Vol',
    deposits: '$41.9M',
    asset: 'USDC',
    apy: '4.88%',
    exposure: 'USDC / RWA',
    curator: 'Steakhouse',
  },
  {
    name: 'Bridge Arrival Vault',
    tag: 'Auto Route',
    deposits: '$27.3M',
    asset: 'USDC',
    apy: '5.41%',
    exposure: 'USDC / Basis',
    curator: 'Gauntlet',
  },
]

const promos = [
  {
    icon: '✦',
    title: 'Deposit and earn yield on your assets',
    body: 'Bridge in, get USDC, and route deposits directly into curated earning strategies.',
    cta: 'How it works',
    tone: 'promo-card promo-card-blue',
  },
  {
    icon: '⇄',
    title: 'Official Caldera bridge path',
    body: 'Metalayer quotes, executes, and tracks the bridge flow directly into LitVM chain 4441.',
    cta: 'Open Caldera bridge',
    tone: 'promo-card promo-card-violet',
  },
]

function getChainId(chain) {
  return chain?.identifier?.id ?? 0
}

function getChainArchitecture(chain) {
  return chain?.identifier?.architecture ?? ChainArchitecture.ETHEREUM
}

function formatChainArchitecture(architecture) {
  if (architecture === ChainArchitecture.ETHEREUM) return 'EVM'
  return String(architecture ?? 'Unknown')
}

function shortAddress(address) {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function getHexChainId(chainId) {
  return `0x${Number(chainId).toString(16)}`
}

function normalizeError(error) {
  if (error instanceof Error && error.message) return error.message
  return 'Something went wrong while talking to Caldera.'
}

function trimTrailingZeroes(value) {
  return value.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1')
}

function formatAmountInput(value) {
  const normalized = trimTrailingZeroes(value)
  return normalized === '0' ? '' : normalized
}

function formatTokenAmount(value, decimals, maximumFractionDigits = 6) {
  if (value == null) return '0'

  const [whole, fraction = ''] = formatUnits(typeof value === 'bigint' ? value : BigInt(value), decimals).split('.')
  const groupedWhole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const trimmedFraction = fraction.slice(0, maximumFractionDigits).replace(/0+$/, '')

  return trimmedFraction ? `${groupedWhole}.${trimmedFraction}` : groupedWhole
}

function pickPreferredToken(tokens, preferredSymbols = ['USDC']) {
  for (const symbol of preferredSymbols) {
    const match = tokens.find((token) => token.symbol === symbol)
    if (match) return match
  }

  return tokens[0] ?? null
}

function pickPreferredSourceChain(chains) {
  for (const chainId of SOURCE_CHAIN_PRIORITY) {
    const match = chains.find((chain) => getChainId(chain) === chainId)
    if (match && getChainId(match) !== getChainId(LITVM_CHAIN)) return match
  }

  return chains.find((chain) => getChainId(chain) !== getChainId(LITVM_CHAIN)) ?? chains[0] ?? null
}

function mergeSupportedChains(chains) {
  const byId = new Map(chains.map((chain) => [getChainId(chain), chain]))
  const existingLitvm = byId.get(getChainId(LITVM_CHAIN))

  byId.set(getChainId(LITVM_CHAIN), {
    ...existingLitvm,
    ...LITVM_CHAIN,
    nativeCurrency: existingLitvm?.nativeCurrency ?? LITVM_CHAIN.nativeCurrency,
    defaultRpc: LITVM_CHAIN.defaultRpc,
    alternativeRpcs: existingLitvm?.alternativeRpcs ?? [],
  })

  return Array.from(byId.values())
}

function getChainRpcUrl(chain) {
  return chain?.defaultRpc?.http || chain?.alternativeRpcs?.[0]?.http || ''
}

function buildWalletChainParams(chain) {
  const rpcUrls = [getChainRpcUrl(chain)].filter(Boolean)
  const blockExplorerUrls = [chain?.blockExplorer?.url].filter(Boolean)

  return {
    chainId: getHexChainId(getChainId(chain)),
    chainName: chain.name,
    nativeCurrency: {
      name: chain?.nativeCurrency?.name ?? 'Token',
      symbol: chain?.nativeCurrency?.symbol ?? 'TOKEN',
      decimals: chain?.nativeCurrency?.decimals ?? 18,
    },
    rpcUrls,
    blockExplorerUrls,
  }
}

function toSerializableTypedData(value) {
  if (typeof value === 'bigint') return Number(value)
  if (Array.isArray(value)) return value.map(toSerializableTypedData)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, toSerializableTypedData(nested)]))
  }

  return value
}

function getTransactionStatusCopy(type) {
  switch (type) {
    case TransactionType.ERC20_APPROVAL:
      return 'Approve token access in your wallet.'
    case TransactionType.ORDER:
      return 'Confirm the bridge transaction.'
    case TransactionType.PROVE:
      return 'Submit the proof transaction.'
    case TransactionType.CLAIM:
      return 'Claim the destination funds.'
    default:
      return 'Confirm the next bridge step.'
  }
}

function getOrderStatusCopy(status) {
  switch (status) {
    case OrderStatus.PENDING:
      return 'Bridge is in flight through Caldera.'
    case OrderStatus.WAITING_TO_PROVE:
      return 'Waiting for a proof step before the route can finish.'
    case OrderStatus.WAITING_TO_CLAIM:
      return 'Funds are ready for the final claim step.'
    case OrderStatus.WITHDRAWAL_PROVEN:
      return 'Withdrawal proof landed successfully.'
    case OrderStatus.FULFILLED:
      return 'Funds arrived on LitVM.'
    case OrderStatus.REFUNDED:
      return 'The route refunded back to the source wallet.'
    case OrderStatus.FAILED:
      return 'The route failed. Try a fresh quote.'
    default:
      return 'Route submitted. Waiting for status updates.'
  }
}

function getOrderStatusLabel(status) {
  switch (status) {
    case OrderStatus.PENDING:
      return 'Pending'
    case OrderStatus.WAITING_TO_PROVE:
      return 'Waiting To Prove'
    case OrderStatus.WITHDRAWAL_PROVEN:
      return 'Withdrawal Proven'
    case OrderStatus.WAITING_TO_CLAIM:
      return 'Waiting To Claim'
    case OrderStatus.FULFILLED:
      return 'Fulfilled'
    case OrderStatus.REFUNDED:
      return 'Refunded'
    case OrderStatus.FAILED:
      return 'Failed'
    default:
      return 'Tracking'
  }
}

export default function DashboardPage() {
  const metalayerClient = useMemo(() => {
    if (!METALAYER_API_KEY) return null

    return MetalayerClient.init({
      apiKey: METALAYER_API_KEY,
      environment: METALAYER_ENV,
      defaultOptions: {
        quotePreference: 'bestReturn',
      },
    })
  }, [])

  const [isBridgeOpen, setIsBridgeOpen] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isExecutingBridge, setIsExecutingBridge] = useState(false)
  const [walletStatus, setWalletStatus] = useState('')
  const [walletAddress, setWalletAddress] = useState('')
  const [walletChainId, setWalletChainId] = useState(null)
  const [supportedChains, setSupportedChains] = useState([])
  const [isBridgeDataLoading, setIsBridgeDataLoading] = useState(false)
  const [sourceChainId, setSourceChainId] = useState(0)
  const [sourceToken, setSourceToken] = useState(null)
  const [destinationToken, setDestinationToken] = useState(null)
  const [amountInput, setAmountInput] = useState('')
  const [sourceBalance, setSourceBalance] = useState(null)
  const [quoteData, setQuoteData] = useState(null)
  const [quoteError, setQuoteError] = useState('')
  const [bridgeError, setBridgeError] = useState('')
  const [bridgeStatus, setBridgeStatus] = useState('')
  const [trackedOrder, setTrackedOrder] = useState(null)
  const [orderLookup, setOrderLookup] = useState(null)

  const sourceChain = useMemo(
    () => supportedChains.find((chain) => getChainId(chain) === sourceChainId) ?? null,
    [sourceChainId, supportedChains],
  )
  const destinationChain = useMemo(
    () => supportedChains.find((chain) => getChainId(chain) === getChainId(LITVM_CHAIN)) ?? LITVM_CHAIN,
    [supportedChains],
  )
  const activeQuote = quoteData?.quotes?.[0]
  const amountValue = useMemo(() => {
    if (!sourceToken || !amountInput) return null

    try {
      return parseUnits(amountInput, sourceToken.decimals)
    } catch {
      return null
    }
  }, [amountInput, sourceToken])

  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum?.request) return undefined

    async function hydrateWalletState() {
      try {
        const [accounts, currentChainId] = await Promise.all([
          window.ethereum.request({ method: 'eth_accounts' }),
          window.ethereum.request({ method: 'eth_chainId' }),
        ])

        const nextWallet = accounts?.[0] ?? ''
        setWalletAddress(nextWallet)
        setWalletChainId(currentChainId ? Number.parseInt(currentChainId, 16) : null)

        if (nextWallet) {
          setWalletStatus(`Connected ${shortAddress(nextWallet)}`)
        }
      } catch {
        // Ignore passive wallet hydration errors.
      }
    }

    function handleAccountsChanged(accounts) {
      const nextWallet = accounts?.[0] ?? ''
      setWalletAddress(nextWallet)
      setTrackedOrder(null)
      setOrderLookup(null)

      if (nextWallet) {
        setWalletStatus(`Connected ${shortAddress(nextWallet)}`)
      } else {
        setWalletStatus('Wallet disconnected.')
      }
    }

    function handleChainChanged(nextChainId) {
      setWalletChainId(Number.parseInt(nextChainId, 16))
    }

    hydrateWalletState()
    window.ethereum.on?.('accountsChanged', handleAccountsChanged)
    window.ethereum.on?.('chainChanged', handleChainChanged)

    return () => {
      window.ethereum.removeListener?.('accountsChanged', handleAccountsChanged)
      window.ethereum.removeListener?.('chainChanged', handleChainChanged)
    }
  }, [])

  useEffect(() => {
    if (!isBridgeOpen || !metalayerClient) return undefined

    let cancelled = false

    async function loadSupportedChains() {
      setIsBridgeDataLoading(true)
      setBridgeError('')

      try {
        const { chains } = await metalayerClient.getSupportedChains()
        if (cancelled) return

        const mergedChains = mergeSupportedChains(chains)
        const preferredSourceChain = pickPreferredSourceChain(mergedChains)

        setSupportedChains(mergedChains)
        setSourceChainId((currentChainId) => {
          const isCurrentValid = mergedChains.some((chain) => getChainId(chain) === currentChainId)
          return isCurrentValid ? currentChainId : getChainId(preferredSourceChain)
        })
      } catch (error) {
        if (!cancelled) {
          setBridgeError(normalizeError(error))
        }
      } finally {
        if (!cancelled) {
          setIsBridgeDataLoading(false)
        }
      }
    }

    loadSupportedChains()

    return () => {
      cancelled = true
    }
  }, [isBridgeOpen, metalayerClient])

  useEffect(() => {
    if (!isBridgeOpen || !metalayerClient || !sourceChainId) return undefined

    let cancelled = false

    async function loadTokens() {
      try {
        const { tokensByChain } = await metalayerClient.getTokens({
          chainIds: [sourceChainId, getChainId(destinationChain)],
        })

        if (cancelled) return

        const nextSourceTokens = tokensByChain[sourceChainId]?.tokens ?? []
        const nextDestinationTokens = tokensByChain[getChainId(destinationChain)]?.tokens ?? []
        const preferredSourceToken = pickPreferredToken(nextSourceTokens, ['USDC', 'USDT'])
        const preferredDestinationToken = pickPreferredToken(nextDestinationTokens, ['USDC'])

        setSourceToken(preferredSourceToken)
        setDestinationToken(preferredDestinationToken)
      } catch (error) {
        if (!cancelled) {
          setBridgeError(normalizeError(error))
        }
      }
    }

    loadTokens()

    return () => {
      cancelled = true
    }
  }, [destinationChain, isBridgeOpen, metalayerClient, sourceChainId])

  useEffect(() => {
    if (!walletAddress || !sourceChain || !sourceToken || !isBridgeOpen) {
      setSourceBalance(null)
      return undefined
    }

    const rpcUrl = getChainRpcUrl(sourceChain)
    if (!rpcUrl) {
      setSourceBalance(null)
      return undefined
    }

    let cancelled = false

    async function loadSourceBalance() {
      try {
        const publicClient = createPublicClient({
          transport: http(rpcUrl),
        })

        const nextBalance = sourceToken.isNativeToken
          ? await publicClient.getBalance({ address: walletAddress })
          : await publicClient.readContract({
              address: sourceToken.address,
              abi: ERC20_BALANCE_ABI,
              functionName: 'balanceOf',
              args: [walletAddress],
            })

        if (!cancelled) {
          setSourceBalance(nextBalance)
        }
      } catch {
        if (!cancelled) {
          setSourceBalance(null)
        }
      }
    }

    loadSourceBalance()

    return () => {
      cancelled = true
    }
  }, [isBridgeOpen, sourceChain, sourceToken, walletAddress])

  useEffect(() => {
    if (!isBridgeOpen) return undefined

    setQuoteError('')
    setBridgeError('')
    setTrackedOrder(null)
    setOrderLookup(null)

    if (!metalayerClient || !walletAddress || !sourceToken || !destinationToken || !amountValue || amountValue <= 0n) {
      setQuoteData(null)
      return undefined
    }

    let cancelled = false
    const timeoutId = window.setTimeout(async () => {
      try {
        setBridgeStatus('Finding the best Caldera route into LitVM...')

        const nextQuoteData = await metalayerClient.quote({
          sourceChainId,
          sourceTokenAddress: sourceToken.address,
          destinationChainId: getChainId(destinationChain),
          destinationTokenAddress: destinationToken.address,
          amount: amountValue,
          senderAddress: walletAddress,
          quotePreference: 'bestReturn',
        })

        if (cancelled) return

        setQuoteData(nextQuoteData)

        if (nextQuoteData.quotes.length > 0) {
          const bestQuote = nextQuoteData.quotes[0]
          setBridgeStatus(
            `${formatQuoteProvider(bestQuote.provider)} route ready in about ${Math.max(bestQuote.estimatedFillTimeSecs, 1)}s.`,
          )
        } else {
          setBridgeStatus('No Caldera route is available for this amount yet.')
        }
      } catch (error) {
        if (!cancelled) {
          setQuoteError(normalizeError(error))
          setQuoteData(null)
          setBridgeStatus('')
        }
      }
    }, 320)

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [
    amountValue,
    destinationChain,
    destinationToken,
    isBridgeOpen,
    metalayerClient,
    sourceChainId,
    sourceToken,
    walletAddress,
  ])

  useEffect(() => {
    if (!metalayerClient || !orderLookup) return undefined

    let cancelled = false
    let timeoutId

    async function pollOrder() {
      try {
        const { order } = await metalayerClient.getOrder({
          identifier: {
            case: 'sourceTransaction',
            value: {
              transactionHash: orderLookup.transactionHash,
              chainId: orderLookup.chainId,
              architecture: ChainArchitecture.ETHEREUM,
            },
          },
          includeNextSteps: true,
        })

        if (cancelled || !order) return

        setTrackedOrder(order)
        setBridgeStatus(getOrderStatusCopy(order.status))

        if (!FINAL_ORDER_STATUSES.has(order.status)) {
          timeoutId = window.setTimeout(pollOrder, 10_000)
        }
      } catch (error) {
        if (!cancelled) {
          setBridgeError(normalizeError(error))
          timeoutId = window.setTimeout(pollOrder, 15_000)
        }
      }
    }

    pollOrder()

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [metalayerClient, orderLookup])

  async function handleConnectWallet() {
    if (typeof window === 'undefined' || !window.ethereum?.request) {
      setWalletStatus('No compatible wallet was detected.')
      return
    }

    setIsConnecting(true)
    setBridgeError('')

    try {
      const [accounts, currentChainId] = await Promise.all([
        window.ethereum.request({ method: 'eth_requestAccounts' }),
        window.ethereum.request({ method: 'eth_chainId' }),
      ])
      const nextWallet = accounts?.[0] ?? ''

      setWalletAddress(nextWallet)
      setWalletChainId(currentChainId ? Number.parseInt(currentChainId, 16) : null)
      setWalletStatus(nextWallet ? `Connected ${shortAddress(nextWallet)}` : 'Wallet connected.')
    } catch (error) {
      const rejected = error?.code === 4001
      setWalletStatus(rejected ? 'Wallet connection was cancelled.' : 'Unable to connect wallet.')
    } finally {
      setIsConnecting(false)
    }
  }

  async function ensureWalletChain(chain) {
    if (typeof window === 'undefined' || !window.ethereum?.request) {
      throw new Error('No compatible wallet was detected.')
    }

    const targetChainId = getChainId(chain)
    const targetHexChainId = getHexChainId(targetChainId)
    const currentChainId = await window.ethereum.request({ method: 'eth_chainId' })

    if (currentChainId?.toLowerCase() === targetHexChainId.toLowerCase()) return

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: targetHexChainId }],
      })
    } catch (error) {
      const isMissingChain =
        error?.code === 4902 ||
        /unknown chain|unrecognized chain|not added/i.test(String(error?.message ?? ''))

      if (!isMissingChain) throw error

      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [buildWalletChainParams(chain)],
      })

      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: targetHexChainId }],
      })
    }

    setWalletChainId(targetChainId)
  }

  function resetBridgeForm() {
    setAmountInput('')
    setQuoteData(null)
    setQuoteError('')
    setBridgeError('')
    setBridgeStatus('')
    setTrackedOrder(null)
    setOrderLookup(null)
  }

  function handleMaxAmount() {
    if (sourceBalance == null || !sourceToken) return

    setAmountInput(formatAmountInput(formatUnits(sourceBalance, sourceToken.decimals)))
  }

  async function handleBridgeAction() {
    if (!walletAddress) {
      setBridgeError('Connect your wallet from the top-right button when you are ready.')
      return
    }

    if (!METALAYER_API_KEY || !metalayerClient) {
      setBridgeError('Add VITE_METALAYER_API_KEY to enable the live Caldera bridge.')
      return
    }

    if (!activeQuote) {
      setBridgeError('A live Caldera route has not loaded yet.')
      return
    }

    if (typeof window === 'undefined' || !window.ethereum?.request) {
      setBridgeError('No compatible wallet was detected.')
      return
    }

    setIsExecutingBridge(true)
    setBridgeError('')

    try {
      let firstSubmittedHash = ''
      let orderTransactionHash = ''

      for (const step of activeQuote.steps) {
        if (step.action.case === 'transactionRequest') {
          const transactionRequest = step.action.value
          const executionChain =
            supportedChains.find((chain) => getChainId(chain) === transactionRequest.chainId) ??
            (transactionRequest.chainId === getChainId(LITVM_CHAIN) ? LITVM_CHAIN : sourceChain)

          setBridgeStatus(getTransactionStatusCopy(transactionRequest.type))
          await ensureWalletChain(executionChain)

          const params = {
            from: walletAddress,
            to: transactionRequest.to,
            data: transactionRequest.data ?? '0x',
          }

          if (transactionRequest.value) {
            params.value = toHex(BigInt(transactionRequest.value))
          }

          const transactionHash = await window.ethereum.request({
            method: 'eth_sendTransaction',
            params: [params],
          })

          if (!firstSubmittedHash) {
            firstSubmittedHash = transactionHash
          }

          if (transactionRequest.type === TransactionType.ORDER) {
            orderTransactionHash = transactionHash
          }

          await metalayerClient.registerOrderEvent({
            orderId: activeQuote.quoteId,
            transactionType: transactionRequest.type,
            chain: {
              id: transactionRequest.chainId,
              architecture: ChainArchitecture.ETHEREUM,
            },
            transactionHash,
          })
        }

        if (step.action.case === 'eip712Data') {
          const typedData = step.action.value
          const chainId = typedData.domain?.chainId ? Number(typedData.domain.chainId) : sourceChainId

          if (chainId) {
            const signingChain =
              supportedChains.find((chain) => getChainId(chain) === chainId) ??
              (chainId === getChainId(LITVM_CHAIN) ? LITVM_CHAIN : sourceChain)

            await ensureWalletChain(signingChain)
          }

          setBridgeStatus('Confirm the bridge signature in your wallet.')

          await window.ethereum.request({
            method: 'eth_signTypedData_v4',
            params: [
              typedData.account || walletAddress,
              JSON.stringify(
                toSerializableTypedData({
                  domain: typedData.domain ?? {},
                  types: typedData.types,
                  primaryType: typedData.primaryType,
                  message: typedData.message ?? {},
                }),
              ),
            ],
          })
        }
      }

      const trackingHash = orderTransactionHash || firstSubmittedHash

      if (!trackingHash) {
        throw new Error('The route did not return a source transaction hash.')
      }

      setOrderLookup({
        transactionHash: trackingHash,
        chainId: sourceChainId,
      })
      setBridgeStatus('Bridge submitted. Tracking the Caldera order now.')
    } catch (error) {
      setBridgeError(normalizeError(error))
      setBridgeStatus('')
    } finally {
      setIsExecutingBridge(false)
    }
  }

  const bridgeActionLabel = !walletAddress
    ? 'Connect Wallet Above'
    : isExecutingBridge
      ? 'Bridging...'
      : activeQuote
        ? 'Bridge to LitVM'
        : METALAYER_API_KEY
          ? (amountInput ? 'Finding Route...' : 'Enter Amount')
          : 'Set Metalayer API Key'

  const routeCardTitle = !METALAYER_API_KEY
    ? 'LitVM bridge is wired for the official Caldera SDK flow'
    : trackedOrder
      ? `${getOrderStatusLabel(trackedOrder.status)} on LitVM`
      : activeQuote
        ? `${formatQuoteProvider(activeQuote.provider)} route into LitVM`
        : 'LitVM bridge ready for quote discovery'

  const routeCardCopy = !METALAYER_API_KEY
    ? 'Add VITE_METALAYER_API_KEY to turn on live quote discovery, execution, and order tracking through Metalayer.'
    : trackedOrder
      ? getOrderStatusCopy(trackedOrder.status)
      : activeQuote
        ? `${formatTokenAmount(activeQuote.amountOut, destinationToken?.decimals ?? 6)} ${destinationToken?.symbol ?? 'USDC'} estimated on LitVM with ${formatTokenAmount(activeQuote.totalFees, sourceToken?.decimals ?? 6)} ${sourceToken?.symbol ?? 'USDC'} in fees.`
        : (bridgeStatus || 'Connect your wallet and enter an amount to load a route into LitVM chain 4441.')

  const routeTags = trackedOrder
    ? [
        getOrderStatusLabel(trackedOrder.status),
        shortAddress(trackedOrder.sourceTransactionHash),
        `${destinationChain.name} · 4441`,
      ]
    : activeQuote
      ? [
          formatQuoteProvider(activeQuote.provider),
          `${Math.max(activeQuote.estimatedFillTimeSecs, 1)}s est`,
          `${destinationChain.name} · 4441`,
        ]
      : ['@metalayer/sdk', `${destinationChain.name} · 4441`, formatChainArchitecture(getChainArchitecture(destinationChain))]

  const destinationOutput = activeQuote
    ? `${formatTokenAmount(activeQuote.amountOut, destinationToken?.decimals ?? 6)} ${destinationToken?.symbol ?? 'USDC'}`
    : `0 ${destinationToken?.symbol ?? 'USDC'}`

  const sourceBalanceCopy = !walletAddress
    ? 'Connect wallet'
    : sourceBalance == null || !sourceToken
      ? 'Balance loading'
      : `${formatTokenAmount(sourceBalance, sourceToken.decimals)} ${sourceToken.symbol}`

  return (
    <>
      <main className={`dashboard-page${isBridgeOpen ? ' is-modal-open' : ''}`}>
        <div className="dashboard-shell">
          <header className="dashboard-header">
            <div className="dashboard-topbar">
              <a className="dashboard-back-link" href="/">
                Back to main page
              </a>
            </div>

            <section className="dashboard-actions" aria-label="Dashboard actions">
              <button
                type="button"
                className="dashboard-button dashboard-button-primary"
                onClick={() => setIsBridgeOpen(true)}
              >
                Swap + Bridge
              </button>
              <button
                type="button"
                className="dashboard-button dashboard-button-ghost"
                onClick={handleConnectWallet}
                disabled={isConnecting}
              >
                {walletAddress ? shortAddress(walletAddress) : (isConnecting ? 'Connecting...' : 'Connect Wallet')}
              </button>
            </section>
          </header>

          {walletStatus ? <p className="wallet-status">{walletStatus}</p> : null}

          <section className="dashboard-balance-card">
            <div className="balance-header">
              <div>
                <p className="section-label">Earning Balance</p>
                <h1>$0</h1>
              </div>

              <div className="tvl-pill">
                <span>Earning TVL</span>
                <strong>$69.64M</strong>
              </div>
            </div>

            <div className="balance-divider" />

            <div className="balance-stats-row">
              <div className="stat-group">
                <div className="stat-icon">◈</div>
                <div>
                  <span className="section-label">Unclaimed Rewards</span>
                  <strong>$0</strong>
                </div>
              </div>

              <div className="stat-actions">
                <div className="soft-pill">$0 Claimed</div>
                <button type="button" className="dashboard-button dashboard-button-soft-secondary">
                  Claim
                </button>
              </div>

              <div className="stat-group stat-group-right">
                <div className="stat-icon">◐</div>
                <div>
                  <span className="section-label">Idle Assets</span>
                  <strong>
                    $0 <small>0%</small>
                  </strong>
                </div>
              </div>

              <button type="button" className="dashboard-button dashboard-button-blue">
                Earn
              </button>
            </div>
          </section>

          <section className="promo-stack">
            {promos.map((promo) => (
              <article key={promo.title} className={promo.tone}>
                <div className="promo-copy">
                  <div className="promo-icon">{promo.icon}</div>
                  <div>
                    <h2>{promo.title}</h2>
                    <p>{promo.body}</p>
                  </div>
                </div>

                <button
                  type="button"
                  className={promo.cta === 'Open Caldera bridge' ? 'promo-button promo-button-blue' : 'promo-button'}
                  onClick={promo.cta === 'Open Caldera bridge' ? () => setIsBridgeOpen(true) : undefined}
                >
                  {promo.cta}
                </button>
              </article>
            ))}
          </section>

          <section className="vaults-card">
            <div className="vaults-top">
              <div className="tab-pills">
                <button type="button" className="tab-pill">
                  Earn
                </button>
                <button type="button" className="tab-pill is-active">
                  Your Positions
                </button>
              </div>

              <div className="view-switch">
                <button type="button" className="view-pill is-active" aria-label="List view">
                  ☰
                </button>
                <button type="button" className="view-pill" aria-label="Grid view">
                  ⬚
                </button>
              </div>
            </div>

            <div className="vaults-filters">
              <div className="filter-row">
                <span>Deposit:</span>
                <div className="filter-pill">All</div>
              </div>
              <div className="filter-row">
                <span>Curator:</span>
                <div className="filter-pill">
                  <span className="filter-dot">◉</span>
                  All
                </div>
              </div>
            </div>

            <div className="vault-table-head">
              <span>Vault</span>
              <span>Total Deposits</span>
              <span>APY</span>
              <span>Exposure</span>
              <span>Curator</span>
            </div>

            <div className="vault-table-body">
              {vaults.map((vault) => (
                <article key={vault.name} className="vault-row">
                  <div className="vault-main">
                    <div className="vault-orb" />
                    <div>
                      <strong>{vault.name}</strong>
                      <span>{vault.tag}</span>
                    </div>
                  </div>
                  <div className="vault-cell">
                    <strong>{vault.deposits}</strong>
                    <span>0 {vault.asset}</span>
                  </div>
                  <div className="vault-cell vault-apy">{vault.apy}</div>
                  <div className="vault-cell">{vault.exposure}</div>
                  <div className="vault-cell">{vault.curator}</div>
                </article>
              ))}
            </div>

            <div className="vault-empty">
              <button
                type="button"
                className="dashboard-button dashboard-button-ghost"
                onClick={handleConnectWallet}
                disabled={isConnecting}
              >
                {walletAddress ? shortAddress(walletAddress) : (isConnecting ? 'Connecting...' : 'Connect Wallet')}
              </button>
            </div>
          </section>

          <section className="coming-soon-card">
            <span className="coming-soon-icon">▣</span>
            <span>More vaults coming soon</span>
          </section>
        </div>
      </main>

      {isBridgeOpen && (
        <div className="bridge-modal-layer" role="dialog" aria-modal="true" aria-label="Swap and bridge">
          <button
            type="button"
            className="bridge-modal-backdrop"
            aria-label="Close swap and bridge"
            onClick={() => setIsBridgeOpen(false)}
          />

          <div className="bridge-modal">
            <div className="bridge-modal-header">
              <div className="bridge-modal-title">
                <span>Swap + Bridge</span>
                <span className="express-pill">Caldera SDK</span>
              </div>

              <div className="bridge-modal-actions">
                <button type="button" className="icon-pill" aria-label="Reset bridge form" onClick={resetBridgeForm}>
                  ⚙
                </button>
                <button type="button" className="icon-pill" aria-label="Close" onClick={() => setIsBridgeOpen(false)}>
                  ✕
                </button>
              </div>
            </div>

            <div className="swap-box from-box">
              <div className="swap-field-head">
                <span className="swap-label">From</span>
                <select
                  className="swap-chain-select"
                  value={sourceChainId}
                  onChange={(event) => {
                    setSourceChainId(Number(event.target.value))
                    setAmountInput('')
                    setQuoteData(null)
                    setTrackedOrder(null)
                    setOrderLookup(null)
                  }}
                  disabled={isBridgeDataLoading || supportedChains.length === 0}
                >
                  {supportedChains
                    .filter((chain) => getChainId(chain) !== getChainId(destinationChain))
                    .map((chain) => (
                      <option key={getChainId(chain)} value={getChainId(chain)}>
                        {chain.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="swap-amount-row">
                <input
                  className="swap-amount-input"
                  inputMode="decimal"
                  placeholder="0"
                  value={amountInput}
                  onChange={(event) => {
                    const nextValue = event.target.value.replace(/[^0-9.]/g, '')
                    const dotIndex = nextValue.indexOf('.')
                    const sanitizedValue =
                      dotIndex === -1
                        ? nextValue
                        : `${nextValue.slice(0, dotIndex + 1)}${nextValue.slice(dotIndex + 1).replace(/\./g, '')}`

                    setAmountInput(sanitizedValue)
                  }}
                />

                <div className="token-pill">
                  <span className="token-badge">{sourceToken?.symbol?.[0] ?? '$'}</span>
                  <span>{sourceToken?.symbol ?? 'USDC'}</span>
                </div>
              </div>

              <div className="swap-foot-row">
                <span>{sourceChain?.name ?? 'Loading chain'}</span>
                <span>
                  {sourceBalanceCopy}
                  <button type="button" onClick={handleMaxAmount} disabled={sourceBalance == null}>
                    MAX
                  </button>
                </span>
              </div>
            </div>

            <div className="bridge-swap-icon">⬍</div>

            <div className="swap-box to-box">
              <div className="swap-field-head">
                <span className="swap-label">To</span>
                <div className="swap-destination-pill">{destinationChain.name} · 4441</div>
              </div>

              <div className="swap-amount-row">
                <strong>{activeQuote ? formatTokenAmount(activeQuote.amountOut, destinationToken?.decimals ?? 6) : '0'}</strong>
                <div className="token-pill token-pill-destination">
                  <span className="token-badge">{destinationToken?.symbol?.[0] ?? '$'}</span>
                  <span>{destinationToken?.symbol ?? 'USDC'}</span>
                </div>
              </div>

              <div className="swap-foot-row">
                <span>zkLTC gas · Sepolia settlement</span>
                <span>{destinationOutput}</span>
              </div>
            </div>

            <button
              type="button"
              className="dashboard-button dashboard-button-blue bridge-connect-button"
              onClick={handleBridgeAction}
              disabled={!walletAddress || isExecutingBridge || isBridgeDataLoading || (walletAddress && !METALAYER_API_KEY)}
            >
              {bridgeActionLabel}
            </button>

            {(quoteError || bridgeError) ? (
              <p className="bridge-feedback bridge-feedback-error">{bridgeError || quoteError}</p>
            ) : null}

            {bridgeStatus ? <p className="bridge-feedback">{bridgeStatus}</p> : null}

            <div className="bridge-route-card">
              <div className="bridge-route-copy">
                <span className="bridge-route-chip">Official Caldera integration path</span>
                <strong>{routeCardTitle}</strong>
                <p>{routeCardCopy}</p>
              </div>

              <div className="bridge-route-tags" aria-label="Bridge route details">
                {routeTags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>

              <div className="bridge-details-section" aria-label="LitVM details">
                <span className="bridge-route-chip">LitVM details</span>
                <div className="bridge-details-grid">
                  {LITVM_DETAILS.map((detail) => (
                    <div key={detail.label} className="bridge-detail-item">
                      <span>{detail.label}</span>
                      {detail.href ? (
                        <a href={detail.href} target="_blank" rel="noreferrer">
                          {detail.value}
                        </a>
                      ) : (
                        <strong>{detail.value}</strong>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
