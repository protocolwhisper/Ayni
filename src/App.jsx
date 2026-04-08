import { startTransition, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import DashboardPage from './DashboardPage.jsx'

const COINGECKO_LTC_PRICE = 'https://api.coingecko.com/api/v3/simple/price?ids=litecoin&vs_currencies=usd'
const COINGECKO_LTC_CHART =
  'https://api.coingecko.com/api/v3/coins/litecoin/market_chart?vs_currency=usd&days=7'
const COINCAP_LTC_PRICE = 'https://api.coincap.io/v2/assets/litecoin'
const COINCAP_LTC_CHART = 'https://api.coincap.io/v2/assets/litecoin/history?interval=h6'
const COINBASE_LTC_PRICE = 'https://api.coinbase.com/v2/prices/LTC-USD/spot'

const HERO_LINKS = [
  { label: 'VISION', href: '#vision' },
  { label: 'MECHANISM', href: '#mechanism' },
  { label: 'MILESTONES', href: '#milestones' },
]

const HIGHLIGHTS = [
  'Top 20 LTC asset',
  '100K USDC minted on testnet',
]

const HERO_STATS = [
  { value: '60%', label: 'holders need liquidity without selling LTC' },
  { value: 'Circle CCTP', label: 'native USDC path instead of wrapped synths' },
  { value: 'LitVM', label: 'execution layer for zkLTC collateral' },
]

const CONTEXT_CARDS = [
  {
    title: 'Vision',
    body: 'Bridge Litecoin security into native DeFi utility.',
  },
  {
    title: 'The Problem',
    body: 'Holders need liquidity without selling LTC or trusting wrappers.',
  },
  {
    title: 'The Solution',
    body: 'Use zkLTC on LitVM to access USDC through Circle CCTP.',
  },
]

const MECHANISM = [
  {
    title: 'Trustless Bridging',
    text: 'zkLTC holders on LitVM leverage collateral without centralized intermediaries.',
  },
  {
    title: 'Modular Accounting',
    text: 'Core logic stays separate from execution adapters, so protocol upgrades do not require liquidity migration.',
  },
  {
    title: 'Native Liquidity',
    text: 'Circle CCTP delivers Bridged Standard USDC and avoids the de-peg risk of wrapped stablecoin substitutes.',
  },
]

const STRATEGY = [
  {
    title: 'Circle Primary Partner Path',
    text: 'By attracting Bridged Standard USDC through official rails, Ayni aims to become the main USDC distribution primitive on LitVM.',
  },
  {
    title: 'Solver Optimization',
    text: 'Solvers move capital only when demand exists, which improves LP ROI and keeps deployed liquidity productive.',
  },
]

const WIN_CARDS = [
  {
    label: 'Native USDC',
    title: 'Skip wrapped token risk',
    text: 'Users reach official USDC through Circle CCTP instead of synthetic stand-ins.',
  },
  {
    label: 'Proof Layer',
    title: 'Collateral stays verifiable',
    text: 'Orbit State Proofs give settlement visibility instead of opaque off-chain accounting.',
  },
  {
    label: 'Solver Design',
    title: 'Liquidity moves only when needed',
    text: 'Capital is deployed on demand, which keeps LP inventory productive.',
  },
  {
    label: 'Modular Core',
    title: 'Upgrades without migration drama',
    text: 'Execution adapters evolve while core accounting stays intact for the market.',
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
  'Primary Users: Long-term Litecoin holders',
  'Market Makers: Solvers and LPs providing USDC liquidity',
]

const FLOATING_TAGS = [
  { label: 'LitVM', x: '14%', y: '15%' },
  { label: 'zkLTC', x: '73%', y: '18%' },
  { label: 'Circle CCTP', x: '70%', y: '74%' },
  { label: 'Orbit Proofs', x: '17%', y: '72%' },
  { label: 'ERC-4626', x: '48%', y: '10%' },
]

const HERO_STARS = Array.from({ length: 44 }, (_, index) => ({
  x: `${(index * 17) % 100}%`,
  y: `${(index * 29) % 100}%`,
  size: `${1 + (index % 3)}px`,
  delay: `${(index % 8) * -0.7}s`,
  duration: `${5 + (index % 5)}s`,
}))

const PARTICLES = Array.from({ length: 260 }, (_, index) => {
  const major = ((index % 52) / 52) * Math.PI * 2
  const minorBand = Math.floor(index / 52)
  const minor = (minorBand / 5) * Math.PI * 2
  const majorRadius = 182
  const minorRadius = 72 + Math.sin(major * 3 + minor) * 10
  const depth = Math.cos(minor + major * 0.7)
  const x = Math.cos(major) * (majorRadius + Math.cos(minor) * minorRadius) * 0.78
  const y =
    Math.sin(major) * (majorRadius * 0.34 + Math.cos(minor) * minorRadius * 0.36) +
    Math.sin(minor) * minorRadius * 0.96
  const scale = (0.34 + ((depth + 1) / 2) * 0.9).toFixed(3)
  const opacity = (0.2 + ((depth + 1) / 2) * 0.74).toFixed(3)
  const blur = depth < -0.18 ? '1.2px' : '0px'
  const glow = (0.16 + ((depth + 1) / 2) * 0.42).toFixed(3)

  return {
    x: `${x.toFixed(2)}px`,
    y: `${y.toFixed(2)}px`,
    scale,
    opacity,
    blur,
    glow,
    delay: `${(index % 14) * -0.33}s`,
  }
})

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
    // Fall through to the next provider.
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
    // Fall through to the next provider.
  }

  try {
    const priceJson = await fetchJson(COINBASE_LTC_PRICE)
    const price = Number(priceJson?.data?.amount)
    if (Number.isFinite(price)) {
      return {
        price,
        series: createFallbackSeries(price),
        source: 'Coinbase',
        warning: 'Live chart feed unavailable, using estimated curve.',
      }
    }
  } catch {
    // Fall through to the final fallback.
  }

  return {
    price: null,
    series: createFallbackSeries(90),
    source: 'Fallback',
    warning: 'Live LTC providers temporarily unavailable.',
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
      } catch (err) {
        if (cancelled) return
        setPrice(null)
        setChartData(createFallbackSeries(90))
        setSource('Fallback')
        setError(err instanceof Error ? err.message : 'Unable to load price.')
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

  if (loading && chartData.length === 0) {
    return (
      <article className="market-card">
        <header className="market-head">
          <span className="market-badge">Ł LTC</span>
          <span className="market-source">Loading</span>
        </header>
        <p className="market-price">Loading market feed...</p>
      </article>
    )
  }

  const values = chartData.map(([, value]) => value).filter((value) => Number.isFinite(value))
  const min = values.length ? Math.min(...values) : 0
  const max = values.length ? Math.max(...values) : 1
  const range = max - min || 1
  const width = 320
  const height = 110
  const pad = 8
  const points = values.map((value, idx) => {
    const x = pad + (idx / (values.length - 1 || 1)) * (width - pad * 2)
    const y = pad + (1 - (value - min) / range) * (height - pad * 2)
    return `${x},${y}`
  })
  const path = points.length ? `M ${points.join(' L ')}` : ''
  const area = path ? `${path} L ${width - pad},${height - pad} L ${pad},${height - pad} Z` : ''

  return (
    <article className="market-card">
      <header className="market-head">
        <span className="market-badge">Ł LTC</span>
        <span className="market-source">7D · {source}</span>
      </header>
      <p className="market-price">
        $
        {price != null
          ? Number(price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          : '—'}
      </p>
      <div className="market-chart-wrap">
        <svg className="market-chart" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
          <defs>
            <linearGradient id="market-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(218, 201, 255, 0.52)" />
              <stop offset="100%" stopColor="rgba(218, 201, 255, 0)" />
            </linearGradient>
          </defs>
          {area && <path d={area} fill="url(#market-area)" />}
          {path && (
            <path
              d={path}
              fill="none"
              stroke="rgba(245, 239, 255, 0.96)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>
      </div>
      {error && <p className="market-warning">{error}</p>}
    </article>
  )
}

function App() {
  if (typeof window !== 'undefined' && window.location.pathname.replace(/\/+$/, '') === '/dashboard') {
    return <DashboardPage />
  }

  const scrollRef = useRef(null)
  const [showDock, setShowDock] = useState(false)
  const [heroPointer, setHeroPointer] = useState({
    spotX: '56%',
    spotY: '44%',
    parallaxX: '0px',
    parallaxY: '0px',
    tiltX: '0deg',
    tiltY: '0deg',
    tagShiftX: '0px',
    tagShiftY: '0px',
  })

  function handleHeroMove(event) {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width
    const y = (event.clientY - rect.top) / rect.height
    const centeredX = x - 0.5
    const centeredY = y - 0.5

    startTransition(() => {
      setHeroPointer({
        spotX: `${(x * 100).toFixed(2)}%`,
        spotY: `${(y * 100).toFixed(2)}%`,
        parallaxX: `${(centeredX * 28).toFixed(2)}px`,
        parallaxY: `${(centeredY * 22).toFixed(2)}px`,
        tiltX: `${(-centeredY * 5).toFixed(2)}deg`,
        tiltY: `${(centeredX * 7).toFixed(2)}deg`,
        tagShiftX: `${(centeredX * 14).toFixed(2)}px`,
        tagShiftY: `${(centeredY * 10).toFixed(2)}px`,
      })
    })
  }

  function handleHeroLeave() {
    startTransition(() => {
      setHeroPointer({
        spotX: '56%',
        spotY: '44%',
        parallaxX: '0px',
        parallaxY: '0px',
        tiltX: '0deg',
        tiltY: '0deg',
        tagShiftX: '0px',
        tagShiftY: '0px',
      })
    })
  }

  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll('.reveal-on-scroll'))
    if (!nodes.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.18, rootMargin: '0px 0px -10% 0px' }
    )

    nodes.forEach((node) => observer.observe(node))
    return () => observer.disconnect()
  }, [])

  const scrollTargets = useMemo(
    () => ({
      '#overview': 'overview',
      '#vision': 'vision',
      '#mechanism': 'mechanism',
      '#milestones': 'milestones',
      '#start': 'start',
    }),
    []
  )

  function scrollToHash(hash) {
    const container = scrollRef.current
    if (!container) return
    const id = scrollTargets[hash]
    if (!id) return

    if (id === 'overview') {
      container.scrollTo({ top: 0, behavior: 'smooth' })
      setShowDock(false)
      if (typeof window !== 'undefined') window.history.replaceState(null, '', '#overview')
      return
    }

    const el = container.querySelector(`#${id}`)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    if (typeof window !== 'undefined') window.history.replaceState(null, '', hash)
  }

  useEffect(() => {
    const container = scrollRef.current
    if (!container) return

    const prevent = (e) => e.preventDefault()
    const preventKeys = (e) => {
      const keys = ['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' ']
      if (keys.includes(e.key)) e.preventDefault()
    }

    container.addEventListener('wheel', prevent, { passive: false })
    container.addEventListener('touchmove', prevent, { passive: false })
    window.addEventListener('keydown', preventKeys)

    return () => {
      container.removeEventListener('wheel', prevent)
      container.removeEventListener('touchmove', prevent)
      window.removeEventListener('keydown', preventKeys)
    }
  }, [])

  useEffect(() => {
    const container = scrollRef.current
    if (!container) return

    const onScroll = () => {
      const next = container.scrollTop > 80
      setShowDock(next)
    }

    onScroll()
    container.addEventListener('scroll', onScroll, { passive: true })
    return () => container.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const container = scrollRef.current
    if (!container) return

    const updateShellLeft = () => {
      const rect = container.getBoundingClientRect()
      document.documentElement.style.setProperty('--vault-shell-left', `${rect.left}px`)
    }

    updateShellLeft()
    window.addEventListener('resize', updateShellLeft)
    return () => window.removeEventListener('resize', updateShellLeft)
  }, [])

  return (
    <div className="vault-page">
      <main className="vault-shell vault-scroll" ref={scrollRef}>
        <section
          className="hero-stage"
          id="overview"
          onMouseMove={handleHeroMove}
          onMouseLeave={handleHeroLeave}
          style={{
            '--spot-x': heroPointer.spotX,
            '--spot-y': heroPointer.spotY,
            '--parallax-x': heroPointer.parallaxX,
            '--parallax-y': heroPointer.parallaxY,
            '--tilt-x': heroPointer.tiltX,
            '--tilt-y': heroPointer.tiltY,
            '--tag-shift-x': heroPointer.tagShiftX,
            '--tag-shift-y': heroPointer.tagShiftY,
          }}
        >
          <a className="hero-brand" href="#overview">
            <span className="hero-brand-mark" aria-hidden>
              A
            </span>
            Ayni Protocol
          </a>

          <nav className="hero-rail" aria-label="Primary">
            {HERO_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => {
                  e.preventDefault()
                  scrollToHash(link.href)
                }}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hero-copy">
            <p className="hero-kicker">Unlocking Dormant Litecoin Liquidity.</p>
            <h1 className="hero-title">The Architecture of Litecoin Value</h1>
            <p className="hero-subtitle">
              A trustless path from zkLTC collateral to native USDC on LitVM.
            </p>
            <div className="hero-actions">
              <a
                className="hero-action-primary"
                href="#mechanism"
                onClick={(e) => {
                  e.preventDefault()
                  scrollToHash('#mechanism')
                }}
              >
                Explore Mechanism
              </a>
              <a
                className="hero-action-secondary"
                href="#vision"
                onClick={(e) => {
                  e.preventDefault()
                  scrollToHash('#vision')
                }}
              >
                Why Ayni
              </a>
            </div>
            <div className="hero-signal-grid">
              {HIGHLIGHTS.map((item) => (
                <div key={item} className="hero-signal-card">
                  {item}
                </div>
              ))}
            </div>
            <div className="hero-stat-list">
              {HERO_STATS.map((item) => (
                <div key={item.label} className="hero-stat">
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-grid" aria-hidden />

            <div className="hero-stars" aria-hidden>
              {HERO_STARS.map((star, index) => (
                <span
                  key={`${star.x}-${star.y}-${index}`}
                  style={{
                    '--x': star.x,
                    '--y': star.y,
                    '--size': star.size,
                    '--delay': star.delay,
                    '--duration': star.duration,
                  }}
                />
              ))}
            </div>

            <div className="particle-sculpture" aria-hidden>
              {PARTICLES.map((particle, index) => (
                <span
                  key={index}
                  className="particle-node"
                  style={{
                    '--x': particle.x,
                    '--y': particle.y,
                    '--scale': particle.scale,
                    '--opacity': particle.opacity,
                    '--blur': particle.blur,
                    '--glow': particle.glow,
                    '--delay': particle.delay,
                  }}
                />
              ))}
            </div>

            {FLOATING_TAGS.map((tag) => (
              <div
                key={tag.label}
                className="floating-tag"
                style={{
                  '--x': tag.x,
                  '--y': tag.y,
                }}
              >
                {tag.label}
              </div>
            ))}
          </div>

          <a
            className="hero-cta"
            href="/dashboard"
            onClick={(e) => {
              e.preventDefault()
              if (typeof window !== 'undefined') window.location.assign('/dashboard')
            }}
          >
            Get Started
          </a>
        </section>

        <section className="landing-section landing-row intro-band reveal-on-scroll" id="vision" style={{ '--index': 0 }}>
          <div className="section-heading compact">
            <p className="section-label">Why Ayni</p>
            <h2>Litecoin liquidity, rebuilt as a trustless product.</h2>
            <p>Three simple truths explain the whole pitch.</p>
            <div className="vision-market">
              <LtcPriceChart />
            </div>
          </div>
          <div className="section-canvas">
            <div className="story-grid">
              {CONTEXT_CARDS.map((card, index) => (
                <article key={card.title} className="story-card reveal-on-scroll" style={{ '--index': index }}>
                  <span className="story-card-chip">{card.title}</span>
                  <h3>{card.title}</h3>
                  <p>{card.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-section composition-section" id="mechanism">
          <div className="composition-intro reveal-on-scroll" style={{ '--index': 0 }}>
            <p className="section-label">Protocol Flow</p>
          </div>

          <div className="composition-band reveal-on-scroll" style={{ '--index': 1 }}>
            <div className="composition-band-head">
              <p className="section-label">How It Works</p>
              <h3>Three moves turn dormant LTC into productive liquidity.</h3>
            </div>
            <div className="composition-grid composition-grid-three">
              {MECHANISM.map((item, index) => (
                <article key={item.title} className="feature-card composition-card reveal-on-scroll" style={{ '--index': index }}>
                  <span className="feature-step">0{index + 1}</span>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="composition-band reveal-on-scroll" id="milestones" style={{ '--index': 2 }}>
            <div className="composition-band-head">
              <p className="section-label">Why It Wins</p>
              <h3>Native USDC, visible collateral, solver efficiency.</h3>
            </div>
            <div className="composition-grid composition-grid-three">
              {WIN_CARDS.slice(0, 3).map((item, index) => (
                <article key={item.title} className="story-card cute-card composition-card reveal-on-scroll" style={{ '--index': index }}>
                  <span className="cute-card-label">{item.label}</span>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="composition-summary-row">
            <article className="content-panel composition-summary-panel reveal-on-scroll" style={{ '--index': 0 }}>
              <p className="section-label">Milestones</p>
              <h3>Already proving the route.</h3>
              <div className="summary-list">
                {MILESTONES.map((item, index) => (
                  <div key={item} className="summary-item">
                    <span>0{index + 1}</span>
                    <p>{item}</p>
                  </div>
                ))}
              </div>
            </article>

            <article className="content-panel composition-summary-panel reveal-on-scroll" style={{ '--index': 1 }}>
              <p className="section-label">Built For</p>
              <h3>The people around the flow.</h3>
              <div className="stakeholder-chip-grid">
                {STAKEHOLDERS.map((item) => {
                  const [title, body] = item.split(': ')

                  return (
                    <div key={item} className="stakeholder-chip">
                      <strong>{title}</strong>
                      <span>{body ?? item}</span>
                    </div>
                  )
                })}
              </div>
            </article>
          </div>
        </section>

        <section className="landing-section final-cta" id="start">
          <article className="content-panel cta-panel reveal-on-scroll" style={{ '--index': 0 }}>
            <div>
              <p className="section-label">Ayni Protocol</p>
              <h3>Bridging security and utility through reciprocity.</h3>
              <p className="cta-copy">
                Give Litecoin holders a trustless route into productive USDC liquidity without forcing them out of LTC.
              </p>
            </div>
            <a
              href="/dashboard"
              onClick={(e) => {
                e.preventDefault()
                if (typeof window !== 'undefined') window.location.assign('/dashboard')
              }}
            >
              Launch dApp
            </a>
          </article>
        </section>
        <nav className={`vault-dock ${showDock ? 'is-visible' : ''}`} aria-label="Section navigation">
          <button type="button" className="vault-dock-btn" onClick={() => scrollToHash('#overview')}>
            Home
          </button>
          <button type="button" className="vault-dock-btn" onClick={() => scrollToHash('#vision')}>
            Vision
          </button>
          <button type="button" className="vault-dock-btn" onClick={() => scrollToHash('#mechanism')}>
            Mechanism
          </button>
          <button type="button" className="vault-dock-btn" onClick={() => scrollToHash('#milestones')}>
            Milestones
          </button>
          <button type="button" className="vault-dock-btn vault-dock-btn-primary" onClick={() => scrollToHash('#start')}>
            Get Started
          </button>
        </nav>
      </main>
    </div>
  )
}

export default App
