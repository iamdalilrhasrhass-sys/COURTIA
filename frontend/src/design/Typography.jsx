/**
 * Typography — the four signature COURTIA text components.
 *
 *   <Kicker>EYEBROW TEXT</Kicker>
 *   <Headline>Une bulle d'intelligence</Headline>
 *   <Tagline>Une bulle d'intelligence pour celui qui protège.</Tagline>
 *   <Wordmark size={64} />        →  courtia.   (with iris dot)
 */

/* ----------------------- Kicker -------------------------- */
export function Kicker({ children, color, size = 10, gap = 10, className = '', style = {}, dot = true }) {
  return (
    <span
      className={`la-bulle-kicker ${className}`}
      style={{
        fontFamily: "'JetBrains Mono', 'SF Mono', Menlo, monospace",
        fontSize: size,
        letterSpacing: '6px',
        textTransform: 'uppercase',
        color: color || 'rgba(255,255,255,0.5)',
        display: 'inline-flex',
        alignItems: 'center',
        gap,
        fontWeight: 400,
        ...style,
      }}
    >
      {dot && (
        <span
          aria-hidden
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'linear-gradient(90deg, #ff4d9d 0%, #a142f4 50%, #4285f4 100%)',
            boxShadow: '0 0 12px rgba(255, 77, 157, 0.8)',
            animation: 'la-bulle-pulse 2.4s ease-in-out infinite',
            display: 'inline-block',
          }}
        />
      )}
      {children}
    </span>
  );
}

/* ----------------------- Headline ------------------------ */
export function Headline({
  children,
  as: As = 'h1',
  size = 'xl',
  align = 'left',
  className = '',
  style = {},
  gradient = 'white',
}) {
  const sizeMap = {
    sm: 'clamp(22px, 2.4vw, 28px)',
    md: 'clamp(28px, 3.4vw, 38px)',
    lg: 'clamp(38px, 5vw, 56px)',
    xl: 'clamp(48px, 7vw, 84px)',
    xxl: 'clamp(64px, 9vw, 128px)',
  };
  const gradients = {
    white: 'linear-gradient(180deg, #ffffff 0%, rgba(255,255,255,0.7) 100%)',
    iris:  'linear-gradient(135deg, #ff80e0, #c080ff, #80a8ff, #80f0d8)',
    pink:  'linear-gradient(135deg, #ff4d9d, #a142f4)',
  };
  return (
    <As
      className={`la-bulle-headline ${className}`}
      style={{
        fontFamily: "'Fraunces', serif",
        fontStyle: 'italic',
        fontWeight: 300,
        letterSpacing: '-0.02em',
        lineHeight: 1.05,
        textAlign: align,
        fontSize: sizeMap[size] || sizeMap.xl,
        background: gradients[gradient] || gradients.white,
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        color: 'transparent',
        margin: 0,
        ...style,
      }}
    >
      {children}
    </As>
  );
}

/* ----------------------- Tagline ------------------------- */
export function Tagline({ children, size = 18, align = 'left', className = '', style = {} }) {
  return (
    <p
      className={`la-bulle-tagline ${className}`}
      style={{
        fontFamily: "'Instrument Serif', 'Fraunces', serif",
        fontStyle: 'italic',
        color: 'rgba(255,255,255,0.5)',
        fontSize: size,
        letterSpacing: '0.01em',
        margin: 0,
        textAlign: align,
        ...style,
      }}
    >
      {children}
    </p>
  );
}

/* ----------------------- Wordmark ------------------------ */
/**
 * <Wordmark size={64} /> renders "courtia." where the dot is iridescent.
 * The "i" tittle (small mark above the letter) is *not* the dot — the literal "." is the iris element.
 */
export function Wordmark({ size = 64, color = '#ffffff', className = '', style = {} }) {
  return (
    <span
      className={`la-bulle-wordmark ${className}`}
      style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontWeight: 200,
        letterSpacing: '-0.04em',
        color,
        fontSize: size,
        display: 'inline-flex',
        alignItems: 'baseline',
        lineHeight: 1,
        ...style,
      }}
    >
      courtia
      <span
        className="dot"
        style={{
          background: 'linear-gradient(90deg, #ff4d9d 0%, #a142f4 50%, #4285f4 100%)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          color: 'transparent',
          fontWeight: 500,
          marginLeft: 1,
        }}
      >
        .
      </span>
    </span>
  );
}

/* ------------------- SectionEyebrow ---------------------- */
/** Convenience wrapper: a Kicker followed by a Headline. */
export function SectionEyebrow({ kicker, title, tagline, align = 'left', headlineSize = 'lg' }) {
  return (
    <div style={{ textAlign: align, display: 'flex', flexDirection: 'column', gap: 14, alignItems: align === 'center' ? 'center' : 'flex-start' }}>
      {kicker && <Kicker>{kicker}</Kicker>}
      {title && <Headline size={headlineSize} align={align}>{title}</Headline>}
      {tagline && <Tagline align={align}>{tagline}</Tagline>}
    </div>
  );
}
