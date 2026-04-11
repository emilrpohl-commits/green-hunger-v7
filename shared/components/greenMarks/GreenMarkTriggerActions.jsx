import React, { useState } from 'react'

/**
 * DM-only: manual triggers + long-rest checklist (no automated dice).
 */
export default function GreenMarkTriggerActions({
  current,
  characterName,
  onMarkLastTriggered,
  showRestPanel = true,
}) {
  const [possessionRounds, setPossessionRounds] = useState('')
  const [restOpen, setRestOpen] = useState(false)
  const c = Math.max(0, Math.floor(Number(current) || 0))

  return (
    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {c >= 4 && (
        <div style={panel}>
          <div style={panelTitle}>Mark 4 — Poison burst</div>
          <p style={hint}>Player rolls Constitution save vs DC 13. On failure, apply 1d6 poison damage.</p>
          <button type="button" onClick={() => onMarkLastTriggered?.()} style={btnPrimary}>
            Trigger poison burst (CON DC 13, 1d6 poison)
          </button>
        </div>
      )}

      {c >= 5 && (
        <div style={panel}>
          <div style={panelTitle}>Mark 5 — Root possession</div>
          <p style={hint}>
            Roll 1d4 for rounds. You control {characterName || 'the character'} for that duration (once per long rest).
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="number"
              min={1}
              max={4}
              placeholder="1–4"
              value={possessionRounds}
              onChange={(e) => setPossessionRounds(e.target.value)}
              style={inputSm}
            />
            <button
              type="button"
              onClick={() => {
                const raw = parseInt(possessionRounds, 10)
                const n = Math.min(4, Math.max(1, raw))
                if (!Number.isFinite(raw) || raw < 1 || raw > 4) {
                  window.alert('Enter a number from 1 to 4 (rounds).')
                  return
                }
                onMarkLastTriggered?.()
                window.alert(`Possession: DM controls ${characterName || 'character'} for ${n} round${n === 1 ? '' : 's'}.`)
                setPossessionRounds('')
              }}
              style={btnPrimary}
            >
              Confirm possession rounds
            </button>
          </div>
        </div>
      )}

      {showRestPanel && c >= 1 && (
        <>
          <button type="button" onClick={() => setRestOpen((o) => !o)} style={btnGhost}>
            Resolve long rest effects
          </button>
          {restOpen && <LongRestChecklist current={c} />}
        </>
      )}
    </div>
  )
}

function LongRestChecklist({ current }) {
  return (
    <div style={{ ...panel, marginTop: 8 }}>
      <div style={panelTitle}>Long rest checklist</div>
      <ul style={{ margin: '6px 0 0', paddingLeft: 18, color: 'var(--text-secondary)', fontSize: 11, lineHeight: 1.6 }}>
        {current >= 1 && (
          <li>
            <strong>Nightmares (Mark 1):</strong> DC 10 Wisdom save during rest — on fail, unrested.
          </li>
        )}
        {current >= 4 && (
          <li>
            <strong>Poison burst (Mark 4):</strong> CON save DC 13 at start of rest — on fail, 1d6 poison.
          </li>
        )}
        {current >= 5 && (
          <li>
            <strong>Possession (Mark 5):</strong> Up to once per long rest — use trigger above when appropriate.
          </li>
        )}
      </ul>
    </div>
  )
}

const btnPrimary = {
  padding: '6px 10px',
  borderRadius: 'var(--radius)',
  border: '1px solid rgba(100, 160, 90, 0.45)',
  background: 'rgba(50, 80, 45, 0.35)',
  color: '#b8e0a8',
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  cursor: 'pointer',
}

const btnGhost = {
  ...btnPrimary,
  background: 'transparent',
  border: '1px solid var(--border)',
  color: 'var(--text-muted)',
}

const panel = {
  padding: '10px 12px',
  borderRadius: 'var(--radius)',
  border: '1px solid var(--border)',
  background: 'rgba(0,0,0,0.2)',
}

const panelTitle = {
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--warning)',
  marginBottom: 4,
}

const hint = { margin: '0 0 8px', fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.45 }

const inputSm = {
  width: 52,
  padding: '4px 6px',
  borderRadius: 'var(--radius)',
  border: '1px solid var(--border)',
  background: 'var(--bg-raised)',
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
}
