import React from 'react'
import { usePlayerStore } from '../stores/playerStore'
import { fmtMod } from '../lib/diceHelpers.js'

export default function CombatStrip({
  characterId,
  char,
  myTurnActive,
  myEconomy,
  combatCombatants,
  combatActiveCombatantIndex,
}) {
  const nextCombatant = combatCombatants[(combatActiveCombatantIndex + 1) % Math.max(combatCombatants.length, 1)]

  const concentrationSavePrompt = usePlayerStore((s) => s.concentrationSavePrompt)
  const rollConcentrationSave = usePlayerStore((s) => s.rollConcentrationSave)
  const dismissConcentrationSave = usePlayerStore((s) => s.dismissConcentrationSave)

  const concPrompt =
    concentrationSavePrompt && concentrationSavePrompt.characterId === characterId
      ? concentrationSavePrompt
      : null
  const concPreRoll = concPrompt && concPrompt.d20 == null
  const concPostRoll = concPrompt && concPrompt.d20 != null

  return (
    <>
      <div style={{
        marginBottom: 12,
        padding: '10px 14px',
        border: `1px solid ${myTurnActive ? char.colour + '50' : 'var(--border)'}`,
        borderRadius: 'var(--radius-lg)',
        background: myTurnActive ? `${char.colour}10` : 'var(--bg-card)',
      }}
      >
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
            }}
            >
              {label} {ready ? '●' : '○'}
            </span>
          ))}
        </div>
      </div>

      {concPrompt && (
        <div className="conc-save-prompt" role="dialog" aria-label="Concentration save">
          {concPreRoll && (
            <>
              <p className="conc-save-title">Concentration Check</p>
              <p className="conc-save-spell">
                You took damage while concentrating on <strong>{concPrompt.spellName}</strong>.
              </p>
              <p className="conc-save-dc">DC {concPrompt.dc} Constitution Save</p>
              <button type="button" className="conc-save-roll-btn" onClick={() => void rollConcentrationSave()}>
                Roll CON Save
              </button>
            </>
          )}
          {concPostRoll && (
            <>
              <p className="conc-save-title">
                {concPrompt.passed ? 'Concentration Held' : 'Concentration Lost'}
              </p>
              <p className="conc-save-result">
                Rolled {concPrompt.d20} {fmtMod(concPrompt.conMod ?? 0)}
                {' '}= <strong>{concPrompt.total}</strong> vs DC {concPrompt.dc}
              </p>
              {concPrompt.passed ? (
                <p className="conc-save-spell">{concPrompt.spellName} continues.</p>
              ) : (
                <p className="conc-save-spell">{concPrompt.spellName} has ended.</p>
              )}
              <button type="button" className="conc-save-dismiss-btn" onClick={dismissConcentrationSave}>
                OK
              </button>
            </>
          )}
        </div>
      )}
    </>
  )
}
