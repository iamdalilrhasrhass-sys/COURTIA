export default function FloatingActionBadge({ children, tone = 'cyan', className = '' }) {
  return <span className={`courtia-floating-action-badge courtia-floating-action-badge--${tone} ${className}`.trim()}>{children}</span>
}
