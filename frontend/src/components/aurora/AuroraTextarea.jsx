import { useState, useId } from 'react';
import { motion } from 'framer-motion';

const styles = {
  container: {
    position: 'relative',
    width: '100%',
  },
  textarea: {
    width: '100%',
    padding: 'var(--aurora-space-4) var(--aurora-space-3)',
    paddingTop: 'var(--aurora-space-6)',
    fontSize: 'var(--aurora-text-base)',
    color: 'var(--aurora-text-primary)',
    backgroundColor: 'var(--aurora-bg-surface)',
    border: '1px solid var(--aurora-border-soft)',
    borderRadius: 'var(--aurora-radius-md)',
    outline: 'none',
    resize: 'vertical',
    minHeight: '100px',
    transition: 'border-color var(--aurora-duration-fast) var(--aurora-ease), box-shadow var(--aurora-duration-fast) var(--aurora-ease)',
    fontFamily: 'inherit',
  },
  textareaFocused: {
    borderColor: 'var(--aurora-violet)',
    boxShadow: 'var(--aurora-shadow-focus)',
  },
  textareaError: {
    borderColor: 'var(--aurora-rose)',
  },
  label: {
    position: 'absolute',
    left: 'var(--aurora-space-3)',
    color: 'var(--aurora-text-muted)',
    pointerEvents: 'none',
    transformOrigin: 'left top',
    transition: 'transform var(--aurora-duration-fast) var(--aurora-ease), color var(--aurora-duration-fast) var(--aurora-ease)',
  },
  labelFloating: {
    transform: 'translateY(8px) scale(0.75)',
    color: 'var(--aurora-violet)',
  },
  labelResting: {
    transform: 'translateY(20px) scale(1)',
  },
  errorText: {
    marginTop: 'var(--aurora-space-1)',
    fontSize: 'var(--aurora-text-xs)',
    color: 'var(--aurora-rose)',
  },
};

export function AuroraTextarea({ label, error, value, onChange, rows = 4, placeholder, disabled, ...props }) {
  const [focused, setFocused] = useState(false);
  const id = useId();
  const hasValue = value && value.length > 0;
  const isFloating = focused || hasValue;

  return (
    <div style={styles.container}>
      <motion.textarea
        id={id}
        value={value}
        onChange={onChange}
        rows={rows}
        disabled={disabled}
        placeholder={focused ? placeholder : ''}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          ...styles.textarea,
          ...(focused && styles.textareaFocused),
          ...(error && styles.textareaError),
          opacity: disabled ? 0.5 : 1,
          cursor: disabled ? 'not-allowed' : 'text',
        }}
        whileFocus={{ scale: 1.005 }}
        {...props}
      />
      {label && (
        <label
          htmlFor={id}
          style={{
            ...styles.label,
            ...(isFloating ? styles.labelFloating : styles.labelResting),
            ...(error && { color: 'var(--aurora-rose)' }),
          }}
        >
          {label}
        </label>
      )}
      {error && <p style={styles.errorText}>{error}</p>}
    </div>
  );
}

export default AuroraTextarea;
