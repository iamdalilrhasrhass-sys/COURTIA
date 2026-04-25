import React, { useRef, useEffect, useState, useCallback } from 'react'

/* ── SVG namespace ── */
const SVG_NS = 'http://www.w3.org/2000/svg'

/* ── Helpers ── */
function scaleRadius(premium, minR = 15, maxR = 55) {
  const p = Math.min(premium, 50000)
  return minR + (p / 50000) * (maxR - minR)
}

function colorForClient(c) {
  const rs = c.riskScore ?? 0
  if (c.renewalWithin30 || c.status === 'renewal') return 'amber'
  if (c.status === 'at_risk' || rs > 70) return 'pink'
  if (c.status === 'opportunity') return 'violet'
  if (c.status === 'prospect') return 'grey'
  /* active */
  if (rs < 30) return 'green'
  if (rs <= 70) return 'blue'
  return 'pink'
}

/* radial gradient definition sets */
const GRAD_DEFS = {
  green: [
    { offset: 0,  color: 'rgba(255,255,255,1)' },
    { offset: 20, color: 'rgba(220,252,231,0.85)' },
    { offset: 45, color: 'rgba(187,247,208,0.65)' },
    { offset: 70, color: 'rgba(134,239,172,0.50)' },
    { offset: 90, color: 'rgba(74,222,128,0.55)' },
    { offset: 100, color: 'rgba(22,163,74,0.60)' },
  ],
  blue: [
    { offset: 0,  color: 'rgba(255,255,255,1)' },
    { offset: 20, color: 'rgba(219,234,254,0.85)' },
    { offset: 45, color: 'rgba(191,219,254,0.65)' },
    { offset: 70, color: 'rgba(147,197,253,0.50)' },
    { offset: 90, color: 'rgba(96,165,250,0.55)' },
    { offset: 100, color: 'rgba(37,99,235,0.60)' },
  ],
  violet: [
    { offset: 0,  color: 'rgba(255,255,255,1)' },
    { offset: 20, color: 'rgba(243,232,255,0.85)' },
    { offset: 45, color: 'rgba(233,213,255,0.65)' },
    { offset: 70, color: 'rgba(216,180,254,0.50)' },
    { offset: 90, color: 'rgba(192,132,252,0.55)' },
    { offset: 100, color: 'rgba(126,34,206,0.60)' },
  ],
  pink: [
    { offset: 0,  color: 'rgba(255,255,255,1)' },
    { offset: 20, color: 'rgba(255,228,235,0.85)' },
    { offset: 45, color: 'rgba(254,205,211,0.65)' },
    { offset: 70, color: 'rgba(253,164,175,0.50)' },
    { offset: 90, color: 'rgba(251,113,133,0.55)' },
    { offset: 100, color: 'rgba(225,29,72,0.60)' },
  ],
  amber: [
    { offset: 0,  color: 'rgba(255,255,255,1)' },
    { offset: 20, color: 'rgba(254,243,199,0.85)' },
    { offset: 45, color: 'rgba(253,230,138,0.65)' },
    { offset: 70, color: 'rgba(252,211,77,0.50)' },
    { offset: 90, color: 'rgba(251,191,36,0.55)' },
    { offset: 100, color: 'rgba(217,119,6,0.60)' },
  ],
  grey: [
    { offset: 0,  color: 'rgba(255,255,255,0.5)' },
    { offset: 30, color: 'rgba(229,231,235,0.35)' },
    { offset: 60, color: 'rgba(209,213,219,0.25)' },
    { offset: 100, color: 'rgba(156,163,175,0.30)' },
  ],
}

/* ── Mock data (25-30 clients) ── */
const FIRST_NAMES = [
  'Marie','Jean','Pierre','Sophie','Lucas','Emma','Hugo','Lea','Nathan','Chloe',
  'Leo','Camille','Gabriel','Manon','Raphael','Sarah','Arthur','Laura','Louis','Ines',
  'Jules','Alice','Paul','Zoe','Antoine','Lena','Mathis','Mila','Noah','Jade',
]

const SEGMENTS = ['particulier','professionnel','premium','jeune']
const STATUSES  = ['active','active','active','active','active','opportunity','at_risk','renewal','prospect']

function generateMockClients() {
  const count = 27 + Math.floor(Math.random() * 4)
  return Array.from({ length: count }, (_, i) => {
    const status = STATUSES[i % STATUSES.length]
    const basePremium = 5000 + Math.random() * 45000
    const renewalWithin30 = i % 9 === 3
    return {
      id: `mock-${i + 1}`,
      name: FIRST_NAMES[i % FIRST_NAMES.length] + ' ' + ['Dupont','Martin','Bernard','Petit','Durand','Leroy','Moreau','Simon','Laurent','Lefevre','Roux','Garcia','Fournier','Mercier','Blanc'][i % 15],
      email: `client${i + 1}@exemple.fr`,
      annualPremium: Math.round(basePremium),
      riskScore: Math.round(Math.random() * 100),
      status,
      segment: SEGMENTS[i % SEGMENTS.length],
      renewalWithin30,
    }
  })
}

/* ── Component ── */
export default function BubblePortfolioMap({
  clients: externalClients,
  onClientClick,
  width = 800,
  height = 500,
}) {
  const svgRef = useRef(null)
  const tooltipRef = useRef(null)
  const simRef = useRef(null)
  const animRef = useRef(null)
  const [filter, setFilter] = useState('all')
  const [clients] = useState(() => externalClients && externalClients.length > 0 ? externalClients : generateMockClients())

  /* derive filtered list */
  const filtered = useCallback(() => {
    return clients.filter(c => {
      if (filter === 'all') return true
      if (filter === 'at_risk') return c.riskScore > 70 || c.status === 'at_risk'
      if (filter === 'opportunity') return c.status === 'opportunity'
      if (filter === 'renewal') return c.renewalWithin30 || c.status === 'renewal'
      return true
    })
  }, [clients, filter])

  /* ————— D3 force layout ————— */
  useEffect(() => {
    if (!svgRef.current || clients.length === 0) return
    let cancelled = false

    const svg = svgRef.current
    const { forceSimulation, forceCenter, forceCollide, forceManyBody, forceLink } = /* dynamic import from d3-force */ require_force()

    const nodes = clients.map((c, i) => ({
      id: c.id,
      index: i,
      r: scaleRadius(c.annualPremium),
      client: c,
      x: width / 2 + (Math.random() - 0.5) * width * 0.4,
      y: height / 2 + (Math.random() - 0.5) * height * 0.4,
    }))

    /* Build links: connect clients with similar riskScore (within 10 pts) */
    const links = []
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const diff = Math.abs(nodes[i].client.riskScore - nodes[j].client.riskScore)
        if (diff <= 10 && Math.random() < 0.18) {
          links.push({ source: i, target: j, strength: 0.02 })
        }
      }
    }

    const sim = forceSimulation(nodes)
      .force('center', forceCenter(width / 2, height / 2))
      .force('collide', forceCollide(d => d.r + 6).strength(0.7).iterations(3))
      .force('charge', forceManyBody().strength(-180).distanceMax(400))
      .force('link', forceLink(links).distance(100).strength(0.02))
      .alpha(0.8)
      .alphaDecay(0.02)

    /* keep ref for tick */
    const g = svg.querySelector('.bubbles-group')
    const defsEl = svg.querySelector('defs')
    if (!g) return

    /* Create gradient definitions */
    const gradIds = {}
    for (const [key, stops] of Object.entries(GRAD_DEFS)) {
      const id = `bpm-grad-${key}-${Date.now()}`
      const radial = document.createElementNS(SVG_NS, 'radialGradient')
      radial.setAttribute('id', id)
      radial.setAttribute('cx', '32%')
      radial.setAttribute('cy', '22%')
      radial.setAttribute('r', '85%')
      stops.forEach(s => {
        const el = document.createElementNS(SVG_NS, 'stop')
        el.setAttribute('offset', `${s.offset}%`)
        el.setAttribute('stop-color', s.color)
        radial.appendChild(el)
      })
      defsEl.appendChild(radial)
      gradIds[key] = id
    }

    /* Create bubble elements */
    const elements = new Map()
    nodes.forEach(n => {
      const group = document.createElementNS(SVG_NS, 'g')
      group.setAttribute('data-id', n.id)
      group.style.cursor = 'pointer'

      const circle = document.createElementNS(SVG_NS, 'circle')
      circle.setAttribute('r', n.r)

      const cls = colorForClient(n.client)
      const gradId = gradIds[cls] || gradIds.blue
      circle.setAttribute('fill', `url(#${gradId})`)
      circle.setAttribute('stroke', cls === 'grey' ? 'rgba(156,163,175,0.4)' : 'rgba(255,255,255,0.3)')
      circle.setAttribute('stroke-width', '1.2')

      /* subtle highlight iris overlay */
      const highlight = document.createElementNS(SVG_NS, 'circle')
      highlight.setAttribute('r', n.r * 0.92)
      highlight.setAttribute('fill', 'none')
      highlight.setAttribute('stroke', 'rgba(186,230,253,0.18)')
      highlight.setAttribute('stroke-width', n.r * 0.25)
      highlight.setAttribute('opacity', '0')
      highlight.style.transition = 'opacity 0.25s'
      highlight.setAttribute('filter', 'url(#bpm-glow)')

      /* Click */
      group.addEventListener('click', (e) => {
        e.stopPropagation()
        if (onClientClick) onClientClick(n.client.id)
      })

      /* Hover */
      group.addEventListener('mouseenter', (e) => {
        const tip = tooltipRef.current
        if (!tip) return
        const c = n.client
        tip.innerHTML = `
          <div style="font-weight:700;font-size:14px;margin-bottom:2px">${c.name}</div>
          <div style="font-size:12px;opacity:0.8">${c.email}</div>
          <div style="margin-top:4px;font-size:12px">
            <span style="${rsStyle(c.riskScore)}">Risque ${c.riskScore}/100</span>
            <span style="margin-left:8px">ARK ·</span>
            <span style="color:${c.renewalWithin30 ? '#f59e0b' : '#34d399'}">
              ${c.renewalWithin30 ? 'Renouvellement' : 'Stable'}
            </span>
          </div>
        `
        tip.style.opacity = '1'
        tip.style.pointerEvents = 'auto'

        highlight.setAttribute('opacity', '1')
      })

      group.addEventListener('mouseleave', () => {
        const tip = tooltipRef.current
        if (tip) { tip.style.opacity = '0'; tip.style.pointerEvents = 'none' }
        highlight.setAttribute('opacity', '0')
      })

      /* Mousemove for tooltip tracking */
      group.addEventListener('mousemove', (e) => {
        const tip = tooltipRef.current
        if (!tip) return
        const svgRect = svg.getBoundingClientRect()
        let tx = e.clientX - svgRect.left + 16
        let ty = e.clientY - svgRect.top - 10
        if (tx + 200 > width) tx = e.clientX - svgRect.left - 210
        if (ty < 0) ty = 10
        if (ty + 100 > height) ty = height - 110
        tip.style.left = tx + 'px'
        tip.style.top = ty + 'px'
      })

      group.appendChild(circle)
      group.appendChild(highlight)
      g.appendChild(group)
      elements.set(n.id, { group, node: n })
    })

    /* Links */
    const linkGroup = svg.querySelector('.links-group')
    linkGroup.innerHTML = ''
    links.forEach(l => {
      const line = document.createElementNS(SVG_NS, 'line')
      line.setAttribute('stroke', 'rgba(167,139,250,0.08)')
      line.setAttribute('stroke-width', '0.6')
      linkGroup.appendChild(line)
      l.el = line
    })

    /* Tick */
    sim.on('tick', () => {
      if (cancelled) return
      nodes.forEach(n => {
        const el = elements.get(n.id)
        if (el) el.group.setAttribute('transform', `translate(${n.x},${n.y})`)
      })
      links.forEach(l => {
        if (l.el && l.source && l.target) {
          l.el.setAttribute('x1', l.source.x)
          l.el.setAttribute('y1', l.source.y)
          l.el.setAttribute('x2', l.target.x)
          l.el.setAttribute('y2', l.target.y)
        }
      })
    })

    simRef.current = sim

    /* start floating animation only after simulation settles */
    setTimeout(() => {
      if (cancelled) return
      // apply CSS-driven gentle bob per bubble
      g.querySelectorAll('g[data-id]').forEach(el => {
        const idx = Array.from(el.parentNode.children).indexOf(el)
        const delay = (idx * 0.07) % 3
        const duration = 3 + (idx % 5) * 0.4
        el.style.animation = `bpmFloat ${duration}s ease-in-out ${delay}s infinite`
      })

      g.querySelectorAll('circle[filter]').forEach(el => {
        el.style.display = 'none' // hide highlight circles, we use CSS hover on group
      })
    }, 2000)

    return () => {
      cancelled = true
      sim.stop()
      simRef.current = null
    }
  }, [clients, width, height, onClientClick])

  /* ————— Re-run filter visibility ————— */
  useEffect(() => {
    const g = svgRef.current?.querySelector('.bubbles-group')
    if (!g) return
    const currentFiltered = filtered()
    const ids = new Set(currentFiltered.map(c => c.id))
    g.querySelectorAll('g[data-id]').forEach(el => {
      el.style.display = ids.has(el.getAttribute('data-id')) ? null : 'none'
    })
  }, [filter, filtered])

  /* ————— Tooltip move tracking ————— */
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const move = (e) => {
      const tip = tooltipRef.current
      if (!tip || tip.style.opacity === '0') return
      const svgRect = svg.getBoundingClientRect()
      let tx = e.clientX - svgRect.left + 16
      let ty = e.clientY - svgRect.top - 10
      if (tx + 200 > width) tx = e.clientX - svgRect.left - 210
      if (ty < 0) ty = 10
      if (ty + 100 > height) ty = height - 110
      tip.style.left = tx + 'px'
      tip.style.top = ty + 'px'
    }
    svg.addEventListener('mousemove', move)
    return () => svg.removeEventListener('mousemove', move)
  }, [width, height])

  if (!clients || clients.length === 0) {
    return (
      <div style={{ width, height, display:'flex', alignItems:'center', justifyContent:'center', color:'#6b7280', fontSize:16 }}>
        Aucun client à afficher
      </div>
    )
  }

  return (
    <div style={{ position:'relative', width, height, fontFamily:'system-ui,-apple-system,sans-serif' }}>
      {/* Filter pills */}
      <div style={{
        position:'absolute', top:12, left:'50%', transform:'translateX(-50%)',
        display:'flex', gap:8, zIndex:20,
      }}>
        {[
          { key:'all', label:'Tous' },
          { key:'at_risk', label:'À risque' },
          { key:'opportunity', label:'Opportunités' },
          { key:'renewal', label:'Échéance proche' },
        ].map(p => (
          <button key={p.key} onClick={() => setFilter(p.key)} style={{
            background: filter === p.key ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.08)',
            border: filter === p.key ? '1px solid rgba(139,92,246,0.5)' : '1px solid rgba(255,255,255,0.12)',
            borderRadius: 20, padding: '5px 16px',
            fontSize: 13, fontWeight: filter === p.key ? 600 : 400,
            color: filter === p.key ? '#c4b5fd' : '#9ca3af',
            cursor:'pointer', backdropFilter:'blur(6px)',
            transition:'all 0.2s',
          }}
          onMouseEnter={e => { e.target.style.background = 'rgba(139,92,246,0.15)' }}
          onMouseLeave={e => { e.target.style.background = filter === p.key ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.08)' }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* SVG canvas */}
      <svg ref={svgRef} width={width} height={height} style={{ display:'block', background:'transparent' }}>
        <defs>
          <filter id="bpm-glow"><feGaussianBlur stdDeviation="2" /></filter>
          {Object.entries(GRAD_DEFS).map(([key]) => (
            <radialGradient key={key} id={`bpm-grad-${key}`} cx="32%" cy="22%" r="85%">
              {GRAD_DEFS[key].map((s, i) => (
                <stop key={i} offset={`${s.offset}%`} stopColor={s.color} />
              ))}
            </radialGradient>
          ))}
        </defs>
        <g className="links-group" />
        <g className="bubbles-group" />
      </svg>

      {/* Tooltip */}
      <div ref={tooltipRef} style={{
        position:'absolute', left:0, top:0, opacity:0, pointerEvents:'none',
        background:'rgba(15,15,25,0.88)', backdropFilter:'blur(12px)',
        border:'1px solid rgba(167,139,250,0.3)', borderRadius:10,
        padding:'10px 14px', color:'#e2e8f0', fontSize:13,
        transition:'opacity 0.15s', zIndex:30,
        minWidth:180, boxShadow:'0 4px 20px rgba(0,0,0,0.35)',
      }} />

      {/* Animations */}
      <style>{`
        @keyframes bpmFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }
        .bubbles-group g[data-id]:hover circle:first-child {
          filter: brightness(1.15);
          transition: filter 0.2s;
        }
      `}</style>
    </div>
  )
}

/* ── tiny helper to require d3-force synchronously ── */
function require_force() {
  return {
    forceSimulation:   window?.d3ForceSimulation || defaultSim,
    forceCenter:       window?.d3ForceCenter || defaultCenter,
    forceCollide:      window?.d3ForceCollide || defaultCollide,
    forceManyBody:     window?.d3ForceManyBody || defaultManyBody,
    forceLink:         window?.d3ForceLink || defaultLink,
  }
}

/* ── fallback: use dynamic import + poll for react-ref lifecycle ── */
import('d3-force').then(mod => {
  window.d3ForceSimulation = mod.forceSimulation
  window.d3ForceCenter = mod.forceCenter
  window.d3ForceCollide = mod.forceCollide
  window.d3ForceManyBody = mod.forceManyBody
  window.d3ForceLink = mod.forceLink
}).catch(() => {})

/* pure-js fallback implementations (simple no-op that still renders) */
function defaultSim(nodes) {
  const sim = { nodes: () => nodes, force: () => sim, on: () => sim, alpha: () => sim, alphaDecay: () => sim, stop: () => {} }
  return sim
}
function defaultCenter() { return () => {} }
function defaultCollide() { return () => {} }
function defaultManyBody() { return () => {} }
function defaultLink() { return () => {} }

/* inline style helper */
function rsStyle(score) {
  if (score < 30) return 'color:#34d399'
  if (score <= 70) return 'color:#60a5fa'
  return 'color:#fb7185'
}

/* expose mock generator for external use */
export { generateMockClients }
