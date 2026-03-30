export function Input({
  label,
  type = 'text',
  error = '',
  disabled = false,
  className = '',
  icon,
  ...props
}) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-semibold text-slate-200 mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            {icon}
          </div>
        )}
        <input
          type={type}
          disabled={disabled}
          className={`
            w-full px-4 py-3 rounded-lg text-sm text-slate-100
            bg-slate-700/50 border border-slate-600/50
            transition-all duration-200
            ${icon ? 'pl-11' : ''}
            ${error ? 'border-red-500/50 bg-red-500/5' : ''}
            ${disabled ? 'bg-slate-800 cursor-not-allowed opacity-50' : ''}
            focus:outline-none focus:bg-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
            placeholder-slate-500
            ${className}
          `}
          {...props}
        />
      </div>
      {error && <p className="text-red-400 text-xs mt-1.5 font-medium">{error}</p>}
    </div>
  )
}
