import React from 'react'
import { useToastStore } from '../stores/toastStore.js'

export default function SoundToastHost() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)

  if (!toasts.length) return null

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        right: 12,
        bottom: 12,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        maxWidth: 'min(360px, calc(100vw - 24px))',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => dismiss(t.id)}
          style={{
            pointerEvents: 'auto',
            textAlign: 'left',
            padding: '10px 12px',
            borderRadius: 'var(--radius)',
            border: `1px solid ${t.type === 'ok' ? 'rgba(100,200,100,0.35)' : 'rgba(196,64,64,0.4)'}`,
            background: 'var(--bg-card)',
            color: t.type === 'ok' ? 'var(--green-bright)' : 'var(--danger)',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            lineHeight: 1.35,
            cursor: 'pointer',
            boxShadow: '0 6px 24px rgba(0,0,0,0.35)',
          }}
        >
          {t.message}
        </button>
      ))}
    </div>
  )
}
