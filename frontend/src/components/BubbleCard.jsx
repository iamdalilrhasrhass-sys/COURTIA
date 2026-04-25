import React, { useState } from 'react';

const BubbleCard = ({ children, hover = true, padding = 20, style, className, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);

  const baseStyle = {
    background: 'rgba(255,255,255,0.75)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: 'var(--r-lg, 16px)',
    border: '0.5px solid rgba(0,0,0,0.08)',
    boxShadow: isHovered && hover
      ? 'var(--shadow-bubble-pop, 0 4px 8px rgba(0,0,0,0.05), 0 16px 40px rgba(0,0,0,0.09), 0 40px 80px rgba(0,0,0,0.06))'
      : 'var(--shadow-bubble, 0 1px 2px rgba(0,0,0,0.03), 0 4px 12px rgba(0,0,0,0.04), 0 12px 32px rgba(0,0,0,0.06))',
    padding: `${padding}px`,
    transition: 'box-shadow 0.3s ease, transform 0.3s ease',
    transform: isHovered && hover ? 'translateY(-2px)' : 'translateY(0)',
    cursor: onClick ? 'pointer' : 'default',
    ...style,
  };

  return (
    <div
      className={className}
      style={baseStyle}
      onClick={onClick}
      onMouseEnter={() => hover && setIsHovered(true)}
      onMouseLeave={() => hover && setIsHovered(false)}
    >
      {children}
    </div>
  );
};

export default BubbleCard;
