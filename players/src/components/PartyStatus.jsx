import React from 'react'
import { usePlayerStore } from '../stores/playerStore'

function CharacterRow({ char }) {
  const hpPct = char.maxHp > 0 ? (char.curHp / char.maxHp) * 100 : 0
  const hpColour = hpPct > 60
    ? 'var(--green-bright)'
    : hpPct > 30
      ? 'var(--warning)'
      : char.curHp === 0
        ? 'var(--danger)'
        : '#c46040'

  const statusText = char.curHp === 0
    ? 'Unconscious'
    : hpPct > 60
      ? 'Healthy'
      : hpPct > 30
        ? 'Wounded'
        : 'Critical'

  return (
    <div style={{
      padding: '14px 18px',
      borderBottom: '1px solid var(--border)',
    }}>
      {/* Name row */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: 8
      }}>
        <div>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: 14,
            color: 'var(--text-primary)',
            letterSpacing: '0.04em'
          }}>
            {char.name}
          </span>
          <span style={{
            fontSize: 12,
            color: 'var(--text-muted)',
            marginLeft: 8,
            fontStyle: 'italic'
          }}>
            {char.species} {char.class}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {char.concentration && (
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              color: 'var(--warning)',
              background: 'rgba(176,144,48,0.15)',
              border: '1px solid rgba(176,144,48,0.3)',
              borderRadius: 'var(--radius)',
              padding: '2px 5px',
              textTransform: 'uppercase',
              letterSpacing: '0.06em'
            }}>
              Concentrating
            </span>
          )}
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: hpColour
          }}>
            {statusText}
          </span>
        </div>
      </div>

      {/* HP bar */}
      <div style={{ marginBottom: 8 }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 4
        }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            HP
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: hpColour }}>
            {char.curHp}
            {char.tempHp > 0 && (
              <span style={{ color: 'var(--info)' }}> +{char.tempHp}</span>
            )}
            <span style={{ color: 'var(--text-muted)' }}> / {char.maxHp}</span>
          </span>
        </div>
        <div style={{
          height: 6,
          background: 'var(--bg-raised)',
          borderRadius: 3,
          overflow: 'hidden'
        }}>
          <div style={{
            height: '100%',
            width: `${hpPct}%`,
            background: hpColour,
            borderRadius: 3,
            transition: 'width 0.5s ease, background 0.5s ease'
          }} />
        </div>
        {char.tempHp > 0 && (
          <div style={{
            height: 3,
            marginTop: 2,
            background: 'var(--bg-raised)',
            borderRadius: 2,
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              width: `${Math.min(100, (char.tempHp / char.maxHp) * 100)}%`,
              background: 'var(--info)',
              borderRadius: 2,
              opacity: 0.6
            }} />
          </div>
        )}
      </div>

      {/* Death saves (only when unconscious) */}
      {char.curHp === 0 && (
        <div style={{
          display: 'flex',
          gap: 16,
          padding: '8px 10px',
          background: 'rgba(176,48,48,0.1)',
          border: '1px solid rgba(176,48,48,0.25)',
          borderRadius: 'var(--radius)',
          marginBottom: 8
        }}>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--green-bright)' }}>✓</span>
            {[0,1,2].map(i => (
              <div key={i} style={{
                width: 10, height: 10, borderRadius: '50%',
                background: i < char.deathSaves.successes ? 'var(--green-bright)' : 'transparent',
                border: '1px solid var(--green-dim)'
              }} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--danger)' }}>✗</span>
            {[0,1,2].map(i => (
              <div key={i} style={{
                width: 10, height: 10, borderRadius: '50%',
                background: i < char.deathSaves.failures ? 'var(--danger)' : 'transparent',
                border: '1px solid rgba(176,48,48,0.4)'
              }} />
            ))}
          </div>
        </div>
      )}

      {/* Spell slots */}
      {char.spellSlots && (
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {Object.entries(char.spellSlots).map(([level, slot]) => {
            const remaining = slot.max - slot.used
            return (
              <div key={level} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase'
                }}>
                  Lvl {level}
                </span>
                <div style={{ display: 'flex', gap: 3 }}>
                  {Array.from({ length: slot.max }).map((_, i) => (
                    <div key={i} style={{
                      width: 8, height: 8,
                      borderRadius: '50%',
                      background: i < remaining ? 'var(--green-mid)' : 'transparent',
                      border: '1px solid var(--green-dim)',
                      transition: 'background 0.3s'
                    }} />
                  ))}
                </div>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  color: remaining === 0 ? 'var(--text-muted)' : 'var(--text-secondary)'
                }}>
                  {remaining}/{slot.max}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function PartyStatus() {
  const characters = usePlayerStore(s => s.characters)

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 18px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-surface)'
      }}>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.12em'
        }}>
          Party Status
        </span>
      </div>

      {characters.map((char, i) => (
        <CharacterRow
          key={char.id}
          char={char}
          isLast={i === characters.length - 1}
        />
      ))}
    </div>
  )
}
