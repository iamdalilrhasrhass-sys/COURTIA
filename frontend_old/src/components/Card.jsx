export function Card({ children, className = '', hoverable = false }) {
  return (
    <div className={`
      bg-slate-800/60 rounded-xl shadow-lg border border-slate-700/50 backdrop-blur-sm
      transition-all duration-300
      ${hoverable ? 'hover:shadow-xl hover:shadow-blue-500/10 hover:border-slate-600/80' : ''}
      ${className}
    `}>
      {children}
    </div>
  )
}

export function CardHeader({ children, className = '' }) {
  return (
    <div className={`px-6 py-4 border-b border-slate-700/50 ${className}`}>
      {children}
    </div>
  )
}

export function CardBody({ children, className = '' }) {
  return <div className={`px-6 py-4 ${className}`}>{children}</div>
}

export function CardFooter({ children, className = '' }) {
  return (
    <div className={`px-6 py-4 border-t border-slate-700/50 flex justify-end gap-2 ${className}`}>
      {children}
    </div>
  )
}
