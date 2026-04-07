import './DashboardPage.css'

const networkOptions = ['Ethereum', 'Base', 'Arbitrum']
const assetOptions = ['ETH', 'USDC', 'USDT']

const featureCards = [
  {
    icon: 'A',
    title: 'Deposit and earn on your USDC',
    body: 'Bridge in once, route capital into curated USDC vaults, and keep deposits live from the same dashboard.',
    cta: 'How it works',
    accent: 'feature-card feature-card-primary',
  },
  {
    icon: 'B',
    title: 'Bridge is enabled before you deposit',
    body: 'Users can turn on bridge access, receive USDC, and continue directly into the deposit flow without switching screens.',
    cta: 'Enable bridge',
    accent: 'feature-card feature-card-secondary',
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
  {
    name: 'Instant Access Pool',
    tag: 'Fast Exit',
    deposits: '$12.4M',
    asset: 'USDC',
    apy: '3.94%',
    exposure: 'USDC',
    curator: 'Ayni',
  },
]

function DashboardPage() {
  return (
    <main className="dashboard-page">
      <div className="dashboard-shell">
        <section className="dashboard-topbar">
          <div>
            <p className="dashboard-eyebrow">Earn Dashboard</p>
            <h1>Deposit, get USDC, and enable bridge access in one flow.</h1>
          </div>

          <div className="topbar-actions">
            <button type="button" className="dashboard-button dashboard-button-ghost">
              View vaults
            </button>
            <button type="button" className="dashboard-button dashboard-button-primary">
              Connect wallet
            </button>
          </div>
        </section>

        <section className="hero-grid">
          <article className="dashboard-panel balance-panel">
            <div className="panel-head">
              <div>
                <p className="panel-label">Deposit balance</p>
                <h2>$18,420</h2>
              </div>

              <div className="floating-metric">
                <span>USDC ready</span>
                <strong>12,580</strong>
              </div>
            </div>

            <div className="balance-graphic">
              <div className="balance-curve" />
              <div className="balance-grid" />
            </div>

            <div className="balance-footer">
              <div className="mini-stat">
                <span>Bridge status</span>
                <strong>Ready</strong>
              </div>
              <div className="mini-stat">
                <span>Pending deposit</span>
                <strong>4,000 USDC</strong>
              </div>
              <div className="mini-stat">
                <span>Est. APY</span>
                <strong>5.94%</strong>
              </div>
            </div>
          </article>

          <article className="dashboard-panel bridge-panel">
            <div className="panel-head panel-head-compact">
              <div>
                <p className="panel-label">Bridge in dashboard</p>
                <h3>Move funds into USDC, then deposit immediately.</h3>
              </div>

              <span className="status-pill">Live route</span>
            </div>

            <div className="field-grid field-grid-double">
              <label className="field">
                <span>From</span>
                <button type="button" className="field-button">
                  {networkOptions[0]}
                </button>
              </label>

              <label className="field">
                <span>To</span>
                <button type="button" className="field-button">
                  LitVM
                </button>
              </label>
            </div>

            <div className="field">
              <span>Asset</span>
              <div className="segmented-control">
                {assetOptions.map((asset) => (
                  <button
                    key={asset}
                    type="button"
                    className={asset === 'USDC' ? 'segment is-active' : 'segment'}
                  >
                    {asset}
                  </button>
                ))}
              </div>
            </div>

            <label className="field">
              <span>Amount</span>
              <div className="amount-input">
                <strong>12,500</strong>
                <small>USDC</small>
              </div>
            </label>

            <div className="quote-card">
              <div>
                <span>Receive</span>
                <strong>12,462 USDC</strong>
              </div>
              <div>
                <span>ETA</span>
                <strong>3-5 min</strong>
              </div>
              <div>
                <span>Bridge fee</span>
                <strong>$38</strong>
              </div>
            </div>

            <div className="bridge-actions">
              <button type="button" className="dashboard-button dashboard-button-secondary">
                Enable bridge
              </button>
              <button type="button" className="dashboard-button dashboard-button-primary dashboard-button-wide">
                Deposit USDC
              </button>
            </div>
          </article>
        </section>

        <section className="feature-stack">
          {featureCards.map((card) => (
            <article key={card.title} className={card.accent}>
              <div className="feature-copy">
                <div className="feature-icon">{card.icon}</div>
                <div>
                  <h3>{card.title}</h3>
                  <p>{card.body}</p>
                </div>
              </div>

              <button type="button" className="feature-link">
                {card.cta}
              </button>
            </article>
          ))}
        </section>

        <section className="dashboard-panel vault-panel">
          <div className="vault-header">
            <div className="vault-tabs">
              <button type="button" className="vault-tab is-active">
                Earn
              </button>
              <button type="button" className="vault-tab">
                Your positions
              </button>
            </div>

            <div className="vault-filters">
              <span className="filter-pill">Deposit: USDC</span>
              <span className="filter-pill">Bridge: Enabled</span>
            </div>
          </div>

          <div className="vault-table">
            <div className="vault-table-head">
              <span>Vault</span>
              <span>Total deposits</span>
              <span>APY</span>
              <span>Exposure</span>
              <span>Curator</span>
            </div>

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
                  <span>{vault.asset}</span>
                </div>
                <div className="vault-cell vault-apy">{vault.apy}</div>
                <div className="vault-cell">{vault.exposure}</div>
                <div className="vault-cell">{vault.curator}</div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}

export default DashboardPage
