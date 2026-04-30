import AuroraBadge from './AuroraBadge'

export default function SectionEyebrow({ badge, title, subtitle, dark = false }) {
  return (
    <div className={`text-center max-w-2xl mx-auto mb-12 lg:mb-16 ${dark ? 'text-white' : 'text-gray-900'}`}>
      {badge && <AuroraBadge>{badge}</AuroraBadge>}
      <h2
        className={`text-3xl lg:text-4xl font-black tracking-tight leading-tight ${dark ? '' : 'text-gray-900'}`}
        style={dark ? {
          background: 'linear-gradient(115deg, rgba(255,255,255,0.98), rgba(235,240,255,0.94), rgba(175,169,236,0.88), rgba(235,240,255,0.94), rgba(255,255,255,0.98))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        } : {}}
      >
        {title}
      </h2>
      {subtitle && (
        <p className={`mt-4 text-base lg:text-lg leading-relaxed ${dark ? 'text-white/60' : 'text-gray-500'}`}>
          {subtitle}
        </p>
      )}
    </div>
  )
}
