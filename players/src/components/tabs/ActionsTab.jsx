import React from 'react'
import { Section } from '../ui/Section'
import { isAttackRoll } from '../../lib/diceHelpers'

export default function ActionsTab({
  char, combatActive, enemies, partyChars, playerCharacters, characterId,
  selectedTarget, setSelectedTarget, healTarget, setHealTarget,
  healSlot, setHealSlot, bardicTarget, setBardicTarget,
  rollAttack, rollHeal, grantBardic,
  bardicInspirationUses, activeBuffs, spellSlots,
}) {
  return (
    <>
      <Section title="⚔ Attack">
        {combatActive && enemies.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
              Select Target
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button
                onClick={() => setSelectedTarget(null)}
                style={{
                  padding: '5px 12px', fontFamily: 'var(--font-mono)', fontSize: 10,
                  background: !selectedTarget ? 'var(--bg-raised)' : 'transparent',
                  border: `1px solid ${!selectedTarget ? 'var(--border-bright)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius)', color: !selectedTarget ? 'var(--text-secondary)' : 'var(--text-muted)',
                  cursor: 'pointer'
                }}
              >
                Free Roll
              </button>
              {enemies.map(e => (
                <button
                  key={e.id}
                  onClick={() => setSelectedTarget(e)}
                  style={{
                    padding: '5px 12px', fontFamily: 'var(--font-mono)', fontSize: 10,
                    background: selectedTarget?.id === e.id ? `${char.colour}20` : 'transparent',
                    border: `1px solid ${selectedTarget?.id === e.id ? char.colour + '60' : 'var(--border)'}`,
                    borderRadius: 'var(--radius)',
                    color: selectedTarget?.id === e.id ? 'var(--text-primary)' : 'var(--text-muted)',
                    cursor: 'pointer'
                  }}
                >
                  {e.name} ({e.curHp}/{e.maxHp} HP, AC {e.ac})
                </button>
              ))}
            </div>
          </div>
        )}

        {!combatActive && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', marginBottom: 12, fontStyle: 'italic' }}>
            No active combat — rolls won't be applied to enemies
          </div>
        )}

        {combatActive && enemies.length === 0 && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', marginBottom: 12, fontStyle: 'italic' }}>
            No living enemies in combat
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {char.weapons.map(w => (
            <div key={w.name} style={{
              background: 'var(--bg-raised)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)', padding: '12px 14px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>{w.name}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  {w.hit} · {w.damage}
                </div>
                {w.notes && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{w.notes}</div>}
              </div>
              <button
                onClick={() => rollAttack(w, selectedTarget)}
                style={{
                  padding: '8px 16px',
                  fontFamily: 'var(--font-mono)', fontSize: 10,
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                  background: `${char.colour}20`, border: `1px solid ${char.colour}60`,
                  borderRadius: 'var(--radius)', color: char.colour, cursor: 'pointer',
                  flexShrink: 0
                }}
              >
                {isAttackRoll(w.hit) ? 'Roll Attack' : 'Roll Dmg'}
              </button>
            </div>
          ))}
        </div>
      </Section>

      {char.healingActions && char.healingActions.length > 0 && (
        <Section title="💚 Heal">
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
              Heal Target
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button
                onClick={() => setHealTarget(characterId)}
                style={{
                  padding: '5px 12px', fontFamily: 'var(--font-mono)', fontSize: 10,
                  background: healTarget === characterId ? `${char.colour}20` : 'transparent',
                  border: `1px solid ${healTarget === characterId ? char.colour + '60' : 'var(--border)'}`,
                  borderRadius: 'var(--radius)',
                  color: healTarget === characterId ? 'var(--text-primary)' : 'var(--text-muted)',
                  cursor: 'pointer'
                }}
              >
                {char.name} (self)
              </button>
              {partyChars.map(pc => {
                const sc = playerCharacters[pc.id]
                return (
                  <button
                    key={pc.id}
                    onClick={() => setHealTarget(pc.id)}
                    style={{
                      padding: '5px 12px', fontFamily: 'var(--font-mono)', fontSize: 10,
                      background: healTarget === pc.id ? `${char.colour}20` : 'transparent',
                      border: `1px solid ${healTarget === pc.id ? char.colour + '60' : 'var(--border)'}`,
                      borderRadius: 'var(--radius)',
                      color: healTarget === pc.id ? 'var(--text-primary)' : 'var(--text-muted)',
                      cursor: 'pointer'
                    }}
                  >
                    {sc?.name || pc.id}
                  </button>
                )
              })}
            </div>
          </div>

          {char.healingActions.map(ha => (
            <div key={ha.name} style={{
              background: 'var(--bg-raised)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)', padding: '12px 14px',
              marginBottom: 8
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>{ha.name}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {ha.note || (ha.baseDice
                      ? `${ha.baseDice.count}d${ha.baseDice.sides}+${ha.baseDice.modifier}`
                      : ha.dice ? `${ha.dice.count}d${ha.dice.sides}+${ha.dice.modifier}` : ''
                    )}
                    {ha.action ? ` · ${ha.action}` : ''}
                  </div>
                </div>
              </div>

              {ha.slotLevel && (
                <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                  {Array.from({ length: (ha.maxSlotLevel || ha.slotLevel) - ha.slotLevel + 1 }).map((_, i) => {
                    const lvl = ha.slotLevel + i
                    return (
                      <button
                        key={lvl}
                        onClick={() => setHealSlot(lvl)}
                        style={{
                          padding: '4px 10px', fontFamily: 'var(--font-mono)', fontSize: 10,
                          background: healSlot === lvl ? 'var(--green-dim)' : 'transparent',
                          border: `1px solid ${healSlot === lvl ? 'var(--green-mid)' : 'var(--border)'}`,
                          borderRadius: 'var(--radius)',
                          color: healSlot === lvl ? 'var(--green-bright)' : 'var(--text-muted)',
                          cursor: 'pointer'
                        }}
                      >
                        L{lvl}
                      </button>
                    )
                  })}
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', alignSelf: 'center', marginLeft: 4 }}>
                    {ha.baseDice && healSlot > ha.slotLevel
                      ? `${ha.baseDice.count + (healSlot - ha.slotLevel)}d${ha.baseDice.sides}+${ha.baseDice.modifier}`
                      : ha.baseDice ? `${ha.baseDice.count}d${ha.baseDice.sides}+${ha.baseDice.modifier}` : ''
                    }
                  </span>
                </div>
              )}

              <button
                onClick={() => rollHeal(ha, healSlot, healTarget || characterId)}
                disabled={!healTarget && ha.target === 'ally'}
                style={{
                  width: '100%', padding: '9px',
                  fontFamily: 'var(--font-mono)', fontSize: 11,
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                  background: 'var(--green-dim)', border: '1px solid var(--green-mid)',
                  borderRadius: 'var(--radius)', color: 'var(--green-bright)', cursor: 'pointer'
                }}
              >
                Roll Healing{healTarget ? ` → ${playerCharacters[healTarget]?.name || 'Self'}` : ''}
              </button>
            </div>
          ))}
        </Section>
      )}

      {char.buffActions && char.buffActions.length > 0 && (
        <Section title="✨ Buffs">
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: char.colour, marginBottom: 10 }}>
            {bardicInspirationUses} / {char.buffActions[0]?.maxUses} uses remaining
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
              Give Inspiration To
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {partyChars.map(pc => {
                const sc = playerCharacters[pc.id]
                const alreadyHas = (activeBuffs[pc.id] || []).some(b => b.type === 'bardic')
                return (
                  <button
                    key={pc.id}
                    onClick={() => setBardicTarget(bardicTarget === pc.id ? null : pc.id)}
                    style={{
                      padding: '5px 12px', fontFamily: 'var(--font-mono)', fontSize: 10,
                      background: bardicTarget === pc.id ? `${char.colour}20` : 'transparent',
                      border: `1px solid ${bardicTarget === pc.id ? char.colour + '60' : 'var(--border)'}`,
                      borderRadius: 'var(--radius)',
                      color: alreadyHas ? 'var(--text-muted)' : bardicTarget === pc.id ? 'var(--text-primary)' : 'var(--text-muted)',
                      cursor: 'pointer',
                      opacity: alreadyHas ? 0.5 : 1
                    }}
                  >
                    {sc?.name || pc.id}{alreadyHas ? ' ✓' : ''}
                  </button>
                )
              })}
            </div>
          </div>

          {char.buffActions.map(ba => (
            <div key={ba.name} style={{
              background: 'var(--bg-raised)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)', padding: '12px 14px'
            }}>
              <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500, marginBottom: 4 }}>{ba.name}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                1d{ba.die} · {ba.action} · {ba.range}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10 }}>{ba.description}</div>
              <button
                onClick={() => bardicTarget && grantBardic(bardicTarget)}
                disabled={!bardicTarget || bardicInspirationUses <= 0}
                style={{
                  width: '100%', padding: '9px',
                  fontFamily: 'var(--font-mono)', fontSize: 11,
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                  background: bardicTarget && bardicInspirationUses > 0 ? `${char.colour}20` : 'var(--bg-raised)',
                  border: `1px solid ${bardicTarget && bardicInspirationUses > 0 ? char.colour + '60' : 'var(--border)'}`,
                  borderRadius: 'var(--radius)',
                  color: bardicTarget && bardicInspirationUses > 0 ? char.colour : 'var(--text-muted)',
                  cursor: bardicTarget && bardicInspirationUses > 0 ? 'pointer' : 'not-allowed'
                }}
              >
                Grant Inspiration{bardicTarget ? ` → ${playerCharacters[bardicTarget]?.name || ''}` : ''}
              </button>
            </div>
          ))}
        </Section>
      )}
    </>
  )
}
