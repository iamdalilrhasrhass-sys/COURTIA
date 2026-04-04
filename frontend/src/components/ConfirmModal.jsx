export default function ConfirmModal({ message, onConfirm, onCancel, isDanger = false }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'white', padding: 32, borderRadius: 12, maxWidth: 400 }}>
        <p style={{ marginBottom: 24, fontSize: 14, color: '#333' }}>{message}</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{ padding: '8px 16px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Annuler</button>
          <button onClick={onConfirm} style={{ padding: '8px 16px', background: isDanger ? '#ef4444' : '#0a0a0a', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            {isDanger ? 'Supprimer' : 'Confirmer'}
          </button>
        </div>
      </div>
    </div>
  )
}
