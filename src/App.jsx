import './App.css'

const STATS = [
  { value: 'Top 20 Asset', label: 'Litecoin market position' },
  { value: '60%', label: 'users needing stablecoin access without selling LTC' },
  { value: '100,000 USDC', label: 'successfully lock/minted on testnet' },
]

const MECHANISMS = [
  {
    title: 'Trustless Bridging',
    text: 'zkLTC holders on LitVM leverage assets without centralized intermediaries.',
    meta: 'zk-proof security model',
  },
  {
    title: 'Modular Accounting',
    text: 'A Core layer separated from Execution Adapters enables upgrades without liquidity migration.',
    meta: 'Future-proof architecture',
  },
  {
    title: 'Native Liquidity',
    text: 'Circle CCTP delivers Bridged Standard USDC and avoids de-peg risks from wrapped synthetics.',
    meta: 'Real USDC, not LUSDC',
  },
  {
    title: 'Dual Settlement Verification',
    text: 'Collateral state is verifiable with Orbit State Proofs and visible settlement flows.',
    meta: 'Transparent verification',
  },
]

const MILESTONES = [
  'Testnet deployment with successful 100,000 USDC lock/mint against zkLTC.',
  'Full Orbit State Proof implementation for oracle verification.',
  'Recognition as a DeFi infrastructure primitive within the LitVM ecosystem.',
]

const STAKEHOLDERS = [
  'Lead: Ayni Core Team',
  'Strategic Partner: LitVM (Infrastructure)',
  'Primary Users: Litecoin holders',
  'Market Makers: Solvers and LPs providing USDC liquidity',
]

const LTC_COINS = [
  { x: 5, y: 8, size: 32, duration: 20, delay: 0, drift: 28 },
  { x: 18, y: 22, size: 24, duration: 16, delay: -3, drift: -22 },
  { x: 88, y: 12, size: 36, duration: 22, delay: -5, drift: 30 },
  { x: 12, y: 45, size: 28, duration: 18, delay: -7, drift: -18 },
  { x: 75, y: 38, size: 40, duration: 24, delay: -2, drift: 26 },
  { x: 42, y: 55, size: 26, duration: 17, delay: -9, drift: -24 },
  { x: 92, y: 62, size: 30, duration: 19, delay: -4, drift: 32 },
  { x: 8, y: 78, size: 34, duration: 21, delay: -6, drift: -20 },
  { x: 55, y: 85, size: 38, duration: 23, delay: -1, drift: 28 },
  { x: 28, y: 95, size: 22, duration: 15, delay: -8, drift: -16 },
  { x: 68, y: 15, size: 28, duration: 18, delay: -10, drift: 24 },
  { x: 35, y: 72, size: 32, duration: 20, delay: -5, drift: -26 },
]

function App() {
  return (
    <div className="sky">
      <div className="sky-noise" aria-hidden />
      <div className="sky-ltc-orbit" aria-hidden>
        {LTC_COINS.map((coin, index) => (
          <span
            key={`${coin.x}-${coin.y}-${index}`}
            className="sky-ltc-coin"
            style={{
              '--x': `${coin.x}%`,
              '--y': `${coin.y}%`,
              '--size': `${coin.size}px`,
              '--duration': `${coin.duration}s`,
              '--delay': `${coin.delay}s`,
              '--drift': `${coin.drift}px`,
            }}
          >
            Ł
          </span>
        ))}
      </div>

      <header className="sky-nav">
        <a href="#overview" className="sky-brand" aria-label="Ayni Protocol home">
          <span className="sky-brand-dot" aria-hidden />
          Ayni Protocol
        </a>
        <nav className="sky-nav-links" aria-label="Main">
          <a href="#mechanism">Mechanism</a>
        </nav>
        <a href="#start" className="sky-nav-cta">
          Launch dApp
        </a>
      </header>

      <main className="sky-main">
        <section className="sky-hero" id="overview">
          <div className="sky-hero-copy">
            <p className="sky-kicker">Ayni means reciprocity</p>
            <h1 className="sky-title">Unlocking the Dormant Liquidity of the Litecoin Ecosystem.</h1>
            <p className="sky-subtitle">
              Ayni is the first modular, trustless, cross-chain CDP engine focused on bridging Litecoin security with
              Ethereum-family DeFi utility.
            </p>
            <div className="sky-actions">
              <a href="#mechanism" className="sky-btn sky-btn-primary">
                Read mechanism
              </a>
              <a href="#start" className="sky-btn sky-btn-secondary">
                Open Ayni
              </a>
            </div>
            <ul className="sky-stats" aria-label="Ayni highlights">
              {STATS.map((stat) => (
                <li key={stat.label}>
                  <strong>{stat.value}</strong>
                  <span>{stat.label}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="sky-hero-media" aria-hidden>
            <div className="sky-media-frame sky-media-frame-large sky-visual-panel">
              <div className="sky-visual-grid">
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
              <div className="sky-visual-glow" />
            </div>
            <div className="sky-media-grid">
              <div className="sky-media-frame sky-visual-panel sky-visual-panel-small">
                <div className="sky-bar-chart" />
              </div>
              <div className="sky-media-frame sky-media-chip">
                <p>Primary goal</p>
                <strong>LTC as productive collateral</strong>
                <span>without forced selling</span>
              </div>
            </div>
          </div>
        </section>

        <section className="sky-section" id="mechanism">
          <header className="sky-section-head">
            <p className="sky-section-kicker">Core Mechanism</p>
            <h2 className="sky-section-title">Trustless bridging, modular execution, native USDC.</h2>
          </header>

          <div className="sky-feature-grid">
            {MECHANISMS.map((feature, index) => (
              <article key={feature.title} className="sky-feature-card" style={{ '--delay': `${index * 90}ms` }}>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
                <span>{feature.meta}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="sky-section sky-ops" id="progress">
          <div className="sky-ops-card">
            <p className="sky-section-kicker">Success Milestones</p>
            <ul>
              {MILESTONES.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="sky-ops-card">
            <p className="sky-section-kicker">Stakeholders</p>
            <ul>
              {STAKEHOLDERS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="sky-cta" id="start">
          <p className="sky-section-kicker">Ayni Protocol</p>
          <h2>Bridging Security and Utility through Reciprocity.</h2>
          <p>Positioning Circle standard USDC distribution on LitVM with solver-optimized liquidity.</p>
          <a href="#overview" className="sky-btn sky-btn-primary">
            Launch Ayni
          </a>
        </section>
      </main>

      <footer className="sky-footer">
        <p>Ayni Protocol landing • LiteVM ecosystem CDP infrastructure</p>
      </footer>
    </div>
  )
}

export default App
