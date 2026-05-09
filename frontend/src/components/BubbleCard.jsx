import React, { useState } from 'react';

const BubbleCard = ({ children, hover = true, padding = 20, style, className, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = (event) => {
    if (!hover) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const dx = (event.clientX - rect.left) / rect.width - 0.5;
    const dy = (event.clientY - rect.top) / rect.height - 0.5;
    setTilt({
      x: Number((-dy * 2.2).toFixed(2)),
      y: Number((dx * 2.2).toFixed(2)),
    });
  };

  const baseStyle = {
    background: `
      linear-gradient(150deg, rgba(255,255,255,0.90), rgba(255,255,255,0.78)),
      radial-gradient(circle at 16% 12%, rgba(124,58,237,0.10), transparent 34%),
      radial-gradient(circle at 86% 8%, rgba(34,211,238,0.09), transparent 34%)
    `,
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: 'var(--r-lg, 16px)',
    border: '0.5px solid rgba(255,255,255,0.62)',
    boxShadow: isHovered && hover
      ? 'var(--shadow-bubble-pop, 0 4px 8px rgba(0,0,0,0.05), 0 24px 58px rgba(15,23,42,0.16), 0 0 42px rgba(124,58,237,0.10))'
      : 'var(--shadow-bubble, 0 1px 2px rgba(0,0,0,0.03), 0 12px 30px rgba(15,23,42,0.10), 0 0 22px rgba(34,211,238,0.04))',
    padding: `${padding}px`,
    transition: 'box-shadow 0.3s ease, transform 0.28s ease, border-color 0.28s ease',
    transform: `perspective(1400px) translateY(${isHovered && hover ? -3 : 0}px) rotateX(${isHovered && hover ? tilt.x : 0}deg) rotateY(${isHovered && hover ? tilt.y : 0}deg)`,
    transformStyle: 'preserve-3d',
    willChange: 'transform',
    cursor: onClick ? 'pointer' : 'default',
    position: 'relative',
    overflow: 'hidden',
    ...style,
  };

  return (
    <div
      className={className}
      style={baseStyle}
      onClick={onClick}
      onMouseEnter={() => hover && setIsHovered(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        if (!hover) return;
        setIsHovered(false);
        setTilt({ x: 0, y: 0 });
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
          borderRadius: 'inherit',
          background:
            'linear-gradient(130deg, rgba(255,255,255,0.24), transparent 24%, transparent 76%, rgba(34,211,238,0.12))',
          opacity: isHovered ? 0.95 : 0.6,
          transition: 'opacity 0.35s ease',
        }}
      />
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  );
};

export default BubbleCard;
