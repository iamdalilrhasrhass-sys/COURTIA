export default function RiskScoreBadge({ score }) {
  if (score === null || score === undefined) {
    return (
      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: '#f3f4f6', color: '#6b7280' }}>
        N/A
      </span>
    )
  }
  const s = Number(score)
  let bg, color, label
  if (s >= 70) {
    bg = '#fee2e2'; color = '#dc2626'; label = 'Risque élevé'
  } else if (s >= 40) {
    bg = '#fed7aa'; color = '#c2410c'; label = 'Risque modéré'
  } else {
    bg = '#dcfce7'; color = '#166534'; label = 'Risque faible'
  }
  return (
    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: bg, color, whiteSpace: 'nowrap' }}>
      {s}/100 · {label}
    </span>
  )
}
