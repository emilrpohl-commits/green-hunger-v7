import React, { useRef, useState } from 'react'
import ConditionChips from './subcomponents/ConditionChips.jsx'
import ActionsList from './subcomponents/ActionsList.jsx'
import { useCombatStore } from '../../../stores/combatStore.js'
import { useSessionStore } from '../../../stores/sessionStore.js'
import {
  isDead, isBloodied, kindColourRaw, typeLine, HP_COLOUR,
} from './constants.js'
import { greenMarkCombatTags } from '@shared/lib/greenMarks.js'
import { DAMAGE_TYPE_SELECT_OPTIONS } from '@shared/lib/rules/damagePipeline.js'
import {
  readLastManualDamageType,
  writeLastManualDamageType,
} from '../lastManualDamageTypeStorage.js'
import { combatQoePolishEnabled } from '@shared/lib/combat/qoeGate.js'

const safeHp = (n) => (typeof n === 'number' && isFinite(n) ? n : 0)
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

// ─────────────────────────────────────────────────────────────────────────────
// Shared HP bar + badges strip
// ─────────────────────────────────────────────────────────────────────────────
function HpStrip({ curHp, maxHp, tempHp, ac, speed, large = false }) {
  const cur    = safeHp(curHp)
  const max    = safeHp(maxHp) || 1
  const tmp    = safeHp(tempHp)
  const pct    = Math.min(100, (cur / max) * 100)
  const colour = HP_COLOUR(pct, cur)

  return (
    <div>
      {/* HP numbers row */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>HP</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: large ? 28 : 20, fontWeight: 700, color: colour, lineHeight: 1, transition: 'color 0.4s ease' }}>
            {cur}
          </span>
          {tmp > 0 && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: large ? 14 : 11, color: 'var(--info)', lineHeight: 1 }}>
              ●+{tmp}
            </span>
          )}
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', lineHeight: 1 }}>
            / {safeHp(maxHp)}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 5 }}>
          <StatBadge label="AC" value={ac ?? '—'} />
          {speed     && <StatBadge label="SPD" value={`${speed}′`} />}
        </div>
      </div>

      {/* HP bar with bloodied tick at 50% */}
      <div style={{ marginTop: 4, height: 5, background: 'var(--hp-bar-track)', borderRadius: 3, position: 'relative', overflow: 'visible' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: colour, borderRadius: 3, transition: 'width 0.45s ease, background 0.45s ease' }} />
        <div style={{ position: 'absolute', top: -2, left: '50%', width: 1, height: 9, background: 'rgba(180,80,40,0.5)', pointerEvents: 'none' }} />
      </div>
    </div>
  )
}

function SavingThrowsStrip({ combatant }) {
  const saveMap = deriveSaveMap(combatant)
  return (
    <div style={{ marginTop: 5, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {SAVE_ORDER.map((ab) => {
        const mod = asNum(saveMap[ab], 0)
        const text = mod >= 0 ? `+${mod}` : String(mod)
        return <StatBadge key={ab} label={ab} value={text} />
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Action economy — three buttons: Action | Bonus Action | Reaction
// ─────────────────────────────────────────────────────────────────────────────
function ActionEconomy({ combatant }) {
  const useCombatantActionType = useCombatStore(s => s.useCombatantActionType)
  const economy = combatant.actionEconomy || {}

  const PIPS = [
    { key: 'action',       storeKey: 'actionAvailable',      label: 'Action'  },
    { key: 'bonus_action', storeKey: 'bonusActionAvailable', label: 'Bonus'   },
    { key: 'reaction',     storeKey: 'reactionAvailable',    label: 'Reaction'},
  ]

  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {PIPS.map(pip => {
        const ready = economy[pip.storeKey] !== false
        return (
          <button
            key={pip.key}
            title={`${pip.label} — ${ready ? 'available (click to mark used)' : 'used this turn'}`}
            onClick={() => ready && useCombatantActionType(combatant.id, pip.key, pip.label)}
            style={{
              flex: 1, padding: '5px 4px',
              fontFamily: 'var(--font-mono)', fontSize: 8.5,
              textTransform: 'uppercase', letterSpacing: '0.06em',
              background: ready ? 'rgba(122,184,106,0.10)' : 'rgba(0,0,0,0.15)',
              border: `1px solid ${ready ? 'rgba(122,184,106,0.28)' : 'var(--border)'}`,
              borderRadius: 'var(--radius)',
              color: ready ? 'var(--green-bright)' : 'var(--text-muted)',
              cursor: ready ? 'pointer' : 'not-allowed',
              transition: 'all 140ms ease',
              textAlign: 'center',
            }}
          >
            {ready ? '●' : '○'} {pip.label}
          </button>
        )
      })}
      {combatant.concentration && (
        <div style={{
          padding: '5px 7px',
          fontFamily: 'var(--font-mono)', fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.06em',
          border: '1px solid rgba(196,160,64,0.35)',
          borderRadius: 'var(--radius)', color: 'var(--warning)',
          background: 'rgba(196,160,64,0.08)',
          flexShrink: 0,
        }}>
          ◈
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Quick HP adjustment panel
// ─────────────────────────────────────────────────────────────────────────────
function QuickHp({ combatant }) {
  const damageCombatant = useCombatStore(s => s.damageCombatant)
  const healCombatant   = useCombatStore(s => s.healCombatant)
  const setTempHp       = useCombatStore(s => s.setTempHp)

  const [amt, setAmt]   = useState('')
  const [damageTypeId, setDamageTypeId] = useState(readLastManualDamageType)
  const [flash, setFlash] = useState(null)
  const timerRef = useRef(null)
  const flashDurationMs = combatQoePolishEnabled ? 380 : 480

  function triggerFlash(t) {
    clearTimeout(timerRef.current)
    setFlash(t)
    timerRef.current = setTimeout(() => setFlash(null), flashDurationMs)
  }

  function applyDmg(n) {
    const v = n != null ? n : parseInt(amt)
    if (!v || v <= 0) return
    writeLastManualDamageType(damageTypeId)
    damageCombatant(combatant.id, v, damageTypeId || null)
    setAmt('')
    triggerFlash('dmg')
  }

  function applyHeal(n) {
    const v = n != null ? n : parseInt(amt)
    if (!v || v <= 0) return
    healCombatant(combatant.id, v)
    setAmt('')
    triggerFlash('heal')
  }

  function applyTemp() {
    const v = parseInt(amt)
    if (!v || v <= 0) return
    if (typeof setTempHp === 'function') {
      setTempHp(combatant.id, v)
    } else {
      // fallback: store doesn't expose setTempHp yet
      healCombatant(combatant.id, 0)
    }
    setAmt('')
  }

  return (
    <div style={{ position: 'relative' }}>
      {flash && (
        <div
          style={{
            position: 'absolute', inset: 0, zIndex: 5,
            pointerEvents: 'none', borderRadius: 'var(--radius)',
            animation: `${flash === 'dmg' ? 'hp-flash' : 'hp-heal-flash'} ${flashDurationMs}ms ease forwards`,
          }}
        />
      )}
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <input
          type="number" value={amt}
          onChange={e => setAmt(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && applyDmg()}
          placeholder="Amt" min="0"
          style={{
            width: 54, padding: '4px 6px',
            fontFamily: 'var(--font-mono)', fontSize: 13,
            background: 'var(--bg-raised)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', color: 'var(--text-primary)', outline: 'none',
          }}
        />
        <ActionBtn onClick={() => applyDmg()} label="−DMG" colour="var(--danger)" bg="rgba(196,64,64,0.12)" border="rgba(196,64,64,0.4)" />
        <ActionBtn onClick={() => applyHeal()} label="+Heal" colour="var(--green-bright)" bg="rgba(122,184,106,0.08)" border="rgba(122,184,106,0.3)" />
        <ActionBtn onClick={applyTemp} label="+Temp" colour="var(--info)" bg="rgba(64,128,196,0.10)" border="rgba(64,128,196,0.35)" />
        <select
          value={damageTypeId}
          onChange={(e) => setDamageTypeId(e.target.value)}
          title="Damage type (R/V/I when rules pipeline flag is on)"
          style={{
            maxWidth: 100,
            padding: '3px 5px',
            fontSize: 9.5,
            fontFamily: 'var(--font-mono)',
            background: 'var(--bg-raised)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            color: 'var(--text-muted)',
            cursor: 'pointer',
          }}
        >
          {DAMAGE_TYPE_SELECT_OPTIONS.map((o) => (
            <option key={o.value || 'untyped'} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      {/* Quick chips */}
      <div style={{ display: 'flex', gap: 3, marginTop: 4, flexWrap: 'wrap' }}>
        {[2, 4, 5, 6, 8, 10, 12].map(n => (
          <button
            key={n}
            onClick={() => applyDmg(n)}
            style={{
              padding: '1px 5px', fontSize: 9.5,
              fontFamily: 'var(--font-mono)',
              background: 'var(--bg-raised)',
              border: '1px solid rgba(196,64,64,0.22)',
              borderRadius: 'var(--radius)',
              color: 'var(--danger)', cursor: 'pointer',
            }}
          >
            -{n}
          </button>
        ))}
        {[4, 6, 8].map(n => (
          <button
            key={`h${n}`}
            onClick={() => applyHeal(n)}
            style={{
              padding: '1px 5px', fontSize: 9.5,
              fontFamily: 'var(--font-mono)',
              background: 'var(--bg-raised)',
              border: '1px solid rgba(122,184,106,0.22)',
              borderRadius: 'var(--radius)',
              color: 'var(--green-bright)', cursor: 'pointer',
            }}
          >
            +{n}
          </button>
        ))}
      </div>
    </div>
  )
}

function ActionBtn({ onClick, label, colour, bg, border }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '4px 10px', fontSize: 10.5,
        fontFamily: 'var(--font-mono)', letterSpacing: '0.03em',
        background: bg, border: `1px solid ${border}`,
        borderRadius: 'var(--radius)', color: colour, cursor: 'pointer',
      }}
    >
      {label}
    </button>
  )
}

function StatBadge({ label, value }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 3,
      padding: '2px 7px',
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
    }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 7.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>{value}</span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PC card layout — inspired by mockup
// ─────────────────────────────────────────────────────────────────────────────
function PCCard({ combatant, isActive, flashActive }) {
  const setInitiative = useCombatStore(s => s.setInitiative)
  const markCombatantDeathSave = useCombatStore((s) => s.markCombatantDeathSave)
  const markDeathSave = useSessionStore((s) => s.markDeathSave)

  const bloodied = isBloodied(combatant)
  const dead     = safeHp(combatant.curHp) === 0
  const accent   = kindColourRaw(combatant)
  const subtitle = typeLine(combatant)

  const portrait = combatant.image
    ? (
      /^https?:\/\//i.test(String(combatant.image)) || String(combatant.image).startsWith('data:')
        ? combatant.image
        : `https://emilrpohl-commits.github.io/greenhunger-players/characters/${combatant.image}`
    )
    : null

  const topBorderColour = isActive ? 'var(--active-border)' : 'var(--green-dim)'

  const cardClasses = [
    'ccard',
    isActive  ? 'ccard--active'   : '',
    bloodied  ? 'ccard--bloodied' : '',
    dead      ? 'ccard--dead'     : '',
    combatant.concentration && !isActive ? 'ccard--concentrating' : '',
  ].filter(Boolean).join(' ')

  return (
    <div
      className={cardClasses}
      style={{
        background: 'var(--bg-card)',
        border: `1px solid ${isActive ? 'var(--green-dim)' : 'var(--border)'}`,
        borderTop: `3px solid ${topBorderColour}`,
        boxShadow: flashActive ? '0 0 0 2px rgba(122,184,106,0.4), 0 0 24px rgba(122,184,106,0.3)' : 'none',
      }}
    >
      {/* ── Header bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '7px 12px 5px',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
          {/* PC symbol */}
          <span style={{ color: accent, fontSize: 10, flexShrink: 0 }}>◆</span>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: 13, fontWeight: 600, letterSpacing: '0.04em',
            color: dead ? 'var(--text-muted)' : 'var(--text-primary)',
            textDecoration: dead ? 'line-through' : 'none',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {combatant.name}
          </span>
          {isActive && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 7, padding: '1px 5px', background: 'rgba(122,184,106,0.15)', border: '1px solid rgba(122,184,106,0.35)', borderRadius: 'var(--radius)', color: 'var(--green-bright)', textTransform: 'uppercase', letterSpacing: '0.07em', flexShrink: 0 }}>▶ Active</span>
          )}
          {bloodied && !dead && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 7, padding: '1px 5px', background: 'rgba(180,64,32,0.15)', border: '1px solid rgba(180,64,32,0.35)', borderRadius: 'var(--radius)', color: 'var(--rot-bright)', textTransform: 'uppercase', letterSpacing: '0.07em', flexShrink: 0 }}>Bloodied</span>
          )}
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {subtitle}
          </span>
        </div>
        {/* Initiative badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)' }}>Init</span>
          <input
            type="number" value={combatant.initiative ?? ''}
            onChange={e => setInitiative(combatant.id, e.target.value)}
            style={{
              width: 36, height: 22, textAlign: 'center',
              fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700,
              background: isActive ? `${accent}25` : 'rgba(0,0,0,0.4)',
              border: `1px solid ${isActive ? `${accent}80` : 'rgba(255,255,255,0.1)'}`,
              borderRadius: 'var(--radius)', color: isActive ? accent : 'var(--text-secondary)',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* ── Body: portrait + stats ── */}
      <div style={{ display: 'flex', alignItems: 'stretch' }}>

        {/* Portrait */}
        <div style={{
          width: 110, flexShrink: 0, position: 'relative', overflow: 'hidden',
          background: 'rgba(22,44,18,0.4)', minHeight: 100,
        }}>
          {portrait ? (
            <img src={portrait} alt={combatant.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center', display: 'block' }}
              onError={e => { e.target.style.display = 'none' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', minHeight: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 28, color: accent }}>
              {combatant.name[0]}
            </div>
          )}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, transparent 50%, rgba(10,12,10,0.65) 100%)', pointerEvents: 'none' }} />
          {isActive && (
            <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to right, ${accent}18, transparent)`, pointerEvents: 'none' }} />
          )}
        </div>

        {/* Stats panel */}
        <div style={{ flex: 1, padding: '10px 12px 10px', display: 'flex', flexDirection: 'column', gap: 7, minWidth: 0 }}>
          <HpStrip
            curHp={combatant.curHp} maxHp={combatant.maxHp} tempHp={combatant.tempHp}
            ac={combatant.effectiveAc ?? combatant.ac} speed={combatant.speed || combatant.stats?.speed}
            large
          />
          <SavingThrowsStrip combatant={combatant} />

          {(combatant.greenMarks ?? 0) >= 2 && (
            <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {greenMarkCombatTags(combatant.greenMarks ?? 0).map((t) => (
                <span
                  key={t.key}
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 7,
                    padding: '2px 6px',
                    borderRadius: 'var(--radius)',
                    border: t.key === 'necrotic' ? '1px solid rgba(160, 90, 200, 0.45)' : '1px solid rgba(90, 140, 75, 0.4)',
                    background: t.key === 'necrotic' ? 'rgba(100, 50, 120, 0.2)' : 'rgba(40, 70, 35, 0.25)',
                    color: t.key === 'necrotic' ? '#d4b8e8' : '#b8d9a8',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  {t.label}
                </span>
              ))}
            </div>
          )}

          {/* Concentration spell */}
          {combatant.concentration && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', background: 'rgba(196,160,64,0.07)', border: '1px solid rgba(196,160,64,0.25)', borderRadius: 'var(--radius)' }}>
              <span style={{ fontSize: 10, color: 'var(--warning)' }}>◈</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--warning)' }}>Concentrating</span>
            </div>
          )}

          {!dead && (
            <>
              <ActionEconomy combatant={combatant} />
              <QuickHp combatant={combatant} />
            </>
          )}
        </div>
      </div>

      {/* ── Conditions strip ── */}
      {!dead && (
        <div style={{ padding: '6px 12px 8px', borderTop: '1px solid var(--border)', background: 'rgba(0,0,0,0.05)' }}>
          <ConditionChips combatant={combatant} compact={false} />
        </div>
      )}

      {/* Death saves */}
      {dead && (
        <div style={{ padding: '6px 12px 8px', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--danger)', textAlign: 'center', textTransform: 'uppercase', marginBottom: 6 }}>
            0 HP — Death Saves
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 10, color: 'var(--green-bright)' }}>✓</span>
              {[0, 1, 2].map((i) => (
                <button
                  key={`pc-succ-${i}`}
                  type="button"
                  onClick={() => {
                    const delta = i < (combatant.deathSaves?.successes || 0) ? -1 : 1
                    markCombatantDeathSave(combatant.id, 'successes', delta)
                    markDeathSave(combatant.id, 'successes', delta)
                  }}
                  style={{
                    width: 11, height: 11, borderRadius: '50%',
                    border: '1px solid var(--green-dim)',
                    background: i < (combatant.deathSaves?.successes || 0) ? 'var(--green-bright)' : 'transparent',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 10, color: 'var(--danger)' }}>✗</span>
              {[0, 1, 2].map((i) => (
                <button
                  key={`pc-fail-${i}`}
                  type="button"
                  onClick={() => {
                    const delta = i < (combatant.deathSaves?.failures || 0) ? -1 : 1
                    markCombatantDeathSave(combatant.id, 'failures', delta)
                    markDeathSave(combatant.id, 'failures', delta)
                  }}
                  style={{
                    width: 11, height: 11, borderRadius: '50%',
                    border: '1px solid rgba(176,48,48,0.45)',
                    background: i < (combatant.deathSaves?.failures || 0) ? 'var(--danger)' : 'transparent',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Enemy card layout — attack section always visible
// ─────────────────────────────────────────────────────────────────────────────
function EnemyCard({ combatant, isActive, flashActive, players }) {
  const setInitiative = useCombatStore(s => s.setInitiative)

  const dead     = isDead(combatant)
  const bloodied = isBloodied(combatant)
  const kind     = combatant.kind || 'enemy'
  const accent   = kindColourRaw(combatant)
  const subtitle = typeLine(combatant)

  const portrait = combatant.image || null

  const topBorderColour = isActive       ? 'var(--active-border)'
    : kind === 'boss'   ? 'var(--boss-border)'
    : kind === 'elite'  ? 'var(--elite-border)'
    : dead              ? 'rgba(80,40,30,0.5)'
    : 'var(--rot-mid)'

  const cardClasses = [
    'ccard',
    isActive   ? 'ccard--active'        : '',
    bloodied   ? 'ccard--bloodied'      : '',
    dead       ? 'ccard--dead'          : '',
    kind === 'boss'  ? 'ccard--boss'    : '',
    kind === 'elite' ? 'ccard--elite'   : '',
  ].filter(Boolean).join(' ')

  return (
    <div
      className={cardClasses}
      style={{
        background: 'var(--bg-card)',
        border: `1px solid ${isActive ? 'var(--green-dim)' : 'var(--border)'}`,
        borderTop: `3px solid ${topBorderColour}`,
        boxShadow: flashActive ? '0 0 0 2px rgba(122,184,106,0.4), 0 0 24px rgba(122,184,106,0.3)' : 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'stretch' }}>

        {/* Portrait strip */}
        <div style={{
          width: 80, flexShrink: 0, position: 'relative', overflow: 'hidden',
          background: 'rgba(80,32,12,0.28)', minHeight: 90,
        }}>
          {portrait ? (
            <img src={portrait} alt={combatant.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center', display: 'block' }}
              onError={e => { e.target.style.display = 'none' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', minHeight: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 22, color: accent }}>
              {combatant.name[0]}
            </div>
          )}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, transparent 55%, rgba(10,12,10,0.65) 100%)', pointerEvents: 'none' }} />
          {/* Initiative input */}
          <div style={{ position: 'absolute', bottom: 4, left: 0, right: 0, textAlign: 'center' }}>
            <input
              type="number" value={combatant.initiative ?? ''}
              onChange={e => setInitiative(combatant.id, e.target.value)}
              title="Initiative"
              style={{
                width: 34, height: 18, textAlign: 'center',
                fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
                background: isActive ? `${accent}25` : 'rgba(0,0,0,0.5)',
                border: `1px solid ${isActive ? `${accent}80` : 'rgba(255,255,255,0.1)'}`,
                borderRadius: 'var(--radius)', color: isActive ? accent : 'var(--text-muted)',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Stats panel */}
        <div style={{ flex: 1, padding: '8px 11px', display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>

          {/* Name row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <span style={{
              fontFamily: 'var(--font-body)', fontSize: 14,
              color: dead ? 'var(--text-muted)' : accent,
              textDecoration: dead ? 'line-through' : 'none',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {combatant.name}
            </span>
            {isActive && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 7, padding: '1px 5px', background: 'rgba(122,184,106,0.15)', border: '1px solid rgba(122,184,106,0.35)', borderRadius: 'var(--radius)', color: 'var(--green-bright)', textTransform: 'uppercase', letterSpacing: '0.07em', flexShrink: 0 }}>▶ Active</span>
            )}
            {kind === 'boss' && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 7, padding: '1px 5px', background: 'rgba(196,160,64,0.15)', border: '1px solid rgba(196,160,64,0.4)', borderRadius: 'var(--radius)', color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: '0.07em', flexShrink: 0 }}>Boss</span>
            )}
            {kind === 'elite' && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 7, padding: '1px 5px', background: 'rgba(196,112,64,0.15)', border: '1px solid rgba(196,112,64,0.4)', borderRadius: 'var(--radius)', color: 'var(--rot-bright)', textTransform: 'uppercase', letterSpacing: '0.07em', flexShrink: 0 }}>Elite</span>
            )}
          </div>

          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', marginTop: -3 }}>
            {subtitle}
          </div>

          <HpStrip
            curHp={combatant.curHp} maxHp={combatant.maxHp} tempHp={combatant.tempHp}
            ac={combatant.effectiveAc ?? combatant.ac} speed={combatant.speed || combatant.stats?.speed}
          />
          <SavingThrowsStrip combatant={combatant} />

          {!dead && (
            <>
              <ActionEconomy combatant={combatant} />
              <ConditionChips combatant={combatant} />
            </>
          )}
        </div>
      </div>

      {/* ── Controls ── */}
      {!dead && (
        <div style={{
          padding: '8px 12px 10px',
          borderTop: '1px solid var(--border)',
          background: 'rgba(0,0,0,0.07)',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}>
          {/* Attacks — always visible inline */}
          <ActionsList combatant={combatant} players={players} mode="inline" />
          {/* HP adjust below attacks */}
          <QuickHp combatant={combatant} />
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Public export — dispatches to PC or Enemy sub-card
// ─────────────────────────────────────────────────────────────────────────────
export default function CompactCard({ combatant, isActive, flashActive = false, players = [] }) {
  if (combatant.type === 'player') {
    return <PCCard combatant={combatant} isActive={isActive} flashActive={flashActive} />
  }
  return <EnemyCard combatant={combatant} isActive={isActive} flashActive={flashActive} players={players} />
}
