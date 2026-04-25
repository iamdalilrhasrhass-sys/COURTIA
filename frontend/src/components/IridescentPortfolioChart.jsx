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

  function FloatingBubble(props) {
    const { cx, cy, index } = props
    if (cx == null || cy == null) return null
    const r = bubbleSizes[index] / 2
    const animName = DOT_ANIM_NAMES[index % 3]
    const duration = 4 + (index % 3) * 0.8
    const size = r * 2 + 4
    return (
      <g
        style={{
          animation: `${animName} ${duration}s ease-in-out infinite`,
          transformOrigin: `${cx}px ${cy}px`,
        }}
      >
        <foreignObject
          x={cx - r - 2}
          y={cy - r - 2}
          width={size}
          height={size}
        >
          <div
            xmlns="http://www.w3.org/1999/xhtml"
            style={{
              width: size,
              height: size,
              borderRadius: '50%',
              backdropFilter: 'blur(4px) saturate(180%)',
              WebkitBackdropFilter: 'blur(4px) saturate(180%)',
              background:
                'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.25), transparent)',
              border: '0.5px solid rgba(255,255,255,0.4)',
            }}
          />
        </foreignObject>
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
            <radialGradient
              id="bubbleFlowFill"
              cx="50%"
              cy="0%"
              r="120%"
              fx="50%"
              fy="0%"
            >
              <stop offset="0%" stopColor="rgba(37,99,235,0.40)" />
              <stop offset="35%" stopColor="rgba(139,92,246,0.20)" />
              <stop offset="70%" stopColor="rgba(37,99,235,0.08)" />
              <stop offset="100%" stopColor="rgba(37,99,235,0.02)" />
            </radialGradient>
            <filter
              id="blueGlow"
              x="-20%"
              y="-20%"
              width="140%"
              height="140%"
            >
              <feDropShadow
                dx="0"
                dy="0"
                stdDeviation="4"
                flood-color="rgba(37,99,235,0.35)"
              />
            </filter>
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
            stroke="#2563eb"
            strokeWidth={2.5}
            fill="url(#bubbleFlowFill)"
            strokeLinecap="round"
            filter="url(#blueGlow)"
            dot={FloatingBubble}
            activeDot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export default IridescentPortfolioChart
