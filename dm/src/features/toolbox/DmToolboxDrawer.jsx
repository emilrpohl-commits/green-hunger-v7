import React, { useEffect } from 'react'
import DmToolboxShell from './DmToolboxShell.jsx'

/**
 * Run-mode quick access: slide-over drawer, not a full route swap.
 */
export default function DmToolboxDrawer({ open, onClose, initialTab = 'wild', remountKey = 0 }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      <button
        type="button"
        aria-label="Close toolbox"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.55)',
          border: 'none',
          cursor: 'pointer',
          zIndex: 400,
        }}
      />
      <div
        role="dialog"
        aria-label="DM Toolbox"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 'min(440px, 92vw)',
          maxWidth: '100%',
          background: 'var(--bg-deep)',
          borderLeft: '1px solid var(--border)',
          boxShadow: '-12px 0 40px rgba(0,0,0,0.5)',
          zIndex: 410,
          display: 'flex',
          flexDirection: 'column',
          animation: 'dmToolboxSlide 0.22s ease-out forwards',
        }}
      >
        <style>{`
          @keyframes dmToolboxSlide {
            from { transform: translateX(100%); opacity: 0.9; }
            to { transform: translateX(0); opacity: 1; }
          }
        `}</style>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 14px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-surface)',
          flexShrink: 0,
        }}
        >
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--green-bright)', letterSpacing: '0.06em' }}>
              DM Toolbox
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>
              Wild magic, mob, AoE, budget, quick rulings, tables
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              background: 'var(--bg-raised)',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: 14, minHeight: 0 }}>
          <DmToolboxShell key={remountKey} compact initialTab={initialTab} />
        </div>
      </div>
    </>
  )
}
