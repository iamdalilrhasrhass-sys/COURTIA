import { useId } from 'react';

/**
 * BubbleC — V2 PHOTO-REALISTE
 * Replique EXACTE du SVG de reference : 10 layers (L0..L9),
 * iridescence partielle, foam cluster 8 bulles, sparkle magique.
 *
 * Props:
 *   size      - taille en px (default 480)
 *   animated  - active les animateTransform (default true)
 *   className - classes additionnelles
 *   style     - styles inline
 *   showHalo  - affiche le halo L0 derriere (default true)
 *   breathe   - active l'animation breathe sur le svg (default true)
 */
const BREATHE_CSS = `@keyframes bubbleCBreathe{0%,100%{transform:scale(1) translateY(0);}50%{transform:scale(1.018) translateY(-4px);}}`;

export function BubbleC({
  size = 480,
  animated = true,
  className = '',
  style = {},
  showHalo = true,
  breathe = true,
  // Legacy props ignored: glow
  ...rest
}) {
  const uidRaw = useId();
  const uid = uidRaw.replace(/[^a-zA-Z0-9]/g, '');
  const id = (name) => `${name}-${uid}`;

  return (
    <div
      className={`bubble-wrap ${className}`.trim()}
      style={{
        width: size,
        height: size,
        aspectRatio: '1 / 1',
        position: 'relative',
        display: 'inline-block',
        ...style,
      }}
    >
      <style>{BREATHE_CSS}</style>
      <svg
        viewBox="0 0 600 600"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          filter: 'drop-shadow(0 30px 60px rgba(140,60,220,0.25))',
          animation: animated && breathe ? 'bubbleCBreathe 7s ease-in-out infinite' : undefined,
        }}
      >
        <defs>
          <filter id={id('b2')}><feGaussianBlur stdDeviation="2" /></filter>
          <filter id={id('b4')}><feGaussianBlur stdDeviation="4" /></filter>
          <filter id={id('b8')}><feGaussianBlur stdDeviation="8" /></filter>
          <filter id={id('b18')}><feGaussianBlur stdDeviation="18" /></filter>

          <linearGradient id={id('rimIris')} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFB0E0" />
            <stop offset="14%" stopColor="#E090FF" />
            <stop offset="28%" stopColor="#A080FF" />
            <stop offset="42%" stopColor="#80B0FF" />
            <stop offset="56%" stopColor="#80EDFF" />
            <stop offset="70%" stopColor="#A8F8C0" />
            <stop offset="84%" stopColor="#FFE890" />
            <stop offset="100%" stopColor="#FFA8D0" />
            {animated && (
              <animateTransform attributeName="gradientTransform" type="rotate" from="0 0.5 0.5" to="360 0.5 0.5" dur="30s" repeatCount="indefinite" />
            )}
          </linearGradient>

          <linearGradient id={id('rimIris2')} x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#80FFE0" stopOpacity="0.85" />
            <stop offset="25%" stopColor="#FFB0E0" stopOpacity="0.85" />
            <stop offset="50%" stopColor="#B080FF" stopOpacity="0.85" />
            <stop offset="75%" stopColor="#80C8FF" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#FFE8A0" stopOpacity="0.85" />
            {animated && (
              <animateTransform attributeName="gradientTransform" type="rotate" from="360 0.5 0.5" to="0 0.5 0.5" dur="45s" repeatCount="indefinite" />
            )}
          </linearGradient>

          <radialGradient id={id('membrane')} cx="40%" cy="38%" r="60%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
            <stop offset="55%" stopColor="#FFFFFF" stopOpacity="0.04" />
            <stop offset="85%" stopColor="#E8C0FF" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#B080FF" stopOpacity="0.22" />
          </radialGradient>

          <radialGradient id={id('patchPink')} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFB0E0" stopOpacity="0.55" />
            <stop offset="60%" stopColor="#FFB0E0" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#FFB0E0" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={id('patchPurple')} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#C080FF" stopOpacity="0.6" />
            <stop offset="60%" stopColor="#C080FF" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#C080FF" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={id('patchBlue')} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#80B0FF" stopOpacity="0.55" />
            <stop offset="60%" stopColor="#80B0FF" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#80B0FF" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={id('patchCyan')} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#80FFE8" stopOpacity="0.5" />
            <stop offset="60%" stopColor="#80FFE8" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#80FFE8" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={id('patchYellow')} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFE890" stopOpacity="0.4" />
            <stop offset="60%" stopColor="#FFE890" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#FFE890" stopOpacity="0" />
          </radialGradient>

          <radialGradient id={id('specMain')} cx="50%" cy="40%" r="55%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
            <stop offset="40%" stopColor="#FFFFFF" stopOpacity="0.65" />
            <stop offset="75%" stopColor="#FFFFFF" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={id('specSoft')} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>

          <radialGradient id={id('foamBody')} cx="40%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.5" />
            <stop offset="55%" stopColor="#FFFFFF" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#E8C0FF" stopOpacity="0.25" />
          </radialGradient>

          <linearGradient id={id('foamRim')} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFB0E0" />
            <stop offset="33%" stopColor="#B080FF" />
            <stop offset="66%" stopColor="#80D0FF" />
            <stop offset="100%" stopColor="#A0FFC0" />
            {animated && (
              <animateTransform attributeName="gradientTransform" type="rotate" from="0 0.5 0.5" to="360 0.5 0.5" dur="20s" repeatCount="indefinite" />
            )}
          </linearGradient>

          <path id={id('cPath')} d="M 477 208 A 200 200 0 1 0 477 392 L 416 357 A 130 130 0 1 1 416 243 Z" />
          <clipPath id={id('cClip')}>
            <use href={`#${id('cPath')}`} />
          </clipPath>
        </defs>

        {/* L0 : HALO IRIDESCENT DERRIERE */}
        {showHalo && (
          <g transform="translate(300,300) scale(1.18) translate(-300,-300)" filter={`url(#${id('b18')})`} opacity="0.55">
            <use href={`#${id('cPath')}`} fill={`url(#${id('rimIris')})`} />
          </g>
        )}

        {/* L1 : MEMBRANE INTERIEURE */}
        <use href={`#${id('cPath')}`} fill={`url(#${id('membrane')})`} />

        {/* L2 : PATCHES IRIDESCENTES PASTEL */}
        <g clipPath={`url(#${id('cClip')})`} style={{ mixBlendMode: 'screen' }}>
          <ellipse cx="150" cy="200" rx="90" ry="120" fill={`url(#${id('patchPink')})`} transform="rotate(-20 150 200)" />
          <ellipse cx="130" cy="310" rx="75" ry="100" fill={`url(#${id('patchPurple')})`} />
          <ellipse cx="170" cy="420" rx="85" ry="70" fill={`url(#${id('patchBlue')})`} transform="rotate(15 170 420)" />
          <ellipse cx="230" cy="470" rx="60" ry="40" fill={`url(#${id('patchCyan')})`} />
          <ellipse cx="380" cy="170" rx="50" ry="60" fill={`url(#${id('patchYellow')})`} />
        </g>

        {/* L3 : BORD EXTERIEUR */}
        <path d="M 477 208 A 200 200 0 1 0 477 392" fill="none" stroke={`url(#${id('rimIris')})`} strokeWidth="3.5" opacity="0.95" />
        <path d="M 477 208 A 200 200 0 1 0 477 392" fill="none" stroke={`url(#${id('rimIris2')})`} strokeWidth="2" opacity="0.7" style={{ mixBlendMode: 'screen' }} />
        <path d="M 477 208 A 200 200 0 1 0 477 392" fill="none" stroke="#ffffff" strokeWidth="1.2" opacity="0.85" />

        {/* L4 : BORD INTERIEUR */}
        <path d="M 416 243 A 130 130 0 1 1 416 357" fill="none" stroke={`url(#${id('rimIris2')})`} strokeWidth="3" opacity="0.9" />
        <path d="M 416 243 A 130 130 0 1 1 416 357" fill="none" stroke={`url(#${id('rimIris')})`} strokeWidth="1.5" opacity="0.6" style={{ mixBlendMode: 'screen' }} />
        <path d="M 416 243 A 130 130 0 1 1 416 357" fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.7" />

        {/* L5 : CONNECTEURS */}
        <line x1="477" y1="208" x2="416" y2="243" stroke={`url(#${id('rimIris')})`} strokeWidth="3" opacity="0.92" />
        <line x1="477" y1="208" x2="416" y2="243" stroke="#ffffff" strokeWidth="0.9" opacity="0.7" />
        <line x1="477" y1="392" x2="416" y2="357" stroke={`url(#${id('rimIris')})`} strokeWidth="3" opacity="0.92" />
        <line x1="477" y1="392" x2="416" y2="357" stroke="#ffffff" strokeWidth="0.9" opacity="0.7" />

        {/* L6 : SPECULAR HIGHLIGHTS */}
        <g clipPath={`url(#${id('cClip')})`}>
          <ellipse cx="175" cy="230" rx="62" ry="105" fill={`url(#${id('specMain')})`} transform="rotate(-22 175 230)" opacity="0.85" />
          <ellipse cx="135" cy="340" rx="28" ry="65" fill={`url(#${id('specSoft')})`} transform="rotate(-5 135 340)" opacity="0.55" />
          <ellipse cx="205" cy="440" rx="42" ry="22" fill={`url(#${id('specSoft')})`} transform="rotate(20 205 440)" opacity="0.5" />
          <ellipse cx="410" cy="270" rx="12" ry="22" fill={`url(#${id('specSoft')})`} opacity="0.4" />
          <g>
            <circle cx="148" cy="185" r="4" fill="#FFFFFF" opacity="0.95" />
            <circle cx="148" cy="185" r="11" fill="#FFFFFF" opacity="0.35" filter={`url(#${id('b2')})`} />
            <circle cx="115" cy="295" r="2.5" fill="#FFFFFF" opacity="0.9" />
            <circle cx="115" cy="295" r="7" fill="#FFFFFF" opacity="0.3" filter={`url(#${id('b2')})`} />
            <circle cx="220" cy="490" r="2" fill="#FFFFFF" opacity="0.85" />
            <circle cx="220" cy="490" r="5" fill="#FFFFFF" opacity="0.25" filter={`url(#${id('b2')})`} />
          </g>
          {/* KISS - reflet courbe sommet */}
          <path d="M 195 175 A 165 165 0 0 1 340 142" fill="none" stroke="#FFFFFF" strokeWidth="2.5" opacity="0.45" filter={`url(#${id('b2')})`} />
          <path d="M 200 178 A 155 155 0 0 1 320 152" fill="none" stroke="#FFFFFF" strokeWidth="1.2" opacity="0.85" />
        </g>

        {/* L7 : MICRO-BULLES INTERIEURES */}
        <g clipPath={`url(#${id('cClip')})`} opacity="0.85">
          <circle cx="270" cy="280" r="3.5" fill={`url(#${id('foamBody')})`} stroke={`url(#${id('foamRim')})`} strokeWidth="0.8" />
          <circle cx="200" cy="370" r="2.5" fill={`url(#${id('foamBody')})`} stroke={`url(#${id('foamRim')})`} strokeWidth="0.6" />
          <circle cx="320" cy="395" r="2" fill={`url(#${id('foamBody')})`} stroke={`url(#${id('foamRim')})`} strokeWidth="0.5" />
          <circle cx="160" cy="270" r="1.8" fill="#FFFFFF" opacity="0.6" />
          <circle cx="380" cy="330" r="1.5" fill="#FFFFFF" opacity="0.5" />
        </g>

        {/* L8 : FOAM CLUSTER 8 BULLES AGGLUTINEES */}
        <g>
          <g transform="translate(450,150)">
            <circle r="26" fill={`url(#${id('foamBody')})`} stroke={`url(#${id('foamRim')})`} strokeWidth="1.8" opacity="0.95" />
            <ellipse cx="-7" cy="-10" rx="9" ry="6" fill="#FFFFFF" opacity="0.75" transform="rotate(-30 -7 -10)" />
            <circle cx="-9" cy="-12" r="2" fill="#FFFFFF" opacity="0.95" />
            <path d="M -18 -5 A 22 22 0 0 1 -2 -22" fill="none" stroke="#FFFFFF" strokeWidth="0.8" opacity="0.6" />
          </g>
          <g transform="translate(490,118)">
            <circle r="18" fill={`url(#${id('foamBody')})`} stroke={`url(#${id('foamRim')})`} strokeWidth="1.4" opacity="0.92" />
            <ellipse cx="-5" cy="-7" rx="6" ry="4" fill="#FFFFFF" opacity="0.7" transform="rotate(-30 -5 -7)" />
            <circle cx="-6" cy="-8" r="1.5" fill="#FFFFFF" opacity="0.9" />
          </g>
          <g transform="translate(420,118)">
            <circle r="14" fill={`url(#${id('foamBody')})`} stroke={`url(#${id('foamRim')})`} strokeWidth="1.2" opacity="0.9" />
            <ellipse cx="-4" cy="-5" rx="4.5" ry="3" fill="#FFFFFF" opacity="0.65" transform="rotate(-30 -4 -5)" />
            <circle cx="-5" cy="-6" r="1.2" fill="#FFFFFF" opacity="0.85" />
          </g>
          <g transform="translate(510,165)">
            <circle r="11" fill={`url(#${id('foamBody')})`} stroke={`url(#${id('foamRim')})`} strokeWidth="1" opacity="0.88" />
            <ellipse cx="-3" cy="-4" rx="3.5" ry="2.5" fill="#FFFFFF" opacity="0.6" transform="rotate(-30 -3 -4)" />
            <circle cx="-3.5" cy="-4.5" r="1" fill="#FFFFFF" opacity="0.8" />
          </g>
          <g transform="translate(460,95)">
            <circle r="9" fill={`url(#${id('foamBody')})`} stroke={`url(#${id('foamRim')})`} strokeWidth="0.9" opacity="0.85" />
            <ellipse cx="-2.5" cy="-3" rx="3" ry="2" fill="#FFFFFF" opacity="0.55" transform="rotate(-30 -2.5 -3)" />
            <circle cx="-3" cy="-3.5" r="0.8" fill="#FFFFFF" opacity="0.75" />
          </g>
          <g transform="translate(395,142)">
            <circle r="7" fill={`url(#${id('foamBody')})`} stroke={`url(#${id('foamRim')})`} strokeWidth="0.8" opacity="0.82" />
            <ellipse cx="-2" cy="-2.5" rx="2.5" ry="1.5" fill="#FFFFFF" opacity="0.55" />
          </g>
          <g transform="translate(530,135)">
            <circle r="5" fill={`url(#${id('foamBody')})`} stroke={`url(#${id('foamRim')})`} strokeWidth="0.7" opacity="0.78" />
            <circle cx="-1.5" cy="-2" r="1" fill="#FFFFFF" opacity="0.6" />
          </g>
          <g transform="translate(508,90)">
            <circle r="3" fill={`url(#${id('foamBody')})`} stroke="#FFFFFF" strokeWidth="0.5" opacity="0.7" />
          </g>
        </g>

        {/* L9 : ETINCELLE FINALE MAGIQUE */}
        <g>
          <circle cx="455" cy="142" r="2.5" fill="#FFFFFF" opacity="1" />
          <circle cx="455" cy="142" r="8" fill="#FFFFFF" opacity="0.35" filter={`url(#${id('b4')})`} />
          <circle cx="455" cy="142" r="16" fill="#FFB0E0" opacity="0.18" filter={`url(#${id('b8')})`} />
        </g>
      </svg>
    </div>
  );
}

// Tailles preglees - alias maintenus pour compat (sidebar, footer, cards...)
export const BubbleCMini = (props) => (
  <BubbleC size={40} animated={false} showHalo={false} {...props} />
);
export const BubbleCSmall = (props) => (
  <BubbleC size={60} animated={false} showHalo={false} {...props} />
);
export const BubbleCMedium = (props) => <BubbleC size={120} {...props} />;
export const BubbleCHero = (props) => <BubbleC size={480} {...props} />;

export default BubbleC;
