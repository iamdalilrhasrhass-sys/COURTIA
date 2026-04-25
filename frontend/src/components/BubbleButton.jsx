import React from 'react';

const VARIANT_STYLES = {
  primary: {
    background: '#0a0a0a',
    color: '#ffffff',
    border: '0.5px solid rgba(255,255,255,0.1)',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
    hoverBg: '#1a1a1a',
    hoverTransform: 'translateY(-1px)',
    activeBg: '#000000',
  },
  secondary: {
    background: '#ffffff',
    color: '#0a0a0a',
    border: '0.5px solid rgba(0,0,0,0.12)',
    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
    hoverBg: '#f7f6f2',
    hoverTransform: 'translateY(-1px)',
    activeBg: '#efeee8',
  },
  ghost: {
    background: 'transparent',
    color: '#0a0a0a',
    border: '0.5px solid transparent',
    boxShadow: 'none',
    hoverBg: 'rgba(0,0,0,0.04)',
    hoverTransform: 'none',
    activeBg: 'rgba(0,0,0,0.08)',
  },
  danger: {
    background: '#fef2f2',
    color: '#dc2626',
    border: '0.5px solid rgba(220,38,38,0.15)',
    boxShadow: '0 1px 2px rgba(220,38,38,0.05)',
    hoverBg: '#fee2e2',
    hoverTransform: 'translateY(-1px)',
    activeBg: '#fecaca',
  },
};

const SIZE_STYLES = {
  sm: { padding: '6px 14px', fontSize: 12, borderRadius: 'var(--r-sm, 8px)' },
  md: { padding: '10px 20px', fontSize: 14, borderRadius: 'var(--r-md, 12px)' },
  lg: { padding: '14px 28px', fontSize: 16, borderRadius: 'var(--r-lg, 16px)' },
};

const BubbleButton = ({ variant = 'primary', size = 'md', children, ...rest }) => {
  const varStyle = VARIANT_STYLES[variant] || VARIANT_STYLES.primary;
  const sizeStyle = SIZE_STYLES[size] || SIZE_STYLES.md;

  const [hovered, setHovered] = React.useState(false);
  const [active, setActive] = React.useState(false);

  const inlineStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    fontFamily: 'var(--font-sans, Arial, Helvetica, sans-serif)',
    fontWeight: 500,
    lineHeight: 1.4,
    cursor: 'pointer',
    userSelect: 'none',
    outline: 'none',
    transition: 'all 0.2s ease',
    ...sizeStyle,
    background: active ? varStyle.activeBg : hovered ? varStyle.hoverBg : varStyle.background,
    color: varStyle.color,
    border: varStyle.border,
    boxShadow: varStyle.boxShadow,
    transform: active ? 'translateY(0)' : hovered ? varStyle.hoverTransform : 'none',
  };

  return (
    <button
      style={inlineStyle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setActive(false); }}
      onMouseDown={() => setActive(true)}
      onMouseUp={() => setActive(false)}
      {...rest}
    >
      {children}
    </button>
  );
};

export default BubbleButton;
