import AnimatedNumber from './AnimatedNumber'

export default function AnimatedMetric({ label, value, suffix = '', hint }) {
  return (
    <div className="courtia-animated-metric courtia-depth-card">
      <span>{label}</span>
      <strong><AnimatedNumber value={Number(value) || 0} />{suffix}</strong>
      {hint && <small>{hint}</small>}
    </div>
  )
}
