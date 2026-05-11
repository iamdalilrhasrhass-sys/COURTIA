/**
 * AuroraInput — Input premium avec label flottant
 */
import { useState, useId } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * @param {Object} props
 * @param {string} props.label
 * @param {string} props.error
 * @param {React.ReactNode} props.icon
 * @param {string} props.type
 * @param {string} props.value
 * @param {function} props.onChange
 * @param {string} props.placeholder
 * @param {boolean} props.disabled
 * @param {string} props.className
 */
export function AuroraInput({
  label,
  error,
  icon,
  type = 'text',
  value,
  onChange,
  placeholder,
  disabled = false,
  className = '',
  ...props
}) {
  const id = useId()
  const [focused, setFocused] = useState(false)
  const hasValue = value && value.length > 0

  return (
    <div className={className} style={{ position: 'relative' }}>
      {label && (
        <motion.label
          htmlFor={id}
          initial={false}
          animate={{
            y: focused || hasValue ? -24 : 0,
            scale: focused || hasValue ? 0.85 : 1,
            color: error 
              ? 'var(--aurora-rose)' 
              : focused 
                ? 'var(--aurora-violet-soft)' 
                : 'var(--aurora-text-muted)'
          }}
          style={{
            position: 'absolute',
            left: icon ? 44 : 14,
            top: 12,
            fontSize: 'var(--aurora-text-sm)',
            pointerEvents: 'none',
            transformOrigin: 'left',
            transition: 'all var(--aurora-duration-fast) var(--aurora-ease)'
          }}
        >
          {label}
        </motion.label>
      )}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {icon && (
          <span style={{
            position: 'absolute',
            left: 14,
            color: focused ? 'var(--aurora-violet-soft)' : 'var(--aurora-text-muted)',
            transition: 'color var(--aurora-duration-fast) var(--aurora-ease)'
          }}>
            {icon}
          </span>
        )}
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={focused || !label ? placeholder : ''}
          disabled={disabled}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={error ? 'aurora-focus-ring--error' : 'aurora-focus-ring'}
          style={{
            width: '100%',
            padding: icon ? '12px 14px 12px 44px' : '12px 14px',
            paddingTop: label ? 18 : 12,
            paddingBottom: label ? 6 : 12,
            fontSize: 'var(--aurora-text-base)',
            fontFamily: 'var(--aurora-font-body)',
            color: 'var(--aurora-text-primary)',
            background: focused ? 'var(--aurora-bg-input-focus)' : 'var(--aurora-bg-input)',
            border: `1px solid ${error ? 'var(--aurora-border-error)' : focused ? 'var(--aurora-border-violet)' : 'var(--aurora-border-soft)'}`,
            borderRadius: 'var(--aurora-radius-md)',
            outline: 'none',
            transition: 'all var(--aurora-duration-fast) var(--aurora-ease)',
            opacity: disabled ? 0.5 : 1,
            cursor: disabled ? 'not-allowed' : 'text'
          }}
          {...props}
        />
      </div>
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            style={{
              marginTop: 6,
              fontSize: 'var(--aurora-text-xs)',
              color: 'var(--aurora-rose)'
            }}
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}

export default AuroraInput
