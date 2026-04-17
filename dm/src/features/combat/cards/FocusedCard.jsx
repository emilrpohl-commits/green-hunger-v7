import React, { useState } from 'react'
import VitalBar from './subcomponents/VitalBar.jsx'
import ConditionChips from './subcomponents/ConditionChips.jsx'
import ActionEconomyTrack from './subcomponents/ActionEconomyTrack.jsx'
import QuickAdjustPanel from './subcomponents/QuickAdjustPanel.jsx'
import ActionsList from './subcomponents/ActionsList.jsx'
import { useCombatStore } from '../../../stores/combatStore.js'
import { isDead, isBloodied, kindColourRaw, typeLine, HP_COLOUR } from './constants.js'
import { greenMarkCombatTags } from '@shared/lib/greenMarks.js'
import DiceInlineText from '@shared/components/combat/DiceInlineText.jsx'
import { createDmDiceRollHandler } from '@shared/lib/diceText/dispatch.js'

const SAVE_ORDER = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']

function asNum(v, fallback = 0) {
  if (v && typeof v === 'object') {
    const fromScore = Number(v.score)
    if (Number.isFinite(fromScore)) return fromScore
    const fromValue = Number(v.value)
    if (Number.isFinite(fromValue)) return fromValue
    const fromMod = Number(v.mod)
    if (Number.isFinite(fromMod)) return fromMod
  }
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function deriveSaveMap(combatant) {
  const scoreSource = combatant.abilityScores
    || combatant.ability_scores
    || combatant.stats?.abilityScores
    || combatant.stats?.ability_scores
    || {}
  const saveMap = {}

  for (const ab of SAVE_ORDER) {
    const score = asNum(scoreSource[ab], 10)
    saveMap[ab] = Math.floor((score - 10) / 2)
  }

  const listed = combatant.savingThrows
    || combatant.saving_throws
    || combatant.stats?.savingThrows
    || combatant.stats?.saving_throws
    || []
  if (Array.isArray(listed)) {
    for (const raw of listed) {
      if (!raw) continue
      if (typeof raw === 'string') {
        const m = raw.match(/(STR|DEX|CON|INT|WIS|CHA)\s*([+-]?\d+)/i)
        if (!m) continue
        const name = m[1].toUpperCase()
        saveMap[name] = asNum(m[2], saveMap[name] ?? 0)
        continue
      }
      if (typeof raw === 'object') {
        const name = String(raw.name || raw.ability || '').toUpperCase()
        if (!SAVE_ORDER.includes(name)) continue
        const mod = raw.mod ?? raw.bonus ?? raw.value
        saveMap[name] = asNum(mod, saveMap[name] ?? 0)
      }
    }
  }
  return saveMap
}

function abilityScoreParts(raw) {
  if (raw && typeof raw === 'object') {
    const score = Number(raw.score ?? raw.value ?? 10)
    const modRaw = raw.mod
    const mod = Number.isFinite(Number(modRaw))
      ? Number(modRaw)
      : (Number.isFinite(score) ? Math.floor((score - 10) / 2) : 0)
    return {
      score: Number.isFinite(score) ? score : 10,
      mod,
    }
  }
  const score = Number(raw)
  const safe = Number.isFinite(score) ? score : 10
  return { score: safe, mod: Math.floor((safe - 10) / 2) }
}

/**
 * FocusedCard
 *
 * The carousel's active-tile card. Replaces ActivePortrait + CombatantCard hidePortrait.
 *
 * Structure:
 *   ┌─────────────────────────────────────────┐
 *   │  [Portrait 260px with gradient overlay]  │
 *   │  Name                    HP large         │
 *   │  Subtitle                / max + bar      │
 *   │  ▶ Active  ◈ Conc                        │
 *   ├─────────────────────────────────────────┤
 *   │  AC  SPD  Init  Prof  DC  [badges]       │
 *   │  [A●][BA●][R●]                           │
 *   │  [Condition chips]                       │
 *   ├─[Overview]──[Actions]───────────────────┤
 *   │  Overview: ability scores + senses       │
 *   │  Actions:  attack roller or spell slots  │
 *   ├─────────────────────────────────────────┤
 *   │  [Amt] [−DMG] [+Heal] quick chips       │
 *   └─────────────────────────────────────────┘
 */
export default function FocusedCard({ combatant, players = [] }) {
  const setInitiative = useCombatStore(s => s.setInitiative)
  const pushFeedEvent = useCombatStore(s => s.pushFeedEvent)

  // Enemies default to 'actions' tab so attacks are immediately visible
  const [activeTab, setActiveTab] = useState(combatant.type === 'enemy' ? 'actions' : 'overview')

  const dead     = isDead(combatant)
  const bloodied = isBloodied(combatant)
  const isPC     = combatant.type === 'player'
  const isEnemy  = combatant.type === 'enemy'
  const kind     = combatant.kind || (isPC ? 'pc' : 'enemy')
  const accent   = kindColourRaw(combatant)
  const subtitle = typeLine(combatant)

  const safeCurHp = typeof combatant.curHp === 'number' ? combatant.curHp : 0
  const safeMaxHp = typeof combatant.maxHp === 'number' && combatant.maxHp > 0 ? combatant.maxHp : 1
  const hpPct     = Math.min(100, (safeCurHp / safeMaxHp) * 100)
  const hpColour  = HP_COLOUR(hpPct, safeCurHp)

  const portrait = combatant.image
    ? (
      /^https?:\/\//i.test(String(combatant.image)) || String(combatant.image).startsWith('data:')
        ? combatant.image
        : (isEnemy
          ? combatant.image
          : `https://emilrpohl-commits.github.io/greenhunger-players/characters/${combatant.image}`)
    )
    : null

  const scores = combatant.abilityScores || combatant.stats?.abilityScores
  const SCORE_LABELS = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']

  function mod(scoreOrObj) {
    const m = abilityScoreParts(scoreOrObj).mod
    return m >= 0 ? `+${m}` : String(m)
  }

  // Extra stat badges for the info bar
  const extraBadges = []
  if (combatant.initiative != null)          extraBadges.push({ label: 'Init', value: combatant.initiative })
  if (combatant.stats?.proficiencyBonus)     extraBadges.push({ label: 'Prof', value: `+${combatant.stats.proficiencyBonus}` })
  if (combatant.stats?.spellSaveDC)          extraBadges.push({ label: 'DC', value: combatant.stats.spellSaveDC })
  if (combatant.stats?.passivePerception)    extraBadges.push({ label: 'PP', value: combatant.stats.passivePerception })
  if (combatant.challengeRating != null)     extraBadges.push({ label: 'CR', value: combatant.challengeRating })
  const handleInlineRoll = createDmDiceRollHandler({
    pushFeedEvent,
    type: 'roll',
    shared: true,
    defaultContextLabel: combatant.name,
  })

  return (
    <div style={{
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      background: 'var(--bg-card)',
      border: `1px solid ${bloodied && !dead ? 'var(--bloodied-border)' : 'var(--border)'}`,
      boxShadow: `0 0 40px ${accent}30, 0 4px 20px rgba(0,0,0,0.6)`,
      transition: 'box-shadow 380ms ease',
    }}>

      {/* ══ PORTRAIT ══════════════════════════════════════════════════════ */}
      <div style={{ position: 'relative', height: 260, overflow: 'hidden' }}>
        {portrait ? (
          <img
            src={portrait}
            alt={combatant.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center', display: 'block' }}
            onError={e => { e.target.style.display = 'none' }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontSize: 64,
            color: accent, background: `${accent}10`,
          }}>
            {combatant.name[0]}
          </div>
        )}

        {/* Bottom gradient */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, transparent 30%, rgba(8,10,8,0.95) 100%)',
          pointerEvents: 'none',
        }} />

        {/* Side colour halo */}
        <div style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(ellipse at center bottom, ${accent}20 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />

        {/* Identity overlay: bottom-left */}
        <div style={{ position: 'absolute', bottom: 14, left: 16 }}>
          <div style={{
            fontFamily: isPC ? 'var(--font-display)' : 'var(--font-body)',
            fontSize: 22, color: 'var(--text-primary)',
            textShadow: '0 2px 10px rgba(0,0,0,0.9)',
            lineHeight: 1.1,
          }}>
            {combatant.name}
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 9,
            color: 'var(--text-muted)', marginTop: 3,
            letterSpacing: '0.05em',
          }}>
            {subtitle}
          </div>
          <div style={{ display: 'flex', gap: 5, marginTop: 5 }}>
            {/* Active turn badge */}
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 8, padding: '2px 7px',
              background: 'rgba(122,184,106,0.2)', border: '1px solid rgba(122,184,106,0.4)',
              borderRadius: 20, color: 'var(--green-bright)',
              textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>▶ Active Turn</span>
            {combatant.concentration && (
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 8, padding: '2px 7px',
                background: 'rgba(196,160,64,0.18)', border: '1px solid rgba(196,160,64,0.4)',
                borderRadius: 20, color: 'var(--warning)',
                textTransform: 'uppercase', letterSpacing: '0.08em',
                animation: 'card-pulse-conc 2s ease-in-out infinite',
              }}>◈ Concentrating</span>
            )}
            {bloodied && !dead && (
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 8, padding: '2px 7px',
                background: 'rgba(180,64,32,0.2)', border: '1px solid rgba(180,64,32,0.4)',
                borderRadius: 20, color: 'var(--rot-bright)',
                textTransform: 'uppercase', letterSpacing: '0.08em',
              }}>Bloodied</span>
            )}
            {isPC && (combatant.greenMarks ?? 0) >= 2 && greenMarkCombatTags(combatant.greenMarks ?? 0).map((t) => (
              <span
                key={t.key}
                style={{
                  fontFamily: 'var(--font-mono)', fontSize: 8, padding: '2px 7px',
                  background: t.key === 'necrotic' ? 'rgba(100, 50, 120, 0.25)' : 'rgba(40, 70, 35, 0.3)',
                  border: t.key === 'necrotic' ? '1px solid rgba(160, 90, 200, 0.45)' : '1px solid rgba(90, 140, 75, 0.4)',
                  borderRadius: 20,
                  color: t.key === 'necrotic' ? '#d4b8e8' : '#b8d9a8',
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                }}
              >
                {t.label}
              </span>
            ))}
          </div>
        </div>

        {/* HP overlay: bottom-right */}
        <div style={{ position: 'absolute', bottom: 14, right: 16, textAlign: 'right' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, justifyContent: 'flex-end' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>HP</span>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 40, fontWeight: 700,
              color: hpColour, lineHeight: 1,
              textShadow: `0 2px 12px ${hpColour}80`,
            }}>
              {safeCurHp}
            </span>
            {(combatant.tempHp ?? 0) > 0 && (
              <span style={{ fontSize: 18, color: 'var(--info)' }}>●+{combatant.tempHp}</span>
            )}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
            / {safeMaxHp} hp
          </div>
        </div>
      </div>

      {/* HP bar — uses the same safeCurHp/safeMaxHp as the number overlay */}
      <div className="hp-track" style={{ borderRadius: 0 }}>
        <div className="hp-fill" style={{ width: `${hpPct}%`, background: hpColour }} />
      </div>

      {/* ══ INFO BAR ═══════════════════════════════════════════════════════ */}
      <div style={{ padding: '10px 14px 6px', borderBottom: '1px solid var(--border)' }}>
        {/* Stat badges row */}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
          {/* Initiative input */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '2px 7px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
          }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Init</span>
            <input
              type="number"
              value={combatant.initiative ?? ''}
              onChange={e => setInitiative(combatant.id, e.target.value)}
              style={{
                width: 32, fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
                background: 'transparent', border: 'none', outline: 'none',
                color: 'var(--text-secondary)', textAlign: 'center',
              }}
            />
          </div>
          <StatPill label="AC" value={combatant.effectiveAc ?? combatant.ac ?? '—'} />
          {(combatant.speed || combatant.stats?.speed) && (
            <StatPill label="SPD" value={`${combatant.speed || combatant.stats?.speed}′`} />
          )}
          {combatant.stats?.proficiencyBonus && (
            <StatPill label="Prof" value={`+${combatant.stats.proficiencyBonus}`} />
          )}
          {combatant.stats?.spellSaveDC && (
            <StatPill label="DC" value={combatant.stats.spellSaveDC} accent />
          )}
          {combatant.stats?.passivePerception && (
            <StatPill label="PP" value={combatant.stats.passivePerception} />
          )}
          {combatant.challengeRating != null && (
            <StatPill label="CR" value={combatant.challengeRating} />
          )}
        </div>
        <SavingThrowsStrip combatant={combatant} />

        {/* Action economy */}
        {!dead && (
          <ActionEconomyTrack
            combatant={combatant}
            showLegendary={kind === 'boss' || kind === 'elite'}
          />
        )}
      </div>

      {/* ══ CONDITIONS ═════════════════════════════════════════════════════ */}
      {!dead && (
        <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)' }}>
          <ConditionChips combatant={combatant} compact={false} />
        </div>
      )}

      {/* ══ TABS ════════════════════════════════════════════════════════════ */}
      <div className="fc-tab-bar">
        <button
          className={`fc-tab ${activeTab === 'overview' ? 'fc-tab--active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`fc-tab ${activeTab === 'actions' ? 'fc-tab--active' : ''}`}
          onClick={() => setActiveTab('actions')}
        >
          Actions
        </button>
        {(combatant.traits?.length > 0 || combatant.resistances?.length > 0) && (
          <button
            className={`fc-tab ${activeTab === 'traits' ? 'fc-tab--active' : ''}`}
            onClick={() => setActiveTab('traits')}
          >
            Traits
          </button>
        )}
      </div>

      {/* ── Tab content ── */}
      <div style={{ padding: '10px 14px', minHeight: 80 }}>

        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* Ability scores grid */}
            {scores && (
              <div>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 8,
                  color: 'var(--text-muted)', textTransform: 'uppercase',
                  letterSpacing: '0.1em', marginBottom: 5,
                }}>
                  Ability Scores
                </div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {SCORE_LABELS.map(s => {
                    const val = scores[s]
                    if (val == null) return null
                    const parts = abilityScoreParts(val)
                    return (
                      <div key={s} style={{
                        padding: '4px 8px', textAlign: 'center',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)',
                      }}>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--text-primary)', fontWeight: 700, lineHeight: 1.1 }}>{parts.score}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-secondary)' }}>{mod(parts.score)}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Senses / resistances / immunities */}
            {(combatant.senses?.length > 0 || combatant.resistances?.length > 0 || combatant.immunities?.length > 0) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {combatant.senses?.length > 0 && (
                  <MetaRow label="Senses" value={combatant.senses.join(', ')} />
                )}
                {combatant.resistances?.length > 0 && (
                  <MetaRow label="Resist" value={combatant.resistances.join(', ')} colour="#6080c0" />
                )}
                {combatant.immunities?.length > 0 && (
                  <MetaRow label="Immune" value={combatant.immunities.join(', ')} colour="#70a050" />
                )}
                {combatant.vulnerabilities?.length > 0 && (
                  <MetaRow label="Vuln" value={combatant.vulnerabilities.join(', ')} colour="var(--danger)" />
                )}
              </div>
            )}

            {/* Notes */}
            {combatant.notes && (
              <DiceInlineText
                text={combatant.notes}
                contextLabel={`${combatant.name}: notes`}
                onRoll={handleInlineRoll}
                style={{
                  fontFamily: 'var(--font-body)', fontSize: 12,
                  color: 'var(--text-secondary)', lineHeight: 1.5,
                  padding: '6px 8px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  display: 'block',
                }}
              />
            )}

            {/* Fallback for PCs with no extra data */}
            {!scores && !combatant.senses && !combatant.resistances && !combatant.notes && (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>
                No additional data available
              </div>
            )}
          </div>
        )}

        {activeTab === 'actions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Enemy: full attack panel — always expanded inline since this is the actions tab */}
            {isEnemy && !dead && (
              <ActionsList combatant={combatant} players={players} mode="inline" />
            )}

            {/* PC: spell slots */}
            {isPC && combatant.stats?.spellSlots && (
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
                  Spell Slots
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {Object.entries(combatant.stats.spellSlots).map(([level, slots]) => {
                    if (!slots || (!slots.total && !slots.max)) return null
                    const total = slots.total || slots.max || 0
                    const used  = slots.used || (total - (slots.remaining ?? total))
                    return (
                      <div key={level} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', width: 40, textTransform: 'uppercase' }}>
                          Lv {level}
                        </span>
                        <div style={{ display: 'flex', gap: 3 }}>
                          {Array.from({ length: total }).map((_, i) => (
                            <div key={i} style={{
                              width: 14, height: 14, borderRadius: '50%',
                              background: i < total - used ? `${accent}80` : 'rgba(255,255,255,0.05)',
                              border: `1px solid ${i < total - used ? accent : 'var(--border)'}`,
                            }} />
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Trait / special actions for monsters */}
            {isEnemy && combatant.actionOptions?.filter(a => a.type === 'special' || a.type === 'trait').map(a => (
              <div key={a.name} style={{
                padding: '6px 9px',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
              }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>
                  {a.name}
                  {a.recharge && <span style={{ color: 'var(--warning)', marginLeft: 6, fontSize: 9 }}>Recharge {a.recharge}</span>}
                </div>
                {a.description && (
                  <DiceInlineText
                    text={a.description}
                    contextLabel={`${combatant.name}: ${a.name}`}
                    onRoll={handleInlineRoll}
                    style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-muted)', marginTop: 3, lineHeight: 1.45, display: 'block' }}
                  />
                )}
              </div>
            ))}

            {!isEnemy && !combatant.stats?.spellSlots && (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>
                No action data available
              </div>
            )}
          </div>
        )}

        {activeTab === 'traits' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {combatant.traits?.map(t => (
              <div key={t.id || t.name} style={{ padding: '6px 9px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>{t.name}</div>
                <DiceInlineText
                  text={t.description}
                  contextLabel={`${combatant.name}: ${t.name}`}
                  onRoll={handleInlineRoll}
                  style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.45, display: 'block' }}
                />
              </div>
            ))}
            {combatant.resistances?.length > 0 && (
              <MetaRow label="Resist" value={combatant.resistances.join(', ')} colour="#6080c0" />
            )}
            {combatant.immunities?.length > 0 && (
              <MetaRow label="Immune" value={combatant.immunities.join(', ')} colour="#70a050" />
            )}
          </div>
        )}
      </div>

      {/* ══ QUICK ADJUST ════════════════════════════════════════════════════ */}
      {!dead && (
        <div style={{
          padding: '9px 14px 12px',
          borderTop: '1px solid var(--border)',
          background: 'rgba(0,0,0,0.1)',
          position: 'relative',
        }}>
          <QuickAdjustPanel combatant={combatant} showHealChips />
        </div>
      )}
    </div>
  )
}

function StatPill({ label, value, accent: accentProp = false }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4,
      padding: '2px 8px',
      background: accentProp ? 'rgba(122,184,106,0.06)' : 'rgba(255,255,255,0.03)',
      border: `1px solid ${accentProp ? 'rgba(122,184,106,0.25)' : 'var(--border)'}`,
      borderRadius: 'var(--radius)',
    }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: accentProp ? 'var(--green-bright)' : 'var(--text-secondary)', fontWeight: 700 }}>
        {value}
      </span>
    </div>
  )
}

function MetaRow({ label, value, colour }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)',
        textTransform: 'uppercase', letterSpacing: '0.08em',
        flexShrink: 0, paddingTop: 1, width: 44,
      }}>
        {label}
      </span>
      <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: colour || 'var(--text-secondary)', lineHeight: 1.4 }}>
        {value}
      </span>
    </div>
  )
}

function SavingThrowsStrip({ combatant }) {
  const saveMap = deriveSaveMap(combatant)
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
      {SAVE_ORDER.map((ab) => {
        const mod = asNum(saveMap[ab], 0)
        const text = mod >= 0 ? `+${mod}` : String(mod)
        return <StatPill key={ab} label={ab} value={text} />
      })}
    </div>
  )
}
