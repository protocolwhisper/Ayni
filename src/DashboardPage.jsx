import { useEffect, useState } from 'react'
import './DashboardPage.css'

const BRIDGE_URL = 'https://liteforge.hub.caldera.xyz/'

const SUPPLY_ASSETS = [
  { symbol: 'USDC', name: 'USD Coin', wallet: '1,240.42', apy: '6.12%', collateral: true },
  { symbol: 'USDT', name: 'Tether', wallet: '533.11', apy: '4.88%', collateral: true },
]

const BORROW_ASSETS = [
  { symbol: 'GHO', name: 'GHO Stablecoin', available: '0', apy: '3.05%' },
  { symbol: 'ETH', name: 'Ether', available: '0', apy: '2.35%' },
]

const USER_POSITIONS = []

function parseAmount(value) {
  const n = Number.parseFloat(String(value).replace(/,/g, ''))
  return Number.isFinite(n) ? n : 0
}

function shortAddress(address) {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export default function DashboardPage() {
  const [isConnecting, setIsConnecting] = useState(false)
  const [walletStatus, setWalletStatus] = useState('')
  const [walletAddress, setWalletAddress] = useState('')

  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) return undefined

    const initialWallet = window.ethereum.selectedAddress ?? ''
    setWalletAddress(initialWallet)
    setWalletStatus(initialWallet ? `Connected ${shortAddress(initialWallet)}` : '')

    function handleAccountsChanged(accounts) {
      const nextWallet = accounts?.[0] ?? ''
      setWalletAddress(nextWallet)
      setWalletStatus(nextWallet ? `Connected ${shortAddress(nextWallet)}` : 'Wallet disconnected.')
    }

    window.ethereum.on?.('accountsChanged', handleAccountsChanged)
    return () => window.ethereum.removeListener?.('accountsChanged', handleAccountsChanged)
  }, [])

  async function handleConnectWallet() {
    if (typeof window === 'undefined' || !window.ethereum?.request) {
      setWalletStatus('No compatible wallet was detected.')
      return
    }

    setIsConnecting(true)
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
      const nextWallet = accounts?.[0] ?? ''
      setWalletAddress(nextWallet)
      setWalletStatus(nextWallet ? `Connected ${shortAddress(nextWallet)}` : 'Wallet connected.')
    } catch (error) {
      const rejected = error?.code === 4001
      setWalletStatus(rejected ? 'Wallet connection was cancelled.' : 'Unable to connect wallet.')
    } finally {
      setIsConnecting(false)
    }
  }

  const walletLabel = walletAddress ? shortAddress(walletAddress) : (isConnecting ? 'Connecting...' : 'Connect Wallet')
  const netWorth = USER_POSITIONS.reduce((sum, position) => sum + parseAmount(position.value), 0)
  const netWorthLabel = `$${netWorth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const healthFactorLabel = '--'
  const healthFactorStatus = 'No borrow yet'

  return (
    <main className="dashboard-page">
      <div className="dashboard-shell">
        <header className="dashboard-header">
          <a className="dashboard-back-link" href="/">
            Back to main page
          </a>
          <div className="dashboard-actions">
            <a className="dashboard-button dashboard-button-primary" href={BRIDGE_URL} target="_blank" rel="noreferrer">
              Get USDC
            </a>
            <button
              type="button"
              className="dashboard-button dashboard-button-ghost"
              onClick={handleConnectWallet}
              disabled={isConnecting}
            >
              {walletLabel}
            </button>
          </div>
        </header>

        {walletStatus ? <p className="wallet-status">{walletStatus}</p> : null}

        <section className="lending-grid">
          <article className="lending-card litvm-network-card">
            <header className="lending-card-head">
              <h2>LitVM Testnet</h2>
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
                  <span className="health-factor-fill" />
                </div>
                <p>{healthFactorStatus}</p>
              </div>
            </div>
          </article>

          <article className="lending-card">
            <header className="lending-card-head">
              <h2>Your supplies</h2>
            </header>
            <p className="lending-empty">Nothing supplied yet</p>
          </article>

          <article className="lending-card">
            <header className="lending-card-head">
              <h2>Your borrows</h2>
            </header>
            <p className="lending-empty">Nothing borrowed yet</p>
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
              <input type="checkbox" defaultChecked />
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
              {SUPPLY_ASSETS.map((asset) => (
                <div key={asset.symbol} className="asset-row">
                  <div className="asset-cell-main">
                    <span className="asset-orb">{asset.symbol.slice(0, 1)}</span>
                    <strong>{asset.symbol}</strong>
                  </div>
                  <span>{asset.wallet}</span>
                  <span>{asset.apy}</span>
                  <span>{asset.collateral ? '✓' : '—'}</span>
                  <button type="button" className="asset-action">
                    Supply
                  </button>
                </div>
              ))}
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

            <div className="borrow-notice">To borrow you need to supply any asset to be used as collateral.</div>

            <div className="asset-table">
              <div className="asset-row asset-row-head">
                <span>Asset</span>
                <span>Available</span>
                <span>APY, variable</span>
                <span className="asset-head-action" aria-hidden />
                <span className="asset-head-action" aria-hidden />
              </div>
              {BORROW_ASSETS.map((asset) => (
                <div key={asset.symbol} className="asset-row">
                  <div className="asset-cell-main">
                    <span className="asset-orb">{asset.symbol.slice(0, 1)}</span>
                    <strong>{asset.symbol}</strong>
                  </div>
                  <span>{asset.available}</span>
                  <span>{asset.apy}</span>
                  <button type="button" className="asset-action asset-action-muted">
                    Borrow
                  </button>
                  <button type="button" className="asset-action asset-action-muted">
                    Details
                  </button>
                </div>
              ))}
            </div>
          </article>

          <article className="dashboard-link-card">
            <div className="dashboard-link-card-copy">
              <div className="dashboard-link-card-mark" aria-hidden="true">
                <span>◈</span>
              </div>
              <div>
                <h2>Learn about Ayni Protocol</h2>
              </div>
            </div>
            <a className="dashboard-link-card-button" href={BRIDGE_URL} target="_blank" rel="noreferrer">
              <span className="dashboard-link-card-button-icon">?</span>
              How it works
            </a>
          </article>
        </section>
      </div>
    </main>
  )
}
