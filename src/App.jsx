import { useState, useEffect } from 'react'
import './App.css'

const COINGECKO_LTC_PRICE = 'https://api.coingecko.com/api/v3/simple/price?ids=litecoin&vs_currencies=usd'
const COINGECKO_LTC_CHART = 'https://api.coingecko.com/api/v3/coins/litecoin/market_chart?vs_currency=usd&days=7'
const COINCAP_LTC_PRICE = 'https://api.coincap.io/v2/assets/litecoin'
const COINCAP_LTC_CHART = 'https://api.coincap.io/v2/assets/litecoin/history?interval=h6'
const COINBASE_LTC_PRICE = 'https://api.coinbase.com/v2/prices/LTC-USD/spot'

function normalizeSeries(pairs) {
  if (!Array.isArray(pairs)) return []
  return pairs
    .map(([ts, value]) => [Number(ts), Number(value)])
    .filter(([ts, value]) => Number.isFinite(ts) && Number.isFinite(value))
    .sort((a, b) => a[0] - b[0])
}

function createFallbackSeries(basePrice = 90) {
  const count = 42
  const step = 4 * 60 * 60 * 1000
  const now = Date.now()
  return Array.from({ length: count }, (_, index) => {
    const ts = now - (count - 1 - index) * step
    const wave = Math.sin(index / 3.1) * 2.1 + Math.sin(index / 6.4) * 1.2
    const drift = (index - count / 2) * 0.04
    const value = Math.max(1, basePrice + wave + drift)
    return [ts, value]
  })
}

async function fetchJson(url, timeoutMs = 12000) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  } finally {
    clearTimeout(timeout)
  }
}

async function fetchLtcSnapshot() {
  try {
    const [priceJson, chartJson] = await Promise.all([
      fetchJson(COINGECKO_LTC_PRICE),
      fetchJson(COINGECKO_LTC_CHART),
    ])
    const price = Number(priceJson?.litecoin?.usd)
    const series = normalizeSeries(chartJson?.prices)
    if (Number.isFinite(price) && series.length > 1) {
      return { price, series, source: 'CoinGecko', warning: null }
    }
  } catch {
    // Fallback below
  }

  try {
    const [assetJson, historyJson] = await Promise.all([
      fetchJson(COINCAP_LTC_PRICE),
      fetchJson(COINCAP_LTC_CHART),
    ])
    const price = Number(assetJson?.data?.priceUsd)
    const series = normalizeSeries((historyJson?.data || []).map((point) => [Date.parse(point.date), point.priceUsd]))
    if (Number.isFinite(price) && series.length > 1) {
      return { price, series, source: 'CoinCap', warning: null }
    }
  } catch {
    // Fallback below
  }

  try {
    const priceJson = await fetchJson(COINBASE_LTC_PRICE)
    const price = Number(priceJson?.data?.amount)
    if (Number.isFinite(price)) {
      return {
        price,
        series: createFallbackSeries(price),
        source: 'Coinbase',
        warning: 'Live chart feed unavailable, using estimated curve',
      }
    }
  } catch {
    // Final fallback below
  }

  return {
    price: null,
    series: createFallbackSeries(90),
    source: 'Fallback',
    warning: 'Live LTC providers temporarily unavailable',
  }
}

function LtcPriceChart() {
  const [price, setPrice] = useState(null)
  const [chartData, setChartData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [source, setSource] = useState('—')

  useEffect(() => {
    let cancelled = false
    async function fetchData() {
      try {
        const snapshot = await fetchLtcSnapshot()
        if (cancelled) return
        setPrice(snapshot.price)
        setChartData(snapshot.series)
        setSource(snapshot.source)
        setError(snapshot.warning)
      } catch (e) {
        if (cancelled) return
        setPrice(null)
        setChartData(createFallbackSeries(90))
        setSource('Fallback')
        setError(e instanceof Error ? e.message : 'Unable to load price')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchData()
    const interval = setInterval(fetchData, 60_000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  if (loading && price == null && chartData.length === 0) {
    return (
      <div className="sky-ltc-widget">
        <div className="sky-ltc-widget-head">
          <span className="sky-ltc-badge">Ł LTC</span>
        </div>
        <p className="sky-ltc-loading">Loading…</p>
      </div>
    )
  }
  const values = chartData.map(([, v]) => v).filter((v) => Number.isFinite(v))
  const hasChart = values.length > 0
  const min = hasChart ? Math.min(...values) : 0
  const max = hasChart ? Math.max(...values) : 1
  const range = max - min || 1
  const width = 280
  const height = 100
  const padding = { top: 8, right: 8, bottom: 8, left: 8 }
  const innerW = width - padding.left - padding.right
  const innerH = height - padding.top - padding.bottom
  const points = values.map((v, i) => {
    const x = padding.left + (i / (values.length - 1 || 1)) * innerW
    const y = padding.top + innerH - ((v - min) / range) * innerH
    return `${x},${y}`
  })
  const pathD = points.length ? `M ${points.join(' L ')}` : ''
  const areaD = pathD ? `${pathD} L ${padding.left + innerW},${padding.top + innerH} L ${padding.left},${padding.top + innerH} Z` : ''

  return (
    <div className="sky-ltc-widget">
      <div className="sky-ltc-widget-head">
        <span className="sky-ltc-badge">Ł LTC</span>
        <span className="sky-ltc-meta">7d · {source}</span>
      </div>
      <p className="sky-ltc-price">
        $
        {price != null
          ? Number(price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          : '—'}
      </p>
      <div className="sky-ltc-chart-wrap">
        <svg className="sky-ltc-chart" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
          <defs>
            <linearGradient id="sky-ltc-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(212, 118, 255, 0.35)" />
              <stop offset="100%" stopColor="rgba(120, 60, 180, 0)" />
            </linearGradient>
            <filter id="sky-ltc-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {areaD && <path d={areaD} fill="url(#sky-ltc-gradient)" />}
          {pathD && <path d={pathD} fill="none" stroke="rgba(230, 180, 255, 0.95)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" filter="url(#sky-ltc-glow)" />}
        </svg>
      </div>
      {error && <p className="sky-ltc-error">{error}</p>}
    </div>
  )
}

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
  { x: 5, y: 8, size: 31, duration: 20, delay: 0, drift: 28 },
  { x: 18, y: 22, size: 24, duration: 16, delay: -3, drift: -22 },
  { x: 88, y: 12, size: 35, duration: 22, delay: -5, drift: 30 },
  { x: 12, y: 45, size: 29, duration: 18, delay: -7, drift: -18 },
  { x: 75, y: 38, size: 33, duration: 24, delay: -2, drift: 26 },
  { x: 42, y: 55, size: 26, duration: 17, delay: -9, drift: -24 },
  { x: 92, y: 62, size: 31, duration: 19, delay: -4, drift: 32 },
  { x: 8, y: 78, size: 33, duration: 21, delay: -6, drift: -20 },
  { x: 55, y: 85, size: 37, duration: 23, delay: -1, drift: 28 },
  { x: 28, y: 95, size: 22, duration: 15, delay: -8, drift: -16 },
  { x: 68, y: 15, size: 29, duration: 18, delay: -10, drift: 24 },
  { x: 35, y: 72, size: 31, duration: 20, delay: -5, drift: -26 },
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
            <div className="sky-media-frame sky-media-frame-large sky-ltc-panel">
              <LtcPriceChart />
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
