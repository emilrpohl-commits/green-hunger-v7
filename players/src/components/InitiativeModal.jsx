import React from 'react'
import { parseModNum } from '../lib/diceHelpers'

export default function InitiativeModal({ char, characterId, combatCombatants, submitInitiative, pushRoll }) {
  const myCombatant = combatCombatants.find(c => c.id === characterId)
  if (!myCombatant || myCombatant.initiativeSet) return null

  const iniBonus = parseModNum(char?.stats?.initiative || '+0')

  const rollInitiative = () => {
    const d20 = Math.floor(Math.random() * 20) + 1
    const total = d20 + iniBonus
    submitInitiative(characterId, total)
    pushRoll(`Initiative: d20(${d20}) + ${iniBonus >= 0 ? '+' : ''}${iniBonus} = ${total}`, char.name)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 300, backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        background: 'var(--bg-surface)',
        border: `2px solid ${char.colour}80`,
        borderRadius: 16, padding: '32px 36px', textAlign: 'center',
        boxShadow: `0 8px 40px ${char.colour}30, 0 2px 8px rgba(0,0,0,0.8)`,
        maxWidth: 320
      }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 10 }}>
          Combat Begins
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: char.colour, marginBottom: 6 }}>
          Roll for Initiative
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
          d20 {iniBonus >= 0 ? `+${iniBonus}` : iniBonus} (Initiative)
        </div>
        <button
          onClick={rollInitiative}
          style={{
            padding: '12px 32px',
            fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.12em',
            background: `${char.colour}25`,
            border: `2px solid ${char.colour}80`,
            borderRadius: 'var(--radius-lg)',
            color: char.colour, cursor: 'pointer'
          }}
        >
          Roll
        </button>
      </div>
    </div>
  )
}
