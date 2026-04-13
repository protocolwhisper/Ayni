import { useEffect, useMemo, useState } from 'react'
import { createPublicClient, encodeFunctionData, formatEther, formatUnits, http, isAddress, parseEther } from 'viem'
import './WrappedBridgeModal.css'

const WRAPPED_ZKLTC_ABI = [
  {
    inputs: [],
    name: 'deposit',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
]

const ERC20_BALANCE_ABI = [
  {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
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

const WZKLTC_CONTRACT_ADDRESS = import.meta.env.VITE_WZKLTC_CONTRACT_ADDRESS ?? ''
const WZKLTC_CHAIN_ID =
  Number.parseInt(import.meta.env.VITE_PUBLIC_CHAIN_ID ?? import.meta.env.VITE_WZKLTC_CHAIN_ID ?? '', 10) || null
const WZKLTC_RPC_URL = import.meta.env.VITE_PUBLIC_RPC_URL ?? import.meta.env.VITE_WZKLTC_RPC_URL ?? ''
const ZKLTC_TOKEN_ADDRESS = import.meta.env.VITE_ZKLTC_TOKEN_ADDRESS ?? ''
const SOURCE_CHAIN_NAME = import.meta.env.VITE_WZKLTC_SOURCE_CHAIN_NAME ?? 'Liteforge'
const DESTINATION_CHAIN_NAME = import.meta.env.VITE_WZKLTC_DEST_CHAIN_NAME ?? 'Wrapped zkLTC'
const CONTRACT_LABEL = import.meta.env.VITE_WZKLTC_CONTRACT_LABEL ?? 'Wrapped zkLTC'

function formatTokenAmount(value, maximumFractionDigits = 4) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return '0'
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  })
}

function shortAddress(value) {
  if (!value) return ''
  return `${value.slice(0, 6)}...${value.slice(-4)}`
}

function hexValue(value) {
  return `0x${value.toString(16)}`
}

function BridgeGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M7 4v12m0 0-3-3m3 3 3-3M17 20V8m0 0-3 3m3-3 3 3M7 4a2 2 0 1 0 0 .01M17 20a2 2 0 1 0 0 .01"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  )
}

function CloseGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 6 18 18M18 6 6 18" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  )
}

function RouteGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 4 7 10h3v4h4v-4h3L12 4Zm0 16 5-6h-3v-4h-4v4H7l5 6Z"
        fill="currentColor"
      />
    </svg>
  )
}

function NetworkBadge({ tone, symbol, label, sublabel }) {
  return (
    <div className={`wzkltc-token-pill wzkltc-token-pill-${tone}`}>
      <span className={`wzkltc-token-mark wzkltc-token-mark-${tone}`}>{symbol}</span>
      <span className="wzkltc-token-copy">
        <strong>{label}</strong>
        <small>{sublabel}</small>
      </span>
    </div>
  )
}

export default function WrappedBridgeModal({
  isOpen,
  onClose,
  walletAddress,
  onConnectWallet,
  isConnecting,
}) {
  const [sendAmount, setSendAmount] = useState('')
  const [walletBalance, setWalletBalance] = useState(0)
  const [gasReserve, setGasReserve] = useState(0)
  const [activeChainId, setActiveChainId] = useState(null)
  const [panelMessage, setPanelMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const walletConnected = Boolean(walletAddress)
  const contractConfigured = isAddress(WZKLTC_CONTRACT_ADDRESS)
  const sourceTokenConfigured = isAddress(ZKLTC_TOKEN_ADDRESS)
  const parsedAmount = Number.parseFloat(sendAmount)
  const normalizedAmount = Number.isFinite(parsedAmount) ? parsedAmount : 0
  const suggestedMax = sourceTokenConfigured ? walletBalance : Math.max(walletBalance - gasReserve, 0)
  const sourceClient = useMemo(() => {
    if (!WZKLTC_RPC_URL) return null

    return createPublicClient({
      transport: http(WZKLTC_RPC_URL),
    })
  }, [])

  const actionLabel = useMemo(() => {
    if (!contractConfigured) return 'Coming Soon'
    if (isSubmitting) return 'Sending...'
    return 'Wrap zkLTC'
  }, [contractConfigured, isSubmitting])

  const connectLabel = isConnecting ? 'Connecting...' : 'Connect Wallet'

  useEffect(() => {
    if (!walletConnected) {
      setWalletBalance(0)
      return undefined
    }

    let cancelled = false

    async function syncWalletState() {
      try {
        if (sourceClient) {
          const [chainId, balance] = await Promise.all([
            sourceClient.getChainId(),
            sourceTokenConfigured
              ? sourceClient.readContract({
                  address: ZKLTC_TOKEN_ADDRESS,
                  abi: ERC20_BALANCE_ABI,
                  functionName: 'balanceOf',
                  args: [walletAddress],
                })
              : sourceClient.getBalance({ address: walletAddress }),
          ])

          if (cancelled) return

          if (sourceTokenConfigured) {
            const decimals = await sourceClient.readContract({
              address: ZKLTC_TOKEN_ADDRESS,
              abi: ERC20_BALANCE_ABI,
              functionName: 'decimals',
            })

            if (cancelled) return

            setWalletBalance(Number.parseFloat(formatUnits(balance, decimals)))
          } else {
            setWalletBalance(Number.parseFloat(formatEther(balance)))
          }

          setActiveChainId(chainId)
          return
        }

        if (typeof window === 'undefined' || !window.ethereum?.request) {
          setWalletBalance(0)
          return
        }

        const [balanceHex, chainHex] = await Promise.all([
          window.ethereum.request({ method: 'eth_getBalance', params: [walletAddress, 'latest'] }),
          window.ethereum.request({ method: 'eth_chainId' }),
        ])

        if (cancelled) return

        setWalletBalance(Number.parseFloat(formatEther(BigInt(balanceHex))))
        setActiveChainId(Number.parseInt(chainHex, 16))
      } catch {
        if (!cancelled) {
          setWalletBalance(0)
        }
      }
    }

    syncWalletState()

    return () => {
      cancelled = true
    }
  }, [sourceClient, sourceTokenConfigured, walletAddress, walletConnected])

  useEffect(() => {
    if (!walletConnected || sourceTokenConfigured || !sourceClient || !contractConfigured) {
      setGasReserve(0)
      return undefined
    }

    let cancelled = false

    async function estimateGasReserve() {
      try {
        const data = encodeFunctionData({
          abi: WRAPPED_ZKLTC_ABI,
          functionName: 'deposit',
        })

        const [gasEstimate, feeEstimate] = await Promise.all([
          sourceClient.estimateGas({
            account: walletAddress,
            to: WZKLTC_CONTRACT_ADDRESS,
            data,
            value: 0n,
          }),
          sourceClient
            .estimateFeesPerGas()
            .catch(async () => ({ gasPrice: await sourceClient.getGasPrice() })),
        ])

        if (cancelled) return

        const feePerGas = feeEstimate.maxFeePerGas ?? feeEstimate.gasPrice ?? 0n
        const reserveWei = gasEstimate * feePerGas
        setGasReserve(Number.parseFloat(formatEther(reserveWei)))
      } catch {
        if (!cancelled) {
          setGasReserve(0)
        }
      }
    }

    estimateGasReserve()

    return () => {
      cancelled = true
    }
  }, [contractConfigured, sourceClient, sourceTokenConfigured, walletAddress, walletConnected])

  if (!isOpen) return null

  async function handlePresetFill(share) {
    if (!walletAddress) {
      await onConnectWallet?.()
      return
    }

    const value = share === 1 ? suggestedMax : suggestedMax * share
    const nextValue = value > 0 ? value.toFixed(4).replace(/\.?0+$/, '') : ''
    setSendAmount(nextValue)
    setPanelMessage('')
  }

  async function ensureTargetChain() {
    if (!WZKLTC_CHAIN_ID || typeof window === 'undefined' || !window.ethereum?.request) return true
    if (activeChainId === WZKLTC_CHAIN_ID) return true

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: hexValue(BigInt(WZKLTC_CHAIN_ID)) }],
      })
      setActiveChainId(WZKLTC_CHAIN_ID)
      return true
    } catch (error) {
      const userRejected = error?.code === 4001
      setPanelMessage(
        userRejected
          ? 'Chain switch was cancelled.'
          : `Switch your wallet to chain ${WZKLTC_CHAIN_ID} before minting.`,
      )
      return false
    }
  }

  async function handleMint() {
    if (!walletAddress) {
      await onConnectWallet?.()
      return
    }

    if (!contractConfigured) {
      setPanelMessage('Wrapping is not available on this deployment yet.')
      return
    }

    if (!(normalizedAmount > 0)) {
      setPanelMessage('Enter how much zkLTC should be wrapped.')
      return
    }

    if (normalizedAmount > suggestedMax) {
      setPanelMessage('Amount is above the spendable wallet balance.')
      return
    }

    const canProceed = await ensureTargetChain()
    if (!canProceed) return

    setIsSubmitting(true)
    setPanelMessage('')

    try {
      const value = parseEther(sendAmount)
      const data = encodeFunctionData({
        abi: WRAPPED_ZKLTC_ABI,
        functionName: 'deposit',
      })

      const hash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [
          {
            from: walletAddress,
            to: WZKLTC_CONTRACT_ADDRESS,
            value: hexValue(value),
            data,
          },
        ],
      })

      setPanelMessage(`Transaction submitted: ${shortAddress(hash)}`)
      setSendAmount('')
    } catch (error) {
      const userRejected = error?.code === 4001
      setPanelMessage(userRejected ? 'Transaction signature was cancelled.' : 'Minting failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="wzkltc-modal-backdrop" onClick={onClose}>
      <section
        className="wzkltc-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="wzkltc-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="wzkltc-modal-top">
          <div className="wzkltc-mode-pill">
            <span className="wzkltc-mode-icon">
              <BridgeGlyph />
            </span>
            <div>
              <p>Bridge</p>
              <h2 id="wzkltc-modal-title">Get WZKLTC</h2>
            </div>
          </div>
          <button type="button" className="wzkltc-toolbar-button wzkltc-close-button" aria-label="Close modal" onClick={onClose}>
            <CloseGlyph />
          </button>
        </header>

        {!walletConnected ? (
          <div className="wzkltc-connect-card">
            <div className="wzkltc-connect-copy">
              <span>Wallet needed</span>
              <h3>Connect wallet to get WZKLTC</h3>
              <p>Wrap zkLTC directly from your connected balance.</p>
            </div>
            <button type="button" className="wzkltc-connect-button" onClick={onConnectWallet} disabled={isConnecting}>
              {connectLabel}
            </button>
          </div>
        ) : null}

        {walletConnected ? (
          <>
            <div className="wzkltc-settings-panel">
              <div>
                <span>Connected wallet</span>
                <strong>{shortAddress(walletAddress)}</strong>
              </div>
              <div>
                <span>Connected chain</span>
                <strong>{activeChainId ? `Chain ${activeChainId}` : 'Wallet syncing'}</strong>
              </div>
              <div>
                <span>Target contract</span>
                <strong>{contractConfigured ? shortAddress(WZKLTC_CONTRACT_ADDRESS) : 'Available soon'}</strong>
              </div>
            </div>

            <div className="wzkltc-flow-card">
              <div className="wzkltc-section-head">
                <span>Send</span>
                <small>Contract-first route</small>
              </div>
              <div className="wzkltc-input-row">
                <label className="wzkltc-amount-field">
                  <span className="sr-only">Amount of zkLTC to send</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    value={sendAmount}
                    onChange={(event) => {
                      const nextValue = event.target.value.replace(/[^0-9.]/g, '')
                      setSendAmount(nextValue)
                      setPanelMessage('')
                    }}
                  />
                </label>
                <NetworkBadge tone="source" symbol="ZK" label="zkLTC" sublabel={SOURCE_CHAIN_NAME} />
              </div>

              <div className="wzkltc-helper-row">
                <div className="wzkltc-presets">
                  <button type="button" onClick={() => handlePresetFill(0.25)}>
                    25%
                  </button>
                  <button type="button" onClick={() => handlePresetFill(0.5)}>
                    50%
                  </button>
                  <button type="button" onClick={() => handlePresetFill(0.75)}>
                    75%
                  </button>
                  <button type="button" onClick={() => handlePresetFill(1)}>
                    {sourceTokenConfigured ? 'Max' : 'Max - Gas'}
                  </button>
                </div>
                <button type="button" className="wzkltc-balance-pill" onClick={() => handlePresetFill(1)}>
                  Wallet {formatTokenAmount(walletBalance)}
                </button>
              </div>
            </div>

            <div className="wzkltc-route-row" aria-hidden="true">
              <span className="wzkltc-route-label">Wallet</span>
              <span className="wzkltc-route-center">
                <RouteGlyph />
              </span>
              <span className="wzkltc-route-label">{CONTRACT_LABEL}</span>
            </div>

            <div className="wzkltc-flow-card">
              <div className="wzkltc-section-head">
                <span>Receive</span>
                <small>1:1 mint</small>
              </div>
              <div className="wzkltc-receive-row">
              <div className="wzkltc-receive-copy">
                <strong>{formatTokenAmount(normalizedAmount || 0, 6)}</strong>
                <span>WZKLTC</span>
                <small>
                  {sourceTokenConfigured
                    ? 'Minted to your connected wallet.'
                    : gasReserve > 0
                      ? `Minted to your connected wallet. Max leaves about ${formatTokenAmount(gasReserve, 6)} zkLTC for gas.`
                      : 'Minted to your connected wallet.'}
                </small>
              </div>
              <NetworkBadge tone="destination" symbol="WZ" label="WZKLTC" sublabel={DESTINATION_CHAIN_NAME} />
            </div>
            <div className="wzkltc-rate-row">
              <span>{contractConfigured ? shortAddress(WZKLTC_CONTRACT_ADDRESS) : 'Deployment details available soon'}</span>
              <strong>1 zkLTC = 1 WZKLTC</strong>
            </div>
          </div>
          </>
        ) : null}

        {panelMessage ? (
          <p className={`wzkltc-panel-message ${panelMessage.includes('submitted') ? 'is-success' : 'is-warning'}`}>
            {panelMessage}
          </p>
        ) : null}

        {walletConnected ? (
          <button
            type="button"
            className="wzkltc-submit"
            onClick={handleMint}
            disabled={isConnecting || isSubmitting}
          >
            {actionLabel}
          </button>
        ) : null}
      </section>
    </div>
  )
}
