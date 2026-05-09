export default function PremiumModal({ open, title, children, onClose, footer }) {
  if (!open) return null
  return (
    <div className="courtia-premium-modal" role="dialog" aria-modal="true" aria-label={title || 'Modal COURTIA'}>
      <button className="courtia-premium-modal__backdrop" type="button" aria-label="Fermer" onClick={onClose} />
      <div className="courtia-premium-modal__panel courtia-depth-card">
        <header>
          <h2>{title}</h2>
          <button type="button" onClick={onClose} aria-label="Fermer">×</button>
        </header>
        <div>{children}</div>
        {footer && <footer>{footer}</footer>}
      </div>
    </div>
  )
}
