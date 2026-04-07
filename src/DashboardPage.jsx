import './DashboardPage.css'

const assetOptions = ['ETH', 'USDC', 'USDT']

const featureCards = [
  {
    icon: '✦',
    title: 'Deposit and earn yield on your assets',
    body: 'Bridge in and route capital straight into curated USDC strategies from the dashboard.',
    cta: 'How it works',
    accent: 'feature-card feature-card-primary',
  },
  {
    icon: '◫',
    title: 'Bridge is integrated directly into deposits',
    body: 'Enable bridge access, receive USDC, and continue directly into vault deposits without leaving this screen.',
    cta: 'Open bridge',
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
        <section className="dashboard-actions">
          <button type="button" className="dashboard-button dashboard-button-primary">
            Deposit + Bridge
          </button>
          <button type="button" className="dashboard-button dashboard-button-ghost">
            Connect wallet
          </button>
        </section>

        <section className="dashboard-hero-grid">
          <article className="dashboard-panel balance-panel">
            <div className="panel-head">
              <div>
                <p className="panel-label">Depositing balance</p>
                <h1 className="balance-amount">$0</h1>
              </div>

              <div className="floating-metric">
                <span>Earn TVL</span>
                <strong>$233.53M</strong>
              </div>
            </div>

            <div className="balance-graphic">
              <div className="balance-grid" />
              <div className="balance-curve" />
            </div>

            <div className="balance-footer">
              <div className="mini-stat with-icon">
                <div className="mini-icon">◎</div>
                <div>
                  <span>Unclaimed rewards</span>
                  <strong>$0</strong>
                </div>
              </div>
              <div className="mini-pill">$0 claimed</div>
              <button type="button" className="dashboard-button dashboard-button-ghost">
                Claim
              </button>
              <div className="mini-stat with-icon">
                <div className="mini-icon">◔</div>
                <div>
                  <span>Idle assets</span>
                  <strong>$0 0%</strong>
                </div>
              </div>
              <button type="button" className="dashboard-button dashboard-button-primary dashboard-button-soft">
                Earn
              </button>
            </div>
          </article>

          <article className="dashboard-panel bridge-panel">
            <div className="panel-head panel-head-compact">
              <div>
                <p className="panel-label">Bridge in dashboard</p>
                <h2 className="bridge-title">Move assets in without leaving this screen.</h2>
              </div>
              <span className="status-pill">Live route</span>
            </div>

            <div className="field-grid field-grid-double">
              <label className="field">
                <span>From</span>
                <button type="button" className="field-button">
                  Ethereum
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
                <strong>12.50</strong>
              </div>
            </label>

            <div className="quote-card">
              <div>
                <span>Receive</span>
                <strong>12.39 USDC</strong>
              </div>
              <div>
                <span>ETA</span>
                <strong>4-6 min</strong>
              </div>
              <div>
                <span>Fee</span>
                <strong>$2.10</strong>
              </div>
            </div>

            <button type="button" className="dashboard-button dashboard-button-primary dashboard-button-full">
              Enable bridge and deposit
            </button>
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
                Your Positions
              </button>
            </div>

            <div className="vault-controls">
              <span className="filter-pill">Deposit: All</span>
              <span className="filter-pill">Curator: All</span>
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
                  <span>0 {vault.asset}</span>
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
