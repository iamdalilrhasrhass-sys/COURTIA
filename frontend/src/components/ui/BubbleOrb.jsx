export default function BubbleOrb({ className = '', tone = 'violet', size = 220, style = {} }) {
  return (
    <span
      aria-hidden="true"
      className={`courtia-bubble-orb courtia-bubble-orb--${tone} ${className}`.trim()}
      style={{ width: size, height: size, ...style }}
    />
  )
}
