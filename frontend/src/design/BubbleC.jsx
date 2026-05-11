import { useId } from 'react';

/**
 * BubbleC — the iconic iridescent "C" bubble of COURTIA.
 * SVG aligned with the reference (clipPath C 473/200, animated iris gradients,
 * liquid-film displacement filter, foam bubbles, rim light).
 *
 * Props:
 *   size      — total px width/height (default 520)
 *   animated  — enable iris rotation + foam (default true)
 *   className — extra classes for the wrapper
 */
export function BubbleC({
  size = 520,
  animated = true,
  className = '',
  style = {},
  glow = true,
}) {
  // useId guarantees unique gradient/filter ids per instance (multiple bubbles per page).
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const id = (name) => `bc-${name}-${uid}`;

  return (
    <div
      className={`la-bulle-c ${className}`}
      style={{
        position: 'relative',
        width: size,
        height: size,
        display: 'inline-block',
        ...style,
      }}
    >
      {/* Soft outer glow */}
      {glow && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: '-12%',
            background:
              'radial-gradient(circle, rgba(192,128,255,0.45) 0%, rgba(255,128,224,0.2) 35%, transparent 70%)',
            filter: 'blur(40px)',
            animation: animated ? 'la-bulle-breathe 5s ease-in-out infinite' : undefined,
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
      )}

      <svg
        viewBox="0 0 700 600"
        width={size}
        height={size}
        style={{
          display: 'block',
          position: 'relative',
          zIndex: 1,
          animation: animated ? 'la-bulle-breathe 6s ease-in-out infinite' : undefined,
        }}
      >
        <defs>
          {/* Three animated iridescent gradients, rotating at different speeds */}
          <linearGradient id={id('iris1')} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#ff80e0" />
            <stop offset="25%"  stopColor="#c080ff" />
            <stop offset="50%"  stopColor="#80a8ff" />
            <stop offset="75%"  stopColor="#80f0d8" />
            <stop offset="100%" stopColor="#fff080" />
            {animated && (
              <animateTransform
                attributeName="gradientTransform"
                type="rotate"
                from="0 350 300"
                to="360 350 300"
                dur="20s"
                repeatCount="indefinite"
              />
            )}
          </linearGradient>

          <linearGradient id={id('iris2')} x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#fff080" stopOpacity="0.8" />
            <stop offset="25%"  stopColor="#ff80b0" stopOpacity="0.8" />
            <stop offset="50%"  stopColor="#ff80e0" stopOpacity="0.8" />
            <stop offset="75%"  stopColor="#c080ff" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#80a8ff" stopOpacity="0.8" />
            {animated && (
              <animateTransform
                attributeName="gradientTransform"
                type="rotate"
                from="360 350 300"
                to="0 350 300"
                dur="28s"
                repeatCount="indefinite"
              />
            )}
          </linearGradient>

          <linearGradient id={id('iris3')} x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%"   stopColor="#80f0d8" stopOpacity="0.6" />
            <stop offset="33%"  stopColor="#80a8ff" stopOpacity="0.6" />
            <stop offset="66%"  stopColor="#c080ff" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#ff80b0" stopOpacity="0.6" />
            {animated && (
              <animateTransform
                attributeName="gradientTransform"
                type="rotate"
                from="0 350 300"
                to="360 350 300"
                dur="35s"
                repeatCount="indefinite"
              />
            )}
          </linearGradient>

          {/* Liquid-film displacement filter (the wet glass feeling) */}
          <filter id={id('liquid')} x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="2" seed="3" result="noise">
              {animated && (
                <animate attributeName="baseFrequency" values="0.012;0.02;0.012" dur="14s" repeatCount="indefinite" />
              )}
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="8" />
          </filter>

          {/* C-shape clip — matches the reference exactly */}
          <clipPath id={id('cclip')}>
            <path d="M 473 200 A 200 200 0 1 0 473 400 L 413 365 A 130 130 0 1 1 413 235 Z" />
          </clipPath>

          {/* Inner rim mask: lighter top arc */}
          <radialGradient id={id('rim')} cx="50%" cy="50%" r="50%">
            <stop offset="80%" stopColor="rgba(255,255,255,0)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.55)" />
          </radialGradient>
        </defs>

        {/* Base C — iris1 layer */}
        <g clipPath={`url(#${id('cclip')})`} filter={`url(#${id('liquid')})`}>
          <rect x="0" y="0" width="700" height="600" fill={`url(#${id('iris1')})`} />

          {/* iris2 blended on top */}
          <rect x="0" y="0" width="700" height="600" fill={`url(#${id('iris2')})`} style={{ mixBlendMode: 'screen' }} />

          {/* iris3 soft overlay */}
          <rect x="0" y="0" width="700" height="600" fill={`url(#${id('iris3')})`} style={{ mixBlendMode: 'overlay' }} />

          {/* Specular highlight — top-left ellipse */}
          <ellipse cx="320" cy="220" rx="80" ry="30" fill="rgba(255,255,255,0.55)" style={{ filter: 'blur(6px)' }} />
          <ellipse cx="300" cy="240" rx="40" ry="14" fill="rgba(255,255,255,0.85)" style={{ filter: 'blur(2px)' }} />

          {/* Foam bubbles at the top — tiny white circles */}
          <g opacity="0.85">
            <circle cx="340" cy="195" r="6"  fill="rgba(255,255,255,0.9)" />
            <circle cx="360" cy="188" r="4"  fill="rgba(255,255,255,0.7)" />
            <circle cx="378" cy="195" r="3"  fill="rgba(255,255,255,0.6)" />
            <circle cx="395" cy="192" r="5"  fill="rgba(255,255,255,0.85)" />
            <circle cx="414" cy="186" r="3"  fill="rgba(255,255,255,0.6)" />
            <circle cx="430" cy="194" r="4"  fill="rgba(255,255,255,0.75)" />
            <circle cx="448" cy="200" r="2.5" fill="rgba(255,255,255,0.55)" />
            {animated && (
              <animateTransform
                attributeName="transform"
                type="translate"
                values="0 0; 0 -3; 0 0"
                dur="4s"
                repeatCount="indefinite"
              />
            )}
          </g>

          {/* Lower specular sheen */}
          <ellipse cx="380" cy="430" rx="120" ry="22" fill="rgba(255,255,255,0.25)" style={{ filter: 'blur(8px)' }} />
        </g>

        {/* Rim light — outer C edge */}
        <path
          d="M 473 200 A 200 200 0 1 0 473 400 L 413 365 A 130 130 0 1 1 413 235 Z"
          fill="none"
          stroke="rgba(255,255,255,0.65)"
          strokeWidth="1.5"
          style={{ filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.4))' }}
        />

        {/* Inner rim highlight */}
        <path
          d="M 413 235 A 130 130 0 1 0 413 365"
          fill="none"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="1"
        />
      </svg>
    </div>
  );
}

/* Convenience presets */
export const BubbleCMini   = (props) => <BubbleC size={60}  glow={false} {...props} />;
export const BubbleCSmall  = (props) => <BubbleC size={90}  {...props} />;
export const BubbleCMedium = (props) => <BubbleC size={180} {...props} />;
export const BubbleCHero   = (props) => <BubbleC size={520} {...props} />;

export default BubbleC;
