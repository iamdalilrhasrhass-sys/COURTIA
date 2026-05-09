import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import CourtiaBubbleLogo from './brand/CourtiaBubbleLogo'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, errorMessage: '' }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, errorMessage: error?.message || 'Erreur inattendue' }
  }

  componentDidCatch(error, info) {
    // Observabilité minimale: log structuré sans données sensibles.
    console.error('[frontend:error-boundary]', {
      message: error?.message || 'unknown_error',
      stack: error?.stack || null,
      componentStack: info?.componentStack || null,
    })
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          background: 'radial-gradient(1000px 420px at 10% 0%, rgba(124,58,237,0.18), transparent), #05070f',
          color: '#fff',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 560,
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.03)',
            padding: 24,
            textAlign: 'center',
          }}
        >
          <div style={{ display: 'inline-flex', marginBottom: 14 }}>
            <CourtiaBubbleLogo size={44} />
          </div>
          <h1 style={{ margin: '0 0 8px', fontSize: 22 }}>Une erreur est survenue</h1>
          <p style={{ margin: '0 0 16px', color: 'rgba(255,255,255,0.72)', fontSize: 14 }}>
            COURTIA a rencontré un incident d&apos;affichage. Vous pouvez recharger la page ou revenir plus tard.
          </p>
          <div
            style={{
              marginBottom: 16,
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid rgba(251,113,133,0.4)',
              background: 'rgba(127,29,29,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              fontSize: 12,
              color: '#fecdd3',
            }}
          >
            <AlertTriangle size={14} />
            {this.state.errorMessage}
          </div>
          <button
            type="button"
            onClick={this.handleReload}
            style={{
              border: '1px solid rgba(96,165,250,0.9)',
              background: 'linear-gradient(135deg, rgba(37,99,235,0.95), rgba(124,58,237,0.95))',
              color: '#fff',
              borderRadius: 10,
              padding: '10px 14px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <RefreshCw size={14} /> Recharger COURTIA
          </button>
        </div>
      </div>
    )
  }
}
