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
  if (s <= 30) {
    bg = '#fee2e2'; color = '#dc2626'; label = 'Risque élevé'
  } else if (s <= 60) {
    bg = '#fed7aa'; color = '#c2410c'; label = 'Risque modéré'
  } else if (s <= 80) {
    bg = '#dbeafe'; color = '#1d4ed8'; label = 'Risque faible'
  } else {
    bg = '#dcfce7'; color = '#166534'; label = 'Excellent'
  }
  return (
    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: bg, color, whiteSpace: 'nowrap' }}>
      {s}/100 · {label}
    </span>
  )
}
