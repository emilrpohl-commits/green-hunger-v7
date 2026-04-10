import React from 'react'

export default function CombatStrip({ char, myTurnActive, myEconomy, combatCombatants, combatActiveCombatantIndex }) {
  const nextCombatant = combatCombatants[(combatActiveCombatantIndex + 1) % Math.max(combatCombatants.length, 1)]

  return (
    <div style={{
      marginBottom: 12,
      padding: '10px 14px',
      border: `1px solid ${myTurnActive ? char.colour + '50' : 'var(--border)'}`,
      borderRadius: 'var(--radius-lg)',
      background: myTurnActive ? `${char.colour}10` : 'var(--bg-card)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: myTurnActive ? char.colour : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {myTurnActive ? '▶ Your Turn' : `Active: ${combatCombatants[combatActiveCombatantIndex]?.name || '—'}`}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>
          Next: {nextCombatant?.name || '—'}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {[
          { label: 'Action', ready: myEconomy.actionAvailable },
          { label: 'Bonus', ready: myEconomy.bonusActionAvailable },
          { label: 'Reaction', ready: myEconomy.reactionAvailable },
        ].map(({ label, ready }) => (
          <span key={label} style={{
            padding: '3px 10px',
            borderRadius: 20,
            border: `1px solid ${ready ? 'var(--green-mid)' : 'var(--border)'}`,
            background: ready ? 'var(--green-dim)' : 'transparent',
            color: ready ? 'var(--green-bright)' : 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
          }}>
            {label} {ready ? '●' : '○'}
          </span>
        ))}
      </div>
    </div>
  )
}
