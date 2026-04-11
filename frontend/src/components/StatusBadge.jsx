export default function StatusBadge({ status }) {
  const s = (status || '').toLowerCase().trim()
  let bg, color, label
  if (s === 'actif') {
    bg = '#dcfce7'; color = '#166534'; label = 'Actif'
  } else if (s === 'prospect') {
    bg = '#dbeafe'; color = '#1d4ed8'; label = 'Prospect'
  } else if (s === 'résilié' || s === 'resilié' || s === 'resilié') {
    bg = '#fee2e2'; color = '#dc2626'; label = 'Résilié'
  } else if (s === 'perdu') {
    bg = '#fee2e2'; color = '#dc2626'; label = 'Perdu'
  } else {
    bg = '#f3f4f6'; color = '#6b7280'; label = status || 'Inactif'
  }
  return (
    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: bg, color, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  )
}
