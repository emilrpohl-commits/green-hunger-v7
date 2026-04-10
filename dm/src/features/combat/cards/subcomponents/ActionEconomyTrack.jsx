import React from 'react'
import { useCombatStore } from '../../../../stores/combatStore.js'

/**
 * ActionEconomyTrack
 *
 * Renders Action / Bonus Action / Reaction pips.
 * Optional: legendary action counter.
 *
 * Clicking a pip calls useCombatantActionType to mark it used (toggles via store).
 * The store marks used; a "refresh" happens automatically on next-turn.
 */
export default function ActionEconomyTrack({ combatant, showLegendary = false }) {
  const useCombatantActionType = useCombatStore(s => s.useCombatantActionType)
  const pushFeedEvent          = useCombatStore(s => s.pushFeedEvent)

  const economy = combatant.actionEconomy || {}

  const pips = [
    { key: 'action',       label: 'A',  ready: economy.actionAvailable       !== false },
    { key: 'bonus_action', label: 'BA', ready: economy.bonusActionAvailable  !== false },
    { key: 'reaction',     label: 'R',  ready: economy.reactionAvailable     !== false },
  ]

  const legendary = combatant.resources?.legendaryActions

  async function handleClick(pip) {
    if (!pip.ready) return
    const ok = await useCombatantActionType(combatant.id, pip.key, `Manual (${pip.label})`)
    if (!ok) {
      pushFeedEvent(`${combatant.name}: ${pip.label} already used.`, 'system', false)
    }
  }

  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
      {pips.map(pip => (
        <button
          key={pip.key}
          title={`${pip.label} — ${pip.ready ? 'available (click to use)' : 'used'}`}
          className={`econ-pip ${pip.ready ? 'econ-pip--ready' : 'econ-pip--used'}`}
          onClick={() => handleClick(pip)}
        >
          {pip.label}
          <span style={{ fontSize: 8 }}>{pip.ready ? '●' : '○'}</span>
        </button>
      ))}

      {showLegendary && legendary && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '2px 8px',
          border: '1px solid rgba(196,160,64,0.4)',
          borderRadius: 'var(--radius)',
          fontFamily: 'var(--font-mono)', fontSize: 9,
          color: 'var(--warning)',
          background: 'rgba(196,160,64,0.08)',
        }}>
          <span>LA</span>
          <span>{legendary.total - legendary.used}/{legendary.total}</span>
        </div>
      )}

      {combatant.concentration && (
        <span style={{
          padding: '2px 7px',
          border: '1px solid rgba(196,160,64,0.35)',
          borderRadius: 20,
          fontFamily: 'var(--font-mono)', fontSize: 9,
          color: 'var(--warning)',
          letterSpacing: '0.05em',
        }}>
          ◈ Conc
        </span>
      )}
    </div>
  )
}
