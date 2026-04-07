import { useMemo, useState } from 'react'
import './App.css'

const NAV_ITEMS = ['Discover', 'Earn', 'Bridge', 'Vaults', 'Activity']
const HERO_METRICS = [
  { value: '$233.5M', label: 'Protocol TVL routed through native rails' },
  { value: '4.8%', label: 'Average blended vault yield' },
  { value: '3 min', label: 'Bridge finality target into LitVM' },
]

const FLOW_STEPS = [
  {
    step: '01',
    title: 'Bridge LTC-side collateral in',
    text: 'Move zkLTC or stable liquidity into LitVM without leaving the product surface.',
  },
  {
    step: '02',
    title: 'Mint or route into yield',
    text: 'Use the same dashboard to move bridged capital into Ayni vaults and liquidity lanes.',
  },
  {
    step: '03',
    title: 'Track balances and activity',
    text: 'Portfolio, bridge status, vault performance, and recent actions live in one control room.',
  },
]

const PROMO_CARDS = [
  {
    eyebrow: 'Native Bridge',
    title: 'Bridge directly into the app',
    body: 'No separate bridge page. Users move funds in the same dashboard they use to deposit and manage positions.',
    action: 'Open bridge',
  },
  {
    eyebrow: 'Solver Yield',
    title: 'Routes stay productive after arrival',
    body: 'Once assets land, the dashboard immediately shows best-fit vaults and current blended yield options.',
    action: 'Explore earn',
  },
]

const VAULT_ROWS = [
  {
    vault: 'Gauntlet USDT',
    curator: 'Gauntlet',
    tvl: '$95.72M',
    apy: '0.42%',
    exposure: 'BTC / ETH / LTC',
    badge: 'Partner Boost',
  },
  {
    vault: 'Steakhouse Prime USDC',
    curator: 'Steakhouse',
    tvl: '$68.24M',
    apy: '0.49%',
    exposure: 'BTC / ETH / stables',
    badge: 'Conservative',
  },
  {
    vault: 'USDC Router Vault',
    curator: 'Yearn',
    tvl: '$31.79M',
    apy: '4.52%',
    exposure: 'USDC / bridge inventory',
    badge: 'High Flow',
  },
  {
    vault: 'zkLTC Liquidity Vault',
    curator: 'Ayni',
    tvl: '$23.88M',
    apy: '7.14%',
    exposure: 'zkLTC / solver routing',
    badge: 'New',
  },
]

const ACTIVITY_ITEMS = [
  {
    label: 'Bridge initiated',
    meta: 'Litecoin -> LitVM',
    value: '12.50 zkLTC',
    status: 'Finalizing',
  },
  {
    label: 'Vault deposit',
    meta: 'Ayni USDC Router',
    value: '8,200 USDC',
    status: 'Confirmed',
  },
  {
    label: 'Yield claimed',
    meta: 'zkLTC Liquidity Vault',
    value: '184.22 USDC',
    status: 'Ready',
  },
]

const BRIDGE_QUOTES = {
  zkLTC: { rate: 0.994, eta: '2-4 min', fee: '$1.80' },
  USDC: { rate: 0.998, eta: '1-2 min', fee: '$0.90' },
  LTC: { rate: 0.991, eta: '4-6 min', fee: '$2.10' },
}

function App() {
  const [activeNav, setActiveNav] = useState('Earn')
  const [portfolioView, setPortfolioView] = useState('Earn')
  const [bridgeAsset, setBridgeAsset] = useState('zkLTC')
  const [bridgeAmount, setBridgeAmount] = useState('12.50')

  const bridgeQuote = useMemo(() => {
    const numericAmount = Number(bridgeAmount) || 0
    const selected = BRIDGE_QUOTES[bridgeAsset]
    const receiveAmount = numericAmount * selected.rate

    return {
      fee: selected.fee,
      eta: selected.eta,
      receiveAmount,
    }
  }, [bridgeAmount, bridgeAsset])

  function scrollToDashboard(event) {
    event.preventDefault()
    const dashboard = document.getElementById('dashboard')
    dashboard?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setActiveNav('Bridge')
  }

  return (
    <div className="app-shell">
      <div className="app-backdrop" aria-hidden />

      <header className="topbar">
        <a className="brand" href="#home">
          <span className="brand-mark">A</span>
          <span>Ayni</span>
        </a>

        <nav className="topbar-nav" aria-label="Primary">
          {NAV_ITEMS.map((item) => (
            <button
              key={item}
              className={item === activeNav ? 'nav-pill is-active' : 'nav-pill'}
              type="button"
              onClick={() => setActiveNav(item)}
            >
              {item}
            </button>
          ))}
        </nav>

        <div className="topbar-actions">
          <a className="button button-primary" href="#dashboard" onClick={scrollToDashboard}>
            Open App
          </a>
          <button className="button button-secondary" type="button">
            Connect Wallet
          </button>
        </div>
      </header>

      <main className="page-content">
        <section className="hero-panel" id="home">
          <div className="hero-copy">
            <p className="section-kicker">Unified Bridge + Earn Dashboard</p>
            <h1>Move in, deploy capital, and manage yield from one Ayni control room.</h1>
            <p className="hero-text">
              The landing experience now opens directly into a product dashboard inspired by modern DeFi terminals,
              but styled with the same Ayni lavender-night palette already established on the site.
            </p>

            <div className="hero-actions">
              <a className="button button-primary" href="#dashboard" onClick={scrollToDashboard}>
                Open App
              </a>
              <a className="button button-ghost" href="#dashboard" onClick={scrollToDashboard}>
                Jump to Bridge
              </a>
            </div>

            <div className="metric-grid">
              {HERO_METRICS.map((metric) => (
                <article key={metric.label} className="metric-card">
                  <strong>{metric.value}</strong>
                  <span>{metric.label}</span>
                </article>
              ))}
            </div>
          </div>

          <aside className="hero-side">
            <div className="glass-card spotlight-card">
              <div className="card-head">
                <span className="mini-label">Bridge Status</span>
                <span className="status-dot">Live</span>
              </div>
              <h2>Swap + bridge flows now live inside the app shell.</h2>
              <p>
                Users can route funds from Litecoin-side liquidity into LitVM and immediately see next actions for
                vault deployment.
              </p>
              <div className="route-preview">
                <div>
                  <span>From</span>
                  <strong>Litecoin</strong>
                </div>
                <span className="route-arrow">-></span>
                <div>
                  <span>To</span>
                  <strong>LitVM</strong>
                </div>
              </div>
            </div>

            <div className="flow-grid">
              {FLOW_STEPS.map((item) => (
                <article key={item.step} className="glass-card step-card">
                  <span>{item.step}</span>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </article>
              ))}
            </div>
          </aside>
        </section>

        <section className="promo-grid">
          {PROMO_CARDS.map((card) => (
            <article key={card.title} className="promo-card">
              <div>
                <p>{card.eyebrow}</p>
                <h3>{card.title}</h3>
                <span>{card.body}</span>
              </div>
              <a href="#dashboard" onClick={scrollToDashboard}>
                {card.action}
              </a>
            </article>
          ))}
        </section>

        <section className="dashboard-shell" id="dashboard">
          <div className="dashboard-header">
            <div>
              <p className="section-kicker">Dashboard</p>
              <h2>Bridge, earn, and monitor activity without leaving the page.</h2>
            </div>

            <div className="dashboard-header-actions">
              <button className="button button-primary" type="button">
                Swap + Bridge
              </button>
              <button className="button button-secondary" type="button">
                View Positions
              </button>
            </div>
          </div>

          <div className="dashboard-grid">
            <article className="panel balance-panel">
              <div className="panel-head">
                <span className="mini-label">Earning Balance</span>
                <div className="tvl-chip">
                  <span>TVL</span>
                  <strong>$233.53M</strong>
                </div>
              </div>

              <div className="balance-row">
                <div>
                  <strong className="balance-total">$24,820</strong>
                  <p>Across bridge inventory, yield vaults, and pending rewards.</p>
                </div>
                <div className="yield-chip">
                  <span>Est. blended APY</span>
                  <strong>5.12%</strong>
                </div>
              </div>

              <div className="balance-actions">
                <div className="info-pill">
                  <span>Unclaimed rewards</span>
                  <strong>$312.40</strong>
                </div>
                <div className="info-pill">
                  <span>Idle assets</span>
                  <strong>$3,140</strong>
                </div>
                <button className="button button-primary" type="button">
                  Claim + Route
                </button>
              </div>
            </article>

            <article className="panel bridge-panel">
              <div className="panel-head">
                <span className="mini-label">Bridge In App</span>
                <span className="live-chip">Route protected</span>
              </div>

              <div className="bridge-grid">
                <label className="field">
                  <span>From</span>
                  <button className="select-shell" type="button">
                    Litecoin
                  </button>
                </label>
                <label className="field">
                  <span>To</span>
                  <button className="select-shell" type="button">
                    LitVM
                  </button>
                </label>
                <label className="field field-wide">
                  <span>Asset</span>
                  <div className="segmented-control">
                    {Object.keys(BRIDGE_QUOTES).map((asset) => (
                      <button
                        key={asset}
                        className={bridgeAsset === asset ? 'segment is-active' : 'segment'}
                        type="button"
                        onClick={() => setBridgeAsset(asset)}
                      >
                        {asset}
                      </button>
                    ))}
                  </div>
                </label>
                <label className="field field-wide">
                  <span>Amount</span>
                  <input
                    className="amount-input"
                    inputMode="decimal"
                    value={bridgeAmount}
                    onChange={(event) => setBridgeAmount(event.target.value)}
                  />
                </label>
              </div>

              <div className="quote-card">
                <div>
                  <span>You receive</span>
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
                  <span>Network fee</span>
                  <strong>{bridgeQuote.fee}</strong>
                </div>
              </div>

              <button className="button button-primary button-block" type="button">
                Bridge into Dashboard
              </button>
            </article>

            <article className="panel promo-banner">
              <div>
                <p className="mini-label">Deposits become actionable</p>
                <h3>Bridge first, then route to the best live opportunity.</h3>
              </div>
              <button className="button button-secondary" type="button">
                How it works
              </button>
            </article>

            <article className="panel positions-panel">
              <div className="panel-head">
                <div className="view-switch">
                  {['Earn', 'Positions'].map((view) => (
                    <button
                      key={view}
                      className={portfolioView === view ? 'segment is-active' : 'segment'}
                      type="button"
                      onClick={() => setPortfolioView(view)}
                    >
                      {view}
                    </button>
                  ))}
                </div>
                <span className="mini-label">Curated routes</span>
              </div>

              <div className="table-wrap">
                <table>
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
                    {VAULT_ROWS.map((row) => (
                      <tr key={row.vault}>
                        <td>
                          <div className="vault-cell">
                            <strong>{row.vault}</strong>
                            <span>{row.badge}</span>
                          </div>
                        </td>
                        <td>{row.tvl}</td>
                        <td className="apy-cell">{row.apy}</td>
                        <td>{row.exposure}</td>
                        <td>{row.curator}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="panel activity-panel">
              <div className="panel-head">
                <span className="mini-label">Recent Activity</span>
                <span className="mini-label">Synced</span>
              </div>
              <div className="activity-list">
                {ACTIVITY_ITEMS.map((item) => (
                  <div key={`${item.label}-${item.value}`} className="activity-item">
                    <div>
                      <strong>{item.label}</strong>
                      <span>{item.meta}</span>
                    </div>
                    <div>
                      <strong>{item.value}</strong>
                      <span>{item.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
