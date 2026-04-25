import React from 'react';

const BUBBLE_COUNT = {
  subtle: 3,
  normal: 5,
  rich: 8,
};

const BUBBLE_CONFIGS = [
  { size: 300, x: '15%', y: '10%', color: 'rgba(37,99,235,0.12)', blur: 80, delay: 0, dur: 18 },
  { size: 200, x: '70%', y: '20%', color: 'rgba(124,58,237,0.10)', blur: 60, delay: 1, dur: 22 },
  { size: 250, x: '80%', y: '60%', color: 'rgba(236,72,153,0.10)', blur: 70, delay: 0.5, dur: 20 },
  { size: 180, x: '25%', y: '70%', color: 'rgba(16,185,129,0.10)', blur: 55, delay: 2, dur: 25 },
  { size: 220, x: '50%', y: '40%', color: 'rgba(245,158,11,0.08)', blur: 65, delay: 1.5, dur: 19 },
  { size: 160, x: '10%', y: '45%', color: 'rgba(37,99,235,0.08)', blur: 50, delay: 3, dur: 21 },
  { size: 280, x: '60%', y: '10%', color: 'rgba(124,58,237,0.08)', blur: 75, delay: 0.8, dur: 23 },
  { size: 190, x: '35%', y: '85%', color: 'rgba(236,72,153,0.08)', blur: 55, delay: 2.5, dur: 17 },
];

const BubbleBackground = ({ intensity = 'normal' }) => {
  const count = BUBBLE_COUNT[intensity] || BUBBLE_COUNT.normal;
  const bubbles = BUBBLE_CONFIGS.slice(0, count);

  const keyframesStyle = `
@keyframes bubble-float-up {
  0% { transform: translateY(0px) scale(1); }
  25% { transform: translateY(-20px) scale(1.02); }
  50% { transform: translateY(10px) scale(0.98); }
  75% { transform: translateY(-10px) scale(1.01); }
  100% { transform: translateY(0px) scale(1); }
}
@keyframes bubble-float-drift {
  0% { transform: translate(0, 0); }
  33% { transform: translate(15px, -10px); }
  66% { transform: translate(-10px, 5px); }
  100% { transform: translate(0, 0); }
}
`;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      pointerEvents: 'none',
      zIndex: 0,
    }}>
      <style>{keyframesStyle}</style>

      {/* Radial gradient background */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: `
          radial-gradient(ellipse 80% 60% at 15% 10%, rgba(37,99,235,0.08) 0%, transparent 60%),
          radial-gradient(ellipse 60% 50% at 80% 20%, rgba(124,58,237,0.06) 0%, transparent 50%),
          radial-gradient(ellipse 70% 55% at 70% 70%, rgba(236,72,153,0.06) 0%, transparent 55%),
          radial-gradient(ellipse 50% 45% at 25% 75%, rgba(16,185,129,0.05) 0%, transparent 45%),
          radial-gradient(ellipse 40% 35% at 50% 50%, rgba(245,158,11,0.04) 0%, transparent 35%)
        `,
      }} />

      {/* Floating bubbles */}
      {bubbles.map((b, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: b.size,
            height: b.size,
            left: b.x,
            top: b.y,
            borderRadius: '50%',
            background: b.color,
            filter: `blur(${b.blur}px)`,
            animation: `
              bubble-float-up ${b.dur}s ease-in-out ${b.delay}s infinite,
              bubble-float-drift ${b.dur * 1.3}s ease-in-out ${b.delay}s infinite
            `,
          }}
        />
      ))}

      {/* Children can be rendered on top, but we don't render children here —
          this is just a background layer. Use a wrapper if overlaying content. */}
    </div>
  );
};

export default BubbleBackground;
