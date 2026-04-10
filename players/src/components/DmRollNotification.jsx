import React from 'react'

export default function DmRollNotification({ dmRoll, char, clearDmRoll, resolveIncomingSavePrompt, manualSaveTotal, setManualSaveTotal }) {
  if (!dmRoll) return null

  return (
    <div style={{
      position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
      background: '#141814',
      border: '2px solid var(--warning)',
      borderRadius: 12,
      padding: '14px 20px',
      zIndex: 300,
      minWidth: 240, maxWidth: 340,
      boxShadow: '0 4px 24px rgba(196,160,64,0.4)',
      textAlign: 'center'
    }}>
      <button onClick={clearDmRoll} style={{
        position: 'absolute', top: 6, right: 10,
        background: 'none', border: 'none', color: 'var(--text-muted)',
        cursor: 'pointer', fontSize: 16
      }}>×</button>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>
        {dmRoll.kind === 'save-prompt' ? 'DM Save Prompt' : 'DM Roll'}
      </div>
      <div style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.5 }}>{dmRoll.text}</div>
      {dmRoll.kind === 'save-prompt' && dmRoll.savePrompt && (
        <div style={{ marginTop: 10, display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => { void resolveIncomingSavePrompt(false) }}
            style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)', fontSize: 10, background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-secondary)', cursor: 'pointer' }}
          >
            Roll Save
          </button>
          <button
            onClick={() => { void resolveIncomingSavePrompt(true, manualSaveTotal) }}
            style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)', fontSize: 10, background: `${char.colour}20`, border: `1px solid ${char.colour}70`, borderRadius: 'var(--radius)', color: char.colour, cursor: 'pointer' }}
          >
            Enter Total
          </button>
          <input
            type="number"
            value={manualSaveTotal}
            onChange={(e) => setManualSaveTotal(e.target.value)}
            placeholder="Total"
            style={{
              width: 72,
              padding: '6px 8px',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              background: 'var(--bg-raised)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              color: 'var(--text-primary)',
            }}
          />
        </div>
      )}
    </div>
  )
}
