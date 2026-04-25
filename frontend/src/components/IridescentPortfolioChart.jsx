import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const DEFAULT_DATA = [
  { label: 'Jan', value: 31200 },
  { label: 'Fév', value: 33800 },
  { label: 'Mar', value: 32100 },
  { label: 'Avr', value: 36500 },
  { label: 'Mai', value: 35200 },
  { label: 'Juin', value: 38900 },
  { label: 'Juil', value: 37400 },
  { label: 'Août', value: 40100 },
  { label: 'Sep', value: 41800 },
  { label: 'Oct', value: 43200 },
  { label: 'Nov', value: 44500 },
  { label: 'Déc', value: 45338 },
]

function getBubbleSize(value, data) {
  const vals = data.map((d) => d.value)
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  if (max === min) return 22
  return 18 + ((value - min) / (max - min)) * 8
}

function CustomCursor(props) {
  const { points, height } = props
  if (!points || !points.length) return null
  const x = points[0].x
  return (
    <line
      x1={x}
      y1={0}
      x2={x}
      y2={height}
      stroke="#8b5cf6"
      strokeWidth={1}
      strokeDasharray="4 4"
      opacity={0.7}
    />
  )
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null
  const val = payload[0].value
  const pct = val > 0 ? `+${((val / 30000) * 100 - 100).toFixed(0)}%` : '0%'
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.95)',
        border: '0.5px solid rgba(0,0,0,0.1)',
        borderRadius: 8,
        padding: '8px 14px',
        fontSize: 13,
        fontWeight: 600,
        fontFamily: 'Arial, sans-serif',
        color: '#1e293b',
        whiteSpace: 'nowrap',
        boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
      }}
    >
      {label} :{' '}
      <span style={{ color: '#8b5cf6' }}>{pct}</span>{' '}
      Revenu mensuel
    </div>
  )
}

const DOT_ANIM_NAMES = ['dotFloat0', 'dotFloat1', 'dotFloat2']

function IridescentPortfolioChart({ data }) {
  const chartData = data && data.length ? data : DEFAULT_DATA
  const bubbleSizes = chartData.map((d) => getBubbleSize(d.value, chartData))

  function renderBubbleDot(props) {
    const { cx, cy, index } = props
    if (cx == null || cy == null) return null
    const r = bubbleSizes[index] / 2
    const animName = DOT_ANIM_NAMES[index % 3]
    const duration = 4 + (index % 3) * 0.8
    return (
      <g
        style={{
          animation: `${animName} ${duration}s ease-in-out infinite`,
          transformOrigin: `${cx}px ${cy}px`,
        }}
      >
        <circle cx={cx} cy={cy} r={r} fill="url(#dotGrad)" />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="url(#dotIris)"
          opacity={0.28}
          style={{ mixBlendMode: 'screen' }}
        />
        <ellipse
          cx={cx - r * 0.28}
          cy={cy - r * 0.28}
          rx={r * 0.3}
          ry={r * 0.2}
          fill="rgba(255,255,255,0.75)"
          transform={`rotate(-15 ${cx - r * 0.28} ${cy - r * 0.28})`}
        />
      </g>
    )
  }

  return (
    <div style={{ width: '100%', maxWidth: '100%', overflow: 'visible' }}>
      <style>{`
        @keyframes dotFloat0 { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-3px) } }
        @keyframes dotFloat1 { 0%,100% { transform: translateY(-1px) } 50% { transform: translateY(3px) } }
        @keyframes dotFloat2 { 0%,100% { transform: translateY(0.5px) } 55% { transform: translateY(-2.5px) } }
      `}</style>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart
          data={chartData}
          margin={{ top: 20, right: 16, bottom: 4, left: 0 }}
          cursor={<CustomCursor />}
        >
          <defs>
            <linearGradient id="irisCurve" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(147,197,253,0.20)" />
              <stop offset="22%" stopColor="rgba(196,181,253,0.25)" />
              <stop offset="45%" stopColor="rgba(167,243,208,0.18)" />
              <stop offset="68%" stopColor="rgba(253,186,116,0.20)" />
              <stop offset="100%" stopColor="rgba(236,72,153,0.22)" />
            </linearGradient>
            <linearGradient id="curveDepth" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,0.35)" />
              <stop offset="60%" stopColor="rgba(255,255,255,0.08)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
            <radialGradient id="dotGrad" cx="35%" cy="28%" r="80%">
              <stop offset="0%" stopColor="rgba(255,255,255,1)" />
              <stop offset="18%" stopColor="rgba(255,255,255,0.88)" />
              <stop offset="38%" stopColor="rgba(232,247,255,0.72)" />
              <stop offset="60%" stopColor="rgba(186,230,253,0.55)" />
              <stop offset="82%" stopColor="rgba(167,139,250,0.6)" />
              <stop offset="100%" stopColor="rgba(124,58,237,0.7)" />
            </radialGradient>
            <radialGradient id="dotIris" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(196,181,253,0.5)" />
              <stop offset="50%" stopColor="rgba(167,243,208,0.35)" />
              <stop offset="100%" stopColor="rgba(236,72,153,0.4)" />
            </radialGradient>
          </defs>
          <CartesianGrid
            vertical={false}
            stroke="rgba(0,0,0,0.04)"
            strokeDasharray="3 3"
          />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={{ stroke: 'rgba(0,0,0,0.1)', strokeWidth: 0.5 }}
            tick={{
              fontSize: 11,
              fontFamily: 'Arial, sans-serif',
              fill: 'rgba(0,0,0,0.4)',
            }}
            interval={0}
          />
          <YAxis hide domain={['dataMin - 2000', 'dataMax + 2000']} />
          <Tooltip
            content={<CustomTooltip />}
            cursor={false}
            offset={8}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#8b5cf6"
            strokeWidth={2.5}
            fill="url(#irisCurve)"
            strokeLinecap="round"
            dot={renderBubbleDot}
            activeDot={false}
          />
          <Area
            type="monotone"
            dataKey="value"
            fill="url(#curveDepth)"
            stroke="none"
            dot={false}
            activeDot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export default IridescentPortfolioChart
