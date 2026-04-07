import { useEffect, useMemo, useState } from 'react'
import './App.css'

const DASHBOARD_NAV = ['Discover', 'Earn', 'Stake', 'Quests', 'Perps']
const DASHBOARD_TABS = ['Earn', 'Your Positions']
const BRIDGE_ASSETS = ['zkLTC', 'USDC', 'LTC']

const BRIDGE_QUOTES = {
  zkLTC: { receiveRate: 0.9935, fee: '$1.80', eta: '2-4 min' },
  USDC: { receiveRate: 0.9982, fee: '$0.74', eta: '1-2 min' },
  LTC: { receiveRate: 0.9908, fee: '$2.10', eta: '4-6 min' },
}

const VAULT_ROWS = [
  {
    name: 'Gauntlet USDT',
    tag: 'Partner Boost',
    deposits: '$95.72M',
    token: '0 USDT',
    apy: '0.42%',
    exposure: 'BTC / ETH',
    curator: 'Gauntlet',
  },
  {
    name: 'Steakhouse Prime USDC',
    tag: 'Conservative',
    deposits: '$68.24M',
    token: '0 USDC',
    apy: '0.49%',
    exposure: 'BTC / ETH / LTC',
    curator: 'Steakhouse Financial',
  },
  {
    name: 'USDC Vault',
    tag: 'Core Yield',
    deposits: '$31.79M',
    token: '0 USDC',
    apy: '4.52%',
    exposure: 'USDC',
    curator: 'Yearn',
  },
  {
    name: 'WETH Vault',
    tag: 'Active',
    deposits: '$23.88M',
    token: '0 WETH',
    apy: '7.60%',
    exposure: 'ETH / LTC',
    curator: 'Ayni',
  },
]

function App() {
  const [pathname, setPathname] = useState(window.location.pathname)

  useEffect(() => {
    function handlePopState() {
      setPathname(window.location.pathname)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  function navigate(path) {
    if (window.location.pathname === path) return
    window.history.pushState({}, '', path)
    setPathname(path)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (pathname === '/dashboard') {
    return <DashboardPage onNavigate={navigate} />
  }

  return <HomePage onNavigate={navigate} />
}

function HomePage({ onNavigate }) {
  return (
    <div className="site-shell">
      <div className="site-glow" aria-hidden />

      <header className="site-topbar">
        <a className="site-brand" href="/">
          <span className="site-brand-mark">A</span>
          <span>Ayni</span>
        </a>

        <div className="site-topbar-actions">
          <button className="site-button site-button-primary" type="button" onClick={() => onNavigate('/dashboard')}>
            Open App
          </button>
        </div>
      </header>

      <main className="site-home">
        <section className="home-hero">
          <p className="home-kicker">Ayni Protocol</p>
          <h1>New dashboard page with bridge, earn, and positions in one screen.</h1>
          <p className="home-copy">
            The new dashboard follows the provided reference more literally and keeps the project&apos;s existing
            midnight-lavender visual language.
          </p>
          <div className="home-actions">
            <button className="site-button site-button-primary" type="button" onClick={() => onNavigate('/dashboard')}>
              Go to Dashboard
            </button>
            <button className="site-button site-button-secondary" type="button" onClick={() => onNavigate('/dashboard')}>
              Preview App Layout
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}

function DashboardPage({ onNavigate }) {
  const [activeTab, setActiveTab] = useState('Earn')
  const [bridgeAsset, setBridgeAsset] = useState('zkLTC')
  const [bridgeAmount, setBridgeAmount] = useState('12.50')

  const bridgeQuote = useMemo(() => {
    const amount = Number(bridgeAmount) || 0
    const quote = BRIDGE_QUOTES[bridgeAsset]
    return {
      eta: quote.eta,
      fee: quote.fee,
      receiveAmount: amount * quote.receiveRate,
    }
  }, [bridgeAsset, bridgeAmount])

  return (
    <div className="dashboard-page">
      <div className="dashboard-noise" aria-hidden />

      <header className="dashboard-topbar">
        <button className="dashboard-logo" type="button" onClick={() => onNavigate('/')}>
          <span className="dashboard-logo-mark">A</span>
          <span className="dashboard-logo-text">Ayni</span>
        </button>

        <nav className="dashboard-nav" aria-label="Primary">
          {DASHBOARD_NAV.map((item) => (
            <button key={item} className={item === 'Earn' ? 'nav-chip is-active' : 'nav-chip'} type="button">
              {item}
              {item === 'Perps' && <span className="nav-chip-badge">New</span>}
            </button>
          ))}
        </nav>

        <div className="dashboard-topbar-actions">
          <button className="dashboard-cta dashboard-cta-primary" type="button">
            Swap + Bridge
          </button>
          <button className="dashboard-cta dashboard-cta-secondary" type="button">
            Connect Wallet
          </button>
        </div>
      </header>

      <main className="dashboard-layout">
        <section className="dashboard-grid">
          <article className="dashboard-card earnings-card">
            <div className="earnings-main">
              <div className="section-intro">
                <span className="section-label">Earning Balance</span>
                <h1>$0</h1>
              </div>

              <div className="earnings-tvl">
                <span className="section-label">Earning TVL</span>
                <strong>$233.53M</strong>
              </div>
            </div>

            <div className="earnings-footer">
              <div className="status-block">
                <span className="status-icon">◎</span>
                <div>
                  <span className="section-label">Unclaimed Rewards</span>
                  <strong>$0</strong>
                </div>
              </div>

              <div className="claim-group">
                <span className="muted-chip">$0 Claimed</span>
                <button className="dashboard-pill" type="button">
                  Claim
                </button>
              </div>

              <div className="status-block">
                <span className="status-icon">◔</span>
                <div>
                  <span className="section-label">Idle Assets</span>
                  <strong>
                    $0 <span className="muted-value">0%</span>
                  </strong>
                </div>
              </div>

              <button className="dashboard-pill dashboard-pill-primary" type="button">
                Earn
              </button>
            </div>
          </article>

          <article className="dashboard-card bridge-card">
            <div className="bridge-card-head">
              <div>
                <span className="section-label">Bridge In Dashboard</span>
                <h2>Move assets in without leaving this screen.</h2>
              </div>
              <span className="bridge-live-pill">Live route</span>
            </div>

            <div className="bridge-form">
              <label className="bridge-field">
                <span>From</span>
                <button className="bridge-select" type="button">
                  Litecoin
                </button>
              </label>

              <label className="bridge-field">
                <span>To</span>
                <button className="bridge-select" type="button">
                  LitVM
                </button>
              </label>

              <label className="bridge-field bridge-field-wide">
                <span>Asset</span>
                <div className="bridge-asset-row">
                  {BRIDGE_ASSETS.map((asset) => (
                    <button
                      key={asset}
                      className={asset === bridgeAsset ? 'bridge-asset-chip is-active' : 'bridge-asset-chip'}
                      type="button"
                      onClick={() => setBridgeAsset(asset)}
                    >
                      {asset}
                    </button>
                  ))}
                </div>
              </label>

              <label className="bridge-field bridge-field-wide">
                <span>Amount</span>
                <input
                  className="bridge-input"
                  inputMode="decimal"
                  value={bridgeAmount}
                  onChange={(event) => setBridgeAmount(event.target.value)}
                />
              </label>
            </div>

            <div className="bridge-quote">
              <div>
                <span>Receive</span>
                <strong>
                  {bridgeQuote.receiveAmount.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{' '}
                  {bridgeAsset}
                </strong>
              </div>
              <div>
                <span>ETA</span>
                <strong>{bridgeQuote.eta}</strong>
              </div>
              <div>
                <span>Fee</span>
                <strong>{bridgeQuote.fee}</strong>
              </div>
            </div>

            <button className="dashboard-cta dashboard-cta-primary bridge-submit" type="button">
              Bridge Into Ayni
            </button>
          </article>

          <article className="dashboard-banner dashboard-banner-primary">
            <div className="banner-icon">✦</div>
            <div>
              <h3>Deposit and earn yield on your assets</h3>
              <p>Bridge in and route capital straight into curated earning strategies.</p>
            </div>
            <button className="dashboard-banner-button" type="button">
              How it works
            </button>
          </article>

          <article className="dashboard-banner dashboard-banner-secondary">
            <div className="banner-icon">▣</div>
            <div>
              <h3>Bridge is integrated directly into Earn</h3>
              <p>Users no longer need a separate flow before reaching deposits and positions.</p>
            </div>
            <button className="dashboard-cta dashboard-cta-primary" type="button">
              Open Bridge
            </button>
          </article>

          <article className="dashboard-card table-card">
            <div className="table-header">
              <div className="table-tabs">
                {DASHBOARD_TABS.map((tab) => (
                  <button
                    key={tab}
                    className={tab === activeTab ? 'table-tab is-active' : 'table-tab'}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="table-actions">
                <button className="table-icon-button" type="button">
                  ≡
                </button>
                <button className="table-icon-button" type="button">
                  ◫
                </button>
              </div>
            </div>

            <div className="table-filters">
              <div className="filter-chip">
                <span>Deposit:</span>
                <strong>All</strong>
              </div>
              <div className="filter-chip">
                <span>Curator:</span>
                <strong>All</strong>
              </div>
            </div>

            <div className="vault-table-wrap">
              <table className="vault-table">
                <thead>
                  <tr>
                    <th>Vault</th>
                    <th>Total Deposits</th>
                    <th>APY</th>
                    <th>Exposure</th>
                    <th>Curator</th>
                  </tr>
                </thead>
                <tbody>
                  {VAULT_ROWS.map((vault) => (
                    <tr key={vault.name}>
                      <td>
                        <div className="vault-name-cell">
                          <div className="vault-coin" />
                          <div>
                            <strong>{vault.name}</strong>
                            <div className="vault-subline">
                              <span className="vault-tag">{vault.tag}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <strong>{vault.deposits}</strong>
                        <span>{vault.token}</span>
                      </td>
                      <td className="apy-value">{vault.apy}</td>
                      <td>{vault.exposure}</td>
                      <td>{vault.curator}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      </main>
    </div>
  )
}

export default App
