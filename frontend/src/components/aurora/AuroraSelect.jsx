import { useState, useId } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const styles = {
  container: {
    position: 'relative',
    width: '100%',
  },
  selectWrapper: {
    position: 'relative',
  },
  select: {
    width: '100%',
    padding: 'var(--aurora-space-3) var(--aurora-space-8) var(--aurora-space-3) var(--aurora-space-3)',
    paddingTop: 'var(--aurora-space-5)',
    fontSize: 'var(--aurora-text-base)',
    color: 'var(--aurora-text-primary)',
    backgroundColor: 'var(--aurora-bg-surface)',
    border: '1px solid var(--aurora-border-soft)',
    borderRadius: 'var(--aurora-radius-md)',
    outline: 'none',
    cursor: 'pointer',
    appearance: 'none',
    transition: 'border-color var(--aurora-duration-fast) var(--aurora-ease), box-shadow var(--aurora-duration-fast) var(--aurora-ease)',
    fontFamily: 'inherit',
  },
  selectFocused: {
    borderColor: 'var(--aurora-violet)',
    boxShadow: 'var(--aurora-shadow-focus)',
  },
  selectError: {
    borderColor: 'var(--aurora-rose)',
  },
  label: {
    position: 'absolute',
    left: 'var(--aurora-space-3)',
    top: '8px',
    fontSize: 'var(--aurora-text-xs)',
    color: 'var(--aurora-text-muted)',
    pointerEvents: 'none',
    transition: 'color var(--aurora-duration-fast) var(--aurora-ease)',
  },
  labelFocused: {
    color: 'var(--aurora-violet)',
  },
  chevron: {
    position: 'absolute',
    right: 'var(--aurora-space-3)',
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--aurora-text-muted)',
    pointerEvents: 'none',
    transition: 'transform var(--aurora-duration-fast) var(--aurora-ease)',
  },
  errorText: {
    marginTop: 'var(--aurora-space-1)',
    fontSize: 'var(--aurora-text-xs)',
    color: 'var(--aurora-rose)',
  },
};

export function AuroraSelect({ label, options = [], value, onChange, error, disabled, placeholder, ...props }) {
  const [focused, setFocused] = useState(false);
  const id = useId();

  return (
    <div style={styles.container}>
      <div style={styles.selectWrapper}>
        <motion.select
          id={id}
          value={value}
          onChange={onChange}
          disabled={disabled}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            ...styles.select,
            ...(focused && styles.selectFocused),
            ...(error && styles.selectError),
            opacity: disabled ? 0.5 : 1,
            cursor: disabled ? 'not-allowed' : 'pointer',
          }}
          whileHover={{ scale: disabled ? 1 : 1.005 }}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </motion.select>
        {label && (
          <label
            htmlFor={id}
            style={{
              ...styles.label,
              ...(focused && styles.labelFocused),
              ...(error && { color: 'var(--aurora-rose)' }),
            }}
          >
            {label}
          </label>
        )}
        <ChevronDown
          size={18}
          style={{
            ...styles.chevron,
            transform: focused ? 'translateY(-50%) rotate(180deg)' : 'translateY(-50%)',
          }}
        />
      </div>
      {error && <p style={styles.errorText}>{error}</p>}
    </div>
  );
}

export default AuroraSelect;
