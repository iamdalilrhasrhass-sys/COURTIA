import React from 'react';

const SIZE_MAP = {
  sm: { container: { padding: '2px 8px', fontSize: 11, gap: 4 }, dot: 6 },
  md: { container: { padding: '4px 12px', fontSize: 12, gap: 6 }, dot: 8 },
};

const BubbleBadge = ({ color = '#10b981', size = 'sm', pulse = false, children }) => {
  const dims = SIZE_MAP[size] || SIZE_MAP.sm;

  const keyframesStyle = pulse ? `
@keyframes badge-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(0.85); }
}
` : '';

  return (
    <>
      <style>{keyframesStyle}</style>
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: dims.container.gap,
        padding: dims.container.padding,
        fontSize: dims.container.fontSize,
        fontWeight: 500,
        lineHeight: 1.4,
        borderRadius: 9999,
        border: '0.5px solid rgba(0,0,0,0.06)',
        background: `${color}15`,
        color: color,
        fontFamily: 'var(--font-sans, Arial, Helvetica, sans-serif)',
      }}>
        <span style={{
          display: 'inline-block',
          width: dims.dot,
          height: dims.dot,
          borderRadius: '50%',
          backgroundColor: color,
          animation: pulse ? 'badge-pulse 1.5s ease-in-out infinite' : 'none',
        }} />
        {children}
      </span>
    </>
  );
};

export default BubbleBadge;
