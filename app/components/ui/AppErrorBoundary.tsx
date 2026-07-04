'use client'
import React, { useEffect } from 'react'
import { reportError, initErrorReporting } from '../../../lib/client-error-reporter'

interface State { hasError: boolean }

class ErrorBoundaryInner extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    reportError('critical', error.message, {
      stack: error.stack?.slice(0, 2000),
      componentStack: info.componentStack?.slice(0, 2000),
    })
  }

  render() {
    if (this.state.hasError) return <ErrorFallback />
    return this.props.children
  }
}

function ErrorFallback() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', padding: 40, background: '#0D0B08', textAlign: 'center',
    }}>
      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 20, fontWeight: 400, color: '#D4AF37', letterSpacing: '0.02em', textTransform: 'uppercase', marginBottom: 16 }}>
        Une erreur est survenue
      </div>
      <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 4, lineHeight: 1.5, maxWidth: 320 }}>
        An error occurred · Ein Fehler ist aufgetreten
      </div>
      <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 12, color: 'rgba(255,255,255,0.25)', marginBottom: 28, maxWidth: 320 }}>
        L'erreur a été signalée automatiquement.
      </div>
      <button
        onClick={() => window.location.reload()}
        style={{
          padding: '12px 32px', borderRadius: 12, background: '#D4AF37', border: 'none',
          color: '#0D0B08', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, fontWeight: 700,
          letterSpacing: '0.08em', cursor: 'pointer', textTransform: 'uppercase',
        }}
      >
        Recharger · Reload · Neu laden
      </button>
    </div>
  )
}

export default function AppErrorBoundary({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initErrorReporting()
  }, [])

  return (
    <ErrorBoundaryInner>
      {children}
    </ErrorBoundaryInner>
  )
}
