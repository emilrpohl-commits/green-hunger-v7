import React, { useState } from 'react'
import { useDmToolboxStore } from '../../../stores/dmToolboxStore.js'
import WildMagicResultCard from './WildMagicResultCard.jsx'

export default function WildMagicRoller({ compact = false }) {
  const rollWildMagic = useDmToolboxStore((s) => s.rollWildMagic)
  const [last, setLast] = useState(null)
  const [pulse, setPulse] = useState(0)

  const doRoll = () => {
    const entry = rollWildMagic()
    setLast(entry)
    setPulse((p) => p + 1)
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

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
        <button type="button" onClick={doRoll} style={btnPrimary}>
          Roll wild magic
        </button>
        <button type="button" onClick={doRoll} style={btnGhost}>
          Roll again
        </button>
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
