import React, { useMemo, useState, useEffect } from 'react'
import SpellCard from '../SpellCard'
import FilterChipRow from '../ui/FilterChipRow.jsx'
import { ENTITY_FILTER_LABELS, matchesEntityFilter, spellToFilterTags } from '../../lib/entityFilters.js'
import { classifySpellCombat } from '@shared/lib/combat/spellCombatClassifier.js'
import DiceRichText from '@shared/components/combat/DiceRichText.jsx'
import { createPlayerDiceRollHandler } from '@shared/lib/diceText/dispatch.js'

export default function SpellsTab({
  char, spellSlots, activeSpell, spellSlotLevel, setSpellSlotLevel,
  spellTarget, setSpellTarget, spellTargets, setSpellTargets,
  enemies, partyChars, playerCharacters, characterId,
  openSpell, closeSpell, castSpell, resolveSpellForCasting,
  combatActive,
  stripSignal = null,
  pushRoll,
}) {
  const st = char?.stats && typeof char.stats === 'object' && !Array.isArray(char.stats) ? char.stats : {}
  const [spellFilter, setSpellFilter] = useState('all')
  const [expandedSpellId, setExpandedSpellId] = useState(null)

  useEffect(() => {
    if (!stripSignal?.type) return
    if (stripSignal.type === 'spell_attack') setSpellFilter('attack')
    if (stripSignal.type === 'spell_bonus') setSpellFilter('bonus_action')
  }, [stripSignal])

  const filteredSpellEntries = useMemo(() => {
    const out = []
    for (const [level, levelSpells] of Object.entries(char.spells || {})) {
      for (const spell of levelSpells || []) {
        const displaySpell = resolveSpellForCasting(spell)
        const tags = spellToFilterTags(displaySpell)
        if (!matchesEntityFilter(spellFilter, tags)) continue
        out.push({ level, spell, displaySpell })
      }
    }
    return out
  }, [char, spellFilter, resolveSpellForCasting])

  const spellsByLevel = useMemo(() => {
    const m = {}
    for (const row of filteredSpellEntries) {
      if (!m[row.level]) m[row.level] = []
      m[row.level].push(row)
    }
    return m
  }, [filteredSpellEntries])

  return (
    <>
      <FilterChipRow options={ENTITY_FILTER_LABELS} value={spellFilter} onChange={setSpellFilter} accent={char.colour} />

      <div style={{
        marginBottom: 14,
        padding: '8px 12px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '4px 16px',
        alignItems: 'center',
      }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Spellcasting
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-secondary)' }}>
          Attack {st.spellAttack ?? '—'}
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-secondary)' }}>
          Save DC {st.spellSaveDC ?? '—'}
        </span>
        {st.spellcastingAbility && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>
            {st.spellcastingAbility}
          </span>
        )}
      </div>

      {activeSpell && (
        <ActiveSpellPanel
          spell={activeSpell}
          char={char}
          spellSlots={spellSlots}
          spellSlotLevel={spellSlotLevel}
          setSpellSlotLevel={setSpellSlotLevel}
          spellTarget={spellTarget}
          setSpellTarget={setSpellTarget}
          spellTargets={spellTargets}
          setSpellTargets={setSpellTargets}
          enemies={enemies}
          partyChars={partyChars}
          playerCharacters={playerCharacters}
          characterId={characterId}
          closeSpell={closeSpell}
          castSpell={castSpell}
          combatActive={combatActive}
          pushRoll={pushRoll}
        />
      )}

      {Object.keys(char.spells || {}).sort((a, b) => {
        if (a === 'cantrips') return -1
        if (b === 'cantrips') return 1
        return Number(a) - Number(b)
      }).map((level) => {
        const levelSpells = spellsByLevel[level]
        if (!levelSpells?.length) return null
        const isCantrips = level === 'cantrips'
        const slotData = !isCantrips ? (spellSlots[level] || null) : null
        const slotsRemaining = slotData ? Math.max(0, slotData.max - slotData.used) : null

        return (
          <div key={level} style={{ marginBottom: 16 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 8,
              padding: '0 2px',
            }}>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                flexShrink: 0,
              }}>
                {isCantrips ? 'Cantrips' : `Level ${level}`}
              </span>

              {slotData && (
                <>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    {Array.from({ length: slotData.max }).map((_, i) => (
                      <div key={i} style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: i < slotsRemaining ? 'var(--green-mid)' : 'transparent',
                        border: '1px solid var(--green-dim)',
                        transition: 'background 0.3s',
                      }} />
                    ))}
                  </div>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 9,
                    color: slotsRemaining === 0 ? 'var(--danger)' : 'var(--text-muted)',
                  }}>
                    {slotsRemaining}/{slotData.max}
                  </span>
                </>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {levelSpells.map(({ spell, displaySpell }) => {
                const isActive = activeSpell?.name === displaySpell.name
                const slotKey = displaySpell.minSlot || (displaySpell.level > 0 ? displaySpell.level : null)
                const slot = slotKey ? (spellSlots[slotKey] || { max: 0, used: 0 }) : null
                const noSlots = !!(slot && slot.used >= slot.max && !isCantrips)
                const spellRowId = spell?.id || `${level}:${displaySpell.name}`

                return (
                  <SpellCard
                    key={spellRowId}
                    spell={displaySpell}
                    isActive={isActive}
                    isExhausted={noSlots}
                    isReferenceExpanded={expandedSpellId === spellRowId}
                    onToggleReference={() => setExpandedSpellId((prev) => (prev === spellRowId ? null : spellRowId))}
                    onCast={() => openSpell(displaySpell)}
                    onCancel={() => closeSpell()}
                    charColour={char.colour}
                    rollerName={char.name}
                  />
                )
              })}
            </div>
          </div>
        )
      })}
    </>
  )
}

function ActiveSpellPanel({
  spell, char, spellSlots, spellSlotLevel, setSpellSlotLevel,
  spellTarget, setSpellTarget, spellTargets, setSpellTargets,
  enemies, partyChars, playerCharacters, characterId,
  closeSpell, castSpell, combatActive, pushRoll,
}) {
  const cls = classifySpellCombat(spell)
  const needsEnemyTarget = combatActive && (spell.target === 'enemy' || spell.target === 'any')
  const isAreaOrMulti = spell.targetMode === 'area_all' || spell.targetMode === 'area_selective' || spell.targetMode === 'area' || spell.targetMode === 'multi_select'
  const needsAllyTarget = spell.target === 'ally'
  const isCantrip = spell.level === 0
  const slotLvl = spellSlotLevel ?? spell.minSlot
  const slotsForLvl = slotLvl ? (spellSlots[slotLvl] || { max: 0, used: 0 }) : null
  const noSlotLeft = !isCantrip && slotsForLvl && slotsForLvl.used >= slotsForLvl.max
  const enemyTargetReady = isAreaOrMulti ? spellTargets.length > 0 : !!spellTarget
  const canCast = !noSlotLeft && (!needsEnemyTarget || enemyTargetReady) && (!needsAllyTarget || spellTarget)
  const extraLevels = Math.max(0, Number(slotLvl || spell.minSlot || 0) - Number(spell.minSlot || 0))
  const effectiveDamageDice = spell.damage
    ? (spell.damage.count + ((spell.perLevel?.count || 0) * extraLevels))
    : null
  const handleInlineRoll = createPlayerDiceRollHandler({
    pushRoll,
    rollerName: char.name,
    defaultContextLabel: spell.name,
  })

  return (
    <div style={{
      background: `${char.colour}12`, border: `1px solid ${char.colour}40`,
      borderRadius: 'var(--radius-lg)', padding: 16, marginBottom: 12
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 16, color: 'var(--text-primary)', fontWeight: 600 }}>{spell.name}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>
            {spell.castingTime} · {spell.range}
            {spell.concentration ? ' · Concentration' : ''}
            {spell.aoe ? ` · ${spell.aoe}` : ''}
          </div>
        </div>
        <button onClick={closeSpell} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18, lineHeight: 1, padding: '0 4px' }}>×</button>
      </div>

      <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 12 }}>
        <DiceRichText
          text={spell.description}
          contextLabel={spell.name}
          onRoll={pushRoll ? handleInlineRoll : undefined}
        />
      </div>

      <div style={{ marginBottom: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '2px 8px', background: spell.actionType === 'bonus_action' ? 'rgba(196,160,64,0.2)' : spell.actionType === 'reaction' ? 'rgba(120,140,220,0.2)' : 'rgba(122,184,106,0.12)', border: '1px solid var(--border)', borderRadius: 4, color: spell.actionType === 'bonus_action' ? 'var(--warning)' : spell.actionType === 'reaction' ? '#a6b5ff' : 'var(--green-bright)' }}>
          {spell.actionType === 'bonus_action' ? 'Bonus Action' : spell.actionType === 'reaction' ? 'Reaction' : spell.actionType === 'action' ? 'Action' : spell.castingTime}
        </span>
        {spell.mechanic === 'attack' && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '2px 8px', background: 'rgba(180,80,80,0.15)', border: '1px solid rgba(180,80,80,0.3)', borderRadius: 4, color: 'var(--danger)' }}>
            Attack +{spell.toHit} · {spell.damage ? `${spell.damage.count}d${spell.damage.sides}${spell.damage.mod ? `+${spell.damage.mod}` : ''} ${spell.damage.type}` : 'on hit effect'}
          </span>
        )}
        {spell.mechanic === 'save' && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '2px 8px', background: 'rgba(180,120,40,0.15)', border: '1px solid rgba(180,120,40,0.3)', borderRadius: 4, color: 'var(--warning)' }}>
            {spell.saveType} DC {spell.saveDC}
            {spell.damage ? ` · ${spell.damage.count}d${spell.damage.sides} ${spell.damage.type}` : ''}
          </span>
        )}
        {spell.mechanic === 'auto' && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '2px 8px', background: 'rgba(100,100,220,0.15)', border: '1px solid rgba(100,100,220,0.3)', borderRadius: 4, color: '#a0a0ff' }}>
            Auto-hit · {spell.missiles} missiles · {spell.damage.count}d{spell.damage.sides}+{spell.damage.mod} {spell.damage.type} each
          </span>
        )}
        {spell.mechanic === 'heal' && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '2px 8px', background: 'rgba(50,160,80,0.15)', border: '1px solid rgba(50,160,80,0.3)', borderRadius: 4, color: 'var(--green-bright)' }}>
            Heal {spell.healDice ? `${spell.healDice.count}d${spell.healDice.sides}+${spell.healDice.mod}` : ''}
          </span>
        )}
        {spell.mechanic === 'utility' && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '2px 8px', background: 'rgba(120,120,120,0.15)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-muted)' }}>
            Utility
          </span>
        )}
        {(spell.combatProfile?.rules?.needs_manual_resolution || spell.targetMode === 'special') && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '2px 8px', background: 'rgba(176,144,48,0.15)', border: '1px solid rgba(176,144,48,0.3)', borderRadius: 4, color: 'var(--warning)' }}>
            Manual Resolution
          </span>
        )}
        {cls.confidence !== 'high' && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, padding: '2px 8px', background: 'rgba(100,100,120,0.12)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {cls.confidence} confidence
          </span>
        )}
      </div>

      {!isCantrip && spell.upcast && spell.minSlot && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5 }}>Slot Level</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {Object.keys(spellSlots).filter(l => parseInt(l) >= spell.minSlot).map(lvl => {
              const sl = spellSlots[lvl]
              const empty = sl.used >= sl.max
              return (
                <button key={lvl} onClick={() => setSpellSlotLevel(parseInt(lvl))} disabled={empty} style={{
                  padding: '4px 10px', fontFamily: 'var(--font-mono)', fontSize: 10,
                  background: spellSlotLevel === parseInt(lvl) ? `${char.colour}30` : 'transparent',
                  border: `1px solid ${spellSlotLevel === parseInt(lvl) ? char.colour : 'var(--border)'}`,
                  borderRadius: 'var(--radius)', color: empty ? 'var(--text-muted)' : spellSlotLevel === parseInt(lvl) ? char.colour : 'var(--text-secondary)',
                  cursor: empty ? 'not-allowed' : 'pointer', opacity: empty ? 0.4 : 1
                }}>
                  L{lvl} ({sl.max - sl.used})
                </button>
              )
            })}
          </div>
          {spell.damage && (
            <div style={{
              marginTop: 6,
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--text-muted)',
            }}>
              Damage scaling: {spell.damage.count}d{spell.damage.sides}
              {spell.perLevel?.count ? ` + ${spell.perLevel.count}d${spell.damage.sides}/slot` : ''}
              {' → '}
              {effectiveDamageDice}d{spell.damage.sides}
              {spell.damage.mod ? `${spell.damage.mod >= 0 ? '+' : ''}${spell.damage.mod}` : ''}
            </div>
          )}
        </div>
      )}

      {needsEnemyTarget && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5 }}>Target</div>
          {enemies.length === 0
            ? <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic' }}>No living enemies in combat</div>
            : (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {!isAreaOrMulti && <button onClick={() => setSpellTarget(null)} style={{ padding: '5px 10px', fontFamily: 'var(--font-mono)', fontSize: 10, background: !spellTarget ? 'var(--bg-raised)' : 'transparent', border: `1px solid ${!spellTarget ? 'var(--border-bright)' : 'var(--border)'}`, borderRadius: 'var(--radius)', color: !spellTarget ? 'var(--text-secondary)' : 'var(--text-muted)', cursor: 'pointer' }}>Free Roll</button>}
                {enemies.map(e => (
                  <button
                    key={e.id}
                    onClick={() => {
                      if (isAreaOrMulti) {
                        setSpellTargets(prev => (
                          prev.some(t => t.id === e.id)
                            ? prev.filter(t => t.id !== e.id)
                            : [...prev, e]
                        ))
                      } else {
                        setSpellTarget(e)
                      }
                    }}
                    style={{ padding: '5px 10px', fontFamily: 'var(--font-mono)', fontSize: 10, background: (isAreaOrMulti ? spellTargets.some(t => t.id === e.id) : spellTarget?.id === e.id) ? `${char.colour}20` : 'transparent', border: `1px solid ${(isAreaOrMulti ? spellTargets.some(t => t.id === e.id) : spellTarget?.id === e.id) ? char.colour + '60' : 'var(--border)'}`, borderRadius: 'var(--radius)', color: (isAreaOrMulti ? spellTargets.some(t => t.id === e.id) : spellTarget?.id === e.id) ? 'var(--text-primary)' : 'var(--text-muted)', cursor: 'pointer' }}
                  >
                    {e.name} ({e.curHp}/{e.maxHp} HP)
                  </button>
                ))}
              </div>
            )
          }
        </div>
      )}

      {needsAllyTarget && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5 }}>Target</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button onClick={() => setSpellTarget({ id: characterId, name: char.name })} style={{ padding: '5px 10px', fontFamily: 'var(--font-mono)', fontSize: 10, background: spellTarget?.id === characterId ? `${char.colour}20` : 'transparent', border: `1px solid ${spellTarget?.id === characterId ? char.colour + '60' : 'var(--border)'}`, borderRadius: 'var(--radius)', color: spellTarget?.id === characterId ? 'var(--text-primary)' : 'var(--text-muted)', cursor: 'pointer' }}>{char.name} (self)</button>
            {partyChars.map(pc => {
              const sc = playerCharacters[pc.id]
              return (
                <button key={pc.id} onClick={() => setSpellTarget({ id: pc.id, name: sc?.name || pc.id })} style={{ padding: '5px 10px', fontFamily: 'var(--font-mono)', fontSize: 10, background: spellTarget?.id === pc.id ? `${char.colour}20` : 'transparent', border: `1px solid ${spellTarget?.id === pc.id ? char.colour + '60' : 'var(--border)'}`, borderRadius: 'var(--radius)', color: spellTarget?.id === pc.id ? 'var(--text-primary)' : 'var(--text-muted)', cursor: 'pointer' }}>{sc?.name || pc.id}</button>
              )
            })}
          </div>
        </div>
      )}

      {noSlotLeft && (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--danger)', marginBottom: 8 }}>No L{slotLvl} slots remaining</div>
      )}

      <button
        onClick={() => canCast && castSpell(spell, spellSlotLevel ?? spell.minSlot, spellTarget, spellTargets)}
        disabled={!canCast}
        style={{
          width: '100%', padding: '10px',
          fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.1em',
          background: canCast ? `${char.colour}25` : 'transparent',
          border: `1px solid ${canCast ? char.colour + '70' : 'var(--border)'}`,
          borderRadius: 'var(--radius)', color: canCast ? char.colour : 'var(--text-muted)',
          cursor: canCast ? 'pointer' : 'not-allowed',
        }}
      >
        {spell.mechanic === 'attack' ? 'Roll Attack' :
         spell.mechanic === 'save' ? `Cast — ${spell.saveType} DC ${spell.saveDC}` :
         spell.mechanic === 'auto' ? 'Roll Missiles' :
         spell.mechanic === 'heal' ? 'Roll Healing' :
         'Cast Spell'}
      </button>
    </div>
  )
}
