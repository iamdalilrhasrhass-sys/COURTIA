import { motion } from 'framer-motion';

const sizes = {
  sm: 20,
  md: 32,
  lg: 48,
};

export function AuroraSpinner({ size = 'md', ...props }) {
  const dimension = typeof size === 'number' ? size : sizes[size] || sizes.md;
  const strokeWidth = dimension < 24 ? 3 : dimension < 40 ? 4 : 5;
  const radius = (dimension - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <motion.svg
      width={dimension}
      height={dimension}
      viewBox={`0 0 ${dimension} ${dimension}`}
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      {...props}
    >
      <defs>
        <linearGradient id="aurora-spinner-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--aurora-violet)" />
          <stop offset="100%" stopColor="var(--aurora-pink)" />
        </linearGradient>
      </defs>
      <circle
        cx={dimension / 2}
        cy={dimension / 2}
        r={radius}
        fill="none"
        stroke="var(--aurora-border-soft)"
        strokeWidth={strokeWidth}
      />
      <motion.circle
        cx={dimension / 2}
        cy={dimension / 2}
        r={radius}
        fill="none"
        stroke="url(#aurora-spinner-gradient)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: circumference * 0.25 }}
        transition={{ duration: 0.5 }}
        style={{ transformOrigin: 'center' }}
      />
    </motion.svg>
  );
}

export function AuroraSpinnerOverlay({ message }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(2px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--aurora-space-4)',
        zIndex: 9999,
      }}
    >
      <AuroraSpinner size="lg" />
      {message && (
        <p style={{ color: 'var(--aurora-text-primary)', fontSize: 'var(--aurora-text-sm)', fontWeight: 500 }}>
          {message}
        </p>
      )}
    </div>
  );
}

export default AuroraSpinner;
