import React, { useState } from 'react'
import { useDmToolboxStore } from '../../../stores/dmToolboxStore.js'
import WildMagicResultCard from './WildMagicResultCard.jsx'

export default function WildMagicRoller({ compact = false }) {
  const rollWildMagic = useDmToolboxStore((s) => s.rollWildMagic)
  const applyWildMagicManualRoll = useDmToolboxStore((s) => s.applyWildMagicManualRoll)
  const [last, setLast] = useState(null)
  const [pulse, setPulse] = useState(0)
  const [manual, setManual] = useState('')

  const doRoll = () => {
    const entry = rollWildMagic()
    setLast(entry)
    setPulse((p) => p + 1)
  }

  const applyManual = () => {
    const raw = String(manual).trim()
    if (raw === '') return
    let n
    if (raw === '00') n = 100
    else {
      n = Number(raw)
      if (!Number.isFinite(n)) return
      n = Math.round(n)
    }
    if (n < 1 || n > 100) return
    const entry = applyWildMagicManualRoll(n)
    if (entry) {
      setLast(entry)
      setPulse((p) => p + 1)
    }
  }

  return (
    <div>
      <style>{`
        @keyframes wm-pop {
          0% { transform: scale(0.94); opacity: 0.5; filter: blur(2px); }
          55% { transform: scale(1.01); opacity: 1; filter: blur(0); }
          100% { transform: scale(1); opacity: 1; }
        }
        .wm-result-pop { animation: wm-pop 0.4s ease-out forwards; }
      `}</style>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10, alignItems: 'center' }}>
        <button type="button" onClick={doRoll} style={btnPrimary}>
          Roll wild magic
        </button>
        <button type="button" onClick={doRoll} style={btnGhost}>
          Roll again
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          alignItems: 'center',
          marginBottom: 14,
          padding: compact ? '10px 12px' : '12px 14px',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          background: 'var(--bg-raised)',
        }}
      >
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Physical d100
        </span>
        <input
          type="text"
          inputMode="numeric"
          placeholder="1–100"
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') applyManual()
          }}
          style={{
            width: 72,
            padding: '8px 10px',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border)',
            background: 'var(--bg-deep)',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-mono)',
            fontSize: 14,
          }}
        />
        <button type="button" onClick={applyManual} style={btnGhost}>
          Apply roll
        </button>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', maxWidth: 200, lineHeight: 1.4 }}>
          Use table result for a roll at the table. Enter <strong style={{ color: 'var(--text-secondary)' }}>00</strong> for 100.
        </span>
      </div>

      {last && (
        <WildMagicResultCard
          key={pulse}
          roll={last.roll}
          title={last.title}
          description={last.description}
          duration={last.duration}
          type={last.type}
          tone={last.tone}
          animate
          compact={compact}
        />
      )}
    </div>
  )
}

const btnPrimary = {
  padding: '10px 18px',
  borderRadius: 'var(--radius)',
  border: '1px solid var(--green-mid)',
  background: 'var(--green-dim)',
  color: 'var(--green-bright)',
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  cursor: 'pointer',
  fontWeight: 700,
}

const btnGhost = {
  ...btnPrimary,
  background: 'transparent',
  border: '1px solid var(--border)',
  color: 'var(--text-muted)',
  fontWeight: 500,
}
