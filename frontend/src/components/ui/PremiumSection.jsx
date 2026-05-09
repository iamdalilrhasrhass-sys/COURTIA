import ScrollReveal3D from './ScrollReveal3D'

export default function PremiumSection({ eyebrow, title, description, children, className = '' }) {
  return (
    <ScrollReveal3D as="section" className={`courtia-premium-section ${className}`.trim()}>
      {(eyebrow || title || description) && (
        <header className="courtia-premium-section__header">
          {eyebrow && <span className="courtia-premium-section__eyebrow">{eyebrow}</span>}
          {title && <h2>{title}</h2>}
          {description && <p>{description}</p>}
        </header>
      )}
      {children}
    </ScrollReveal3D>
  )
}
