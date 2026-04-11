import React, { useState } from 'react'
import { DmRuntimeCharacterCard } from './DmPartyCards.jsx'

/**
 * Default collapsed: name + HP. Expand for full DM controls.
 */
export default function CollapsibleDmPartyPanel({ characters, tagLabel = 'Player' }) {
  const [openId, setOpenId] = useState(null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {characters.map((char) => {
        const expanded = openId === char.id
        const pct = char.maxHp > 0 ? Math.round((char.curHp / char.maxHp) * 100) : 0
        return (
          <div key={char.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', background: 'var(--bg-card)' }}>
            <button
              type="button"
              onClick={() => setOpenId(expanded ? null : char.id)}
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 12px',
                border: 'none',
                background: expanded ? 'rgba(100,140,100,0.08)' : 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{char.name}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                  {tagLabel} · HP {char.curHp}/{char.maxHp} ({pct}%)
                </div>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--green-bright)' }}>{expanded ? '▲' : '▼'}</span>
            </button>
            {expanded && (
              <div style={{ padding: '0 10px 12px', borderTop: '1px solid var(--border)' }}>
                <DmRuntimeCharacterCard char={char} tagLabel={tagLabel} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
