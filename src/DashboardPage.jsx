import { useState } from 'react'
import './DashboardPage.css'

const LITEFORGE_CHAIN = {
  chainId: '0x1159',
  chainName: 'LiteForge',
  nativeCurrency: {
    name: 'zkLTC',
    symbol: 'zkLTC',
    decimals: 18,
  },
  rpcUrls: ['https://liteforge.rpc.caldera.xyz/http'],
}

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
    title: 'Caldera bridge access is enabled here',
    body: 'Use Metalayer through Caldera: embed the widget for a fast launch or wire the SDK when you want a custom route UI.',
    cta: 'Open Caldera bridge',
    tone: 'promo-card promo-card-violet',
  },
]

function DashboardPage() {
  const [isBridgeOpen, setIsBridgeOpen] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [walletStatus, setWalletStatus] = useState('')

  async function handleConnectWallet() {
    if (typeof window === 'undefined' || !window.ethereum?.request) {
      setWalletStatus('No compatible wallet was detected.')
      return
    }

    setIsConnecting(true)
    setWalletStatus('')

    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' })

      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: LITEFORGE_CHAIN.chainId }],
        })
      } catch (switchError) {
        const missingChain =
          switchError?.code === 4902 ||
          /unrecognized chain|unknown chain|not added/i.test(String(switchError?.message || ''))

        if (!missingChain) throw switchError

        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [LITEFORGE_CHAIN],
        })

        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: LITEFORGE_CHAIN.chainId }],
        })
      }

      setWalletStatus('Wallet connected to LiteForge.')
      setIsBridgeOpen(false)
    } catch (error) {
      const rejected = error?.code === 4001
      setWalletStatus(rejected ? 'Wallet connection was cancelled.' : 'Unable to connect wallet to LiteForge.')
    } finally {
      setIsConnecting(false)
    }
  }

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
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
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
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
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
                <span className="express-pill">Caldera</span>
              </div>

              <div className="bridge-modal-actions">
                <button type="button" className="icon-pill" aria-label="Settings">
                  ⚙
                </button>
                <button type="button" className="icon-pill" aria-label="Close" onClick={() => setIsBridgeOpen(false)}>
                  ✕
                </button>
              </div>
            </div>

            <div className="swap-box from-box">
              <span className="swap-label">From</span>
              <div className="swap-amount-row">
                <strong>0</strong>
                <div className="token-pill">
                  <span className="token-badge">$</span>
                  <span>USDC</span>
                </div>
              </div>
              <div className="swap-foot-row">
                <span>$0</span>
                <span>
                  0 USDC <button type="button">MAX</button>
                </span>
              </div>
            </div>

            <div className="bridge-swap-icon">⬍</div>

            <div className="swap-box to-box">
              <span className="swap-label">To</span>
              <div className="swap-amount-row">
                <strong>0</strong>
                <div className="token-pill token-pill-destination">
                  <span className="token-badge">$</span>
                  <span>USDC</span>
                </div>
              </div>
              <div className="swap-foot-row">
                <span>$0</span>
                <span>0 USDC</span>
              </div>
            </div>

            <button
              type="button"
              className="dashboard-button dashboard-button-blue bridge-connect-button"
              onClick={handleConnectWallet}
              disabled={isConnecting}
            >
              {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </button>

            <div className="bridge-dev-card">
              <div className="bridge-dev-copy">
                <span className="bridge-dev-chip">Developer Mode</span>
                <strong>Official Caldera integration path</strong>
                <p>Use the Metalayer widget for a drop-in bridge, or use `@metalayer/sdk` for quote, execute, and order tracking in a custom flow.</p>
              </div>
              <div className="bridge-dev-tags" aria-label="Integration options">
                <span>@metalayer/widget</span>
                <span>@metalayer/sdk</span>
                <span>Route API</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default DashboardPage
