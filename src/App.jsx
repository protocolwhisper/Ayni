import './App.css'

const STATS = [
  { value: 'Top 20 Asset', label: 'Litecoin market position' },
  { value: '60%', label: 'users needing stablecoin access without selling LTC' },
  { value: '100,000 USDC', label: 'successfully lock/minted on testnet' },
]

const CONTEXT_CARDS = [
  {
    symbol: 'P',
    title: 'The Problem',
    rate: 'Dormant LTC liquidity',
    description:
      'Litecoin holders need stablecoins but current paths are centralized, synthetic, or capital-inefficient.',
    action: 'Why this matters',
  },
  {
    symbol: 'S',
    title: 'The Solution',
    rate: 'Trustless CDP dApp',
    description:
      'Use zkLTC on LitVM as collateral to mint or borrow native USDC through Circle CCTP, without selling LTC.',
    action: 'How it works',
  },
  {
    symbol: 'V',
    title: 'The Vision',
    rate: 'Security + Utility',
    description:
      'Bridge Litecoin security to Ethereum-family DeFi utility through a modular, cross-chain CDP engine.',
    action: 'Read vision',
  },
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

const STACK = [
  {
    title: 'LitVM',
    text: 'ZK-rollup infrastructure for Litecoin collateralization and execution.',
    meta: 'Execution layer',
  },
  {
    title: 'Espresso Shared Sequencer',
    text: 'Soft finality for responsive UX and intent coordination across liquidity participants.',
    meta: 'Low-latency intent handling',
  },
  {
    title: 'Orbit State Proofs',
    text: 'Trustless oracle verification for collateral state and protocol accounting.',
    meta: 'Proof-based oracle integrity',
  },
  {
    title: 'ERC-4626 Debt Receipts',
    text: 'Standardized debt receipts for solver and LP incentives in professional debt markets.',
    meta: 'Composable debt markets',
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

function App() {
  return (
    <div className="sky">
      <div className="sky-noise" aria-hidden />

      <header className="sky-nav">
        <a href="#overview" className="sky-brand" aria-label="Ayni Protocol home">
          <span className="sky-brand-dot" aria-hidden />
          Ayni Protocol
        </a>
        <nav className="sky-nav-links" aria-label="Main">
          <a href="#vision">Vision</a>
          <a href="#mechanism">Mechanism</a>
          <a href="#stack">Stack</a>
          <a href="#differentiators">Differentiators</a>
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
              <a href="#vision" className="sky-btn sky-btn-primary">
                Read vision
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

        <section className="sky-section" id="vision">
          <header className="sky-section-head">
            <p className="sky-section-kicker">Vision</p>
            <h2 className="sky-section-title">Bridge security and utility through reciprocity.</h2>
            <p className="sky-section-copy">
              Ayni closes the gap between Litecoin collateral and native stablecoin liquidity for DeFi participation.
            </p>
          </header>

          <div className="sky-token-grid">
            {CONTEXT_CARDS.map((card, index) => (
              <article key={card.title} className="sky-token-card" style={{ '--delay': `${index * 120}ms` }}>
                <div className={`sky-token-icon sky-token-icon-${card.title.split(' ')[1]?.toLowerCase() || 'ayni'}`} aria-hidden>
                  {card.symbol}
                </div>
                <p className="sky-token-symbol">{card.title}</p>
                <h3>{card.rate}</h3>
                <p className="sky-token-copy">{card.description}</p>
                <button type="button">{card.action}</button>
              </article>
            ))}
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

        <section className="sky-section" id="stack">
          <header className="sky-section-head">
            <p className="sky-section-kicker">Technology Stack</p>
            <h2 className="sky-section-title">Built with LitVM, Espresso, Orbit, and ERC-4626 receipts.</h2>
          </header>

          <div className="sky-feature-grid">
            {STACK.map((item, index) => (
              <article key={item.title} className="sky-feature-card" style={{ '--delay': `${index * 90}ms` }}>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
                <span>{item.meta}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="sky-section" id="differentiators">
          <header className="sky-section-head">
            <p className="sky-section-kicker">Key Differentiators</p>
            <h2 className="sky-section-title">Ayni versus traditional alternatives.</h2>
          </header>

          <div className="sky-compare-wrap">
            <table className="sky-compare" aria-label="Ayni comparison table">
              <thead>
                <tr>
                  <th>Feature</th>
                  <th>Ayni Protocol</th>
                  <th>Traditional Alternatives</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Token Quality</td>
                  <td>Bridged USDC (Circle CCTP)</td>
                  <td>Synthetic or wrapped stablecoins</td>
                </tr>
                <tr>
                  <td>Trust Model</td>
                  <td>Trustless with zk-proofs</td>
                  <td>Custodian-dependent</td>
                </tr>
                <tr>
                  <td>Verification</td>
                  <td>Dual settlement visibility</td>
                  <td>Opaque or off-chain</td>
                </tr>
                <tr>
                  <td>Efficiency</td>
                  <td>Just-in-time solver liquidity</td>
                  <td>Idle over-collateralization</td>
                </tr>
              </tbody>
            </table>
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
