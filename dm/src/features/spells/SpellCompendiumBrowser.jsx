import React, { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useCombatStore } from '../../stores/combatStore'
import { useCampaignStore } from '../../stores/campaignStore'
import DiceInlineText from '@shared/components/combat/DiceInlineText.jsx'
import { createDmDiceRollHandler } from '@shared/lib/diceText/dispatch.js'

/** Avoid React "objects are not valid as a React child" from odd DB/import shapes. */
function safeSpellText(value, maxLen = 24000) {
  if (value == null || value === '') return ''
  if (typeof value === 'string') return value.length > maxLen ? `${value.slice(0, maxLen)}…` : value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (typeof value === 'object') {
    try {
      const s = JSON.stringify(value, null, 2)
      return s.length > maxLen ? `${s.slice(0, maxLen)}…` : s
    } catch {
      return '[Undisplayable value]'
    }
  }
  return String(value).slice(0, maxLen)
}

function safeExternalUrl(raw) {
  const s = typeof raw === 'string' ? raw.trim() : ''
  if (!s || !/^https?:\/\//i.test(s)) return null
  return s
}

const PAGE = 60
const SCHOOLS = ['', 'Abjuration', 'Conjuration', 'Divination', 'Enchantment', 'Evocation', 'Illusion', 'Necromancy', 'Transmutation']

function boolChip(on, label) {
  return (
    <span
      style={{
        fontSize: 9,
        fontFamily: 'var(--font-mono)',
        textTransform: 'uppercase',
        padding: '2px 6px',
        borderRadius: 4,
        border: `1px solid ${on ? 'var(--green-mid)' : 'var(--border)'}`,
        color: on ? 'var(--green-bright)' : 'var(--text-muted)',
        marginRight: 4,
      }}
    >
      {label}
    </span>
  )
}

/** Prefer richer compendium row when duplicate spell_id appears in the feed. */
function spellRowScore(s) {
  let sc = 0
  if (s._compendiumRow) sc += 4
  if (s._compendium !== false && s._sourceType !== 'legacy') sc += 2
  if (s.id) sc += 1
  const u = s.updated_at || s._compendiumRow?.updated_at
  if (u) {
    const t = new Date(u).getTime()
    if (Number.isFinite(t)) sc += t / 1e15
  }
  return sc
}

function pickBetterSpellRow(a, b) {
  const sa = spellRowScore(a)
  const sb = spellRowScore(b)
  if (sa !== sb) return sa >= sb ? a : b
  return String(a.id || '').localeCompare(String(b.id || '')) >= 0 ? a : b
}

function dedupeSpellsById(spells, normalizeSpellId) {
  const map = new Map()
  for (const s of spells || []) {
    const sid = normalizeSpellId(s.spell_id || normalizeSpellId(s.name))
    const existing = map.get(sid)
    map.set(sid, existing ? pickBetterSpellRow(existing, s) : s)
  }
  return Array.from(map.values())
}

function SpellCompendiumDetail({ spell, variant = 'inline', onClose }) {
  const pushFeedEvent = useCombatStore((s) => s.pushFeedEvent)
  if (!spell) return null
  const r = spell._compendiumRow || spell
  const mono = { fontFamily: 'var(--font-mono)' }
  const block = {
    marginBottom: 14,
    padding: 14,
    background: 'var(--bg-deep)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    lineHeight: 1.65,
  }
  const h2 = { fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--text-primary)', margin: '0 0 4px' }
  const sub = { ...mono, fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }

  const lv = Number(r.level ?? spell.level)
  const levelLabel = !Number.isFinite(lv) ? 'Level —' : lv === 0 ? 'Cantrip' : `Level ${lv}`
  const detailsText = safeSpellText(r.details ?? spell.description ?? '')
  const link = safeExternalUrl(r.source_link ?? spell.source_url)
  const handleInlineRoll = createDmDiceRollHandler({
    pushFeedEvent,
    type: 'roll',
    shared: true,
    defaultContextLabel: safeSpellText(r.name || spell.name, 120),
  })

  const outerStyle = variant === 'rail'
    ? {
        position: 'sticky',
        top: 12,
        maxHeight: 'calc(100vh - 120px)',
        overflowY: 'auto',
        padding: 4,
      }
    : {
        padding: '4px 0 0',
        maxHeight: 'min(70vh, 720px)',
        overflowY: 'auto',
      }

  return (
    <div style={outerStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <h2 style={h2}>{safeSpellText(r.name || spell.name, 500)}</h2>
          <div style={sub}>
            {levelLabel}
            {r.school ? ` · ${r.school}` : ''}
            {spell._compendium !== false && spell._sourceType !== 'legacy' ? ' · Compendium' : ''}
            {spell._sourceType === 'legacy' ? ' · Legacy reference' : ''}
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px 10px',
              ...mono,
              fontSize: 10,
            }}
          >
            Close
          </button>
        )}
      </div>

      <div style={block}>
        <div style={{ ...mono, fontSize: 9, color: 'var(--text-muted)', marginBottom: 8 }}>Summary</div>
        <div style={{ display: 'grid', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
          <div><strong style={{ color: 'var(--text-primary)' }}>Casting time</strong> — {safeSpellText(r.casting_time || spell.casting_time || '—', 400)}</div>
          <div><strong style={{ color: 'var(--text-primary)' }}>Range</strong> — {safeSpellText(r.range || spell.range || '—', 400)}</div>
          <div><strong style={{ color: 'var(--text-primary)' }}>Duration</strong> — {safeSpellText(r.duration || spell.duration || '—', 400)}</div>
          <div><strong style={{ color: 'var(--text-primary)' }}>Area</strong> — {safeSpellText(r.area ?? '—', 400)}</div>
          <div><strong style={{ color: 'var(--text-primary)' }}>Attack</strong> — {safeSpellText(r.attack || spell.attack_type || '—', 400)}</div>
          <div><strong style={{ color: 'var(--text-primary)' }}>Save</strong> — {safeSpellText(r.save || spell.save_type || '—', 400)}</div>
          <div>
            <strong style={{ color: 'var(--text-primary)' }}>Damage / effect</strong> —{' '}
            <DiceInlineText
              text={safeSpellText(r.damage_effect || spell.damage_dice || '—', 800)}
              contextLabel={`${safeSpellText(r.name || spell.name, 120)}: damage/effect`}
              onRoll={handleInlineRoll}
              style={{ fontSize: 13, color: 'var(--text-secondary)' }}
            />
          </div>
        </div>
        <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {boolChip(!!r.ritual || !!spell.ritual, 'Ritual')}
          {boolChip(!!r.concentration || !!spell.concentration, 'Conc.')}
          {boolChip(!!r.verbal || !!spell.components?.V, 'V')}
          {boolChip(!!r.somatic || !!spell.components?.S, 'S')}
          {boolChip(!!r.material || !!spell.components?.M, 'M')}
        </div>
      </div>

      {(r.material_text || (typeof spell.components?.M === 'string' && spell.components.M)) && (
        <div style={block}>
          <div style={{ ...mono, fontSize: 9, color: 'var(--text-muted)', marginBottom: 6 }}>Material</div>
          <DiceInlineText
            text={safeSpellText(r.material_text || spell.components?.M, 2000)}
            contextLabel={`${safeSpellText(r.name || spell.name, 120)}: material`}
            onRoll={handleInlineRoll}
            style={{ fontSize: 13, color: 'var(--text-secondary)' }}
          />
        </div>
      )}

      <div style={block}>
        <div style={{ ...mono, fontSize: 9, color: 'var(--text-muted)', marginBottom: 6 }}>Targeting</div>
        <DiceInlineText
          text={safeSpellText(r.targeting || spell.target_mode || '—', 800)}
          contextLabel={`${safeSpellText(r.name || spell.name, 120)}: targeting`}
          onRoll={handleInlineRoll}
          style={{ fontSize: 13, color: 'var(--text-secondary)' }}
        />
        {(r.max_targets != null && r.max_targets !== '') || (r.rules_json && r.rules_json.max_targets_raw != null && r.rules_json.max_targets_raw !== '') ? (
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
            Max targets:{' '}
            <span style={{ color: 'var(--text-primary)' }}>
              {safeSpellText(r.max_targets ?? r.rules_json?.max_targets_raw ?? '', 200)}
            </span>
          </div>
        ) : null}
      </div>

      {r.summon_stat_block != null && String(r.summon_stat_block).trim() !== '' && (
        <div style={block}>
          <div style={{ ...mono, fontSize: 9, color: 'var(--text-muted)', marginBottom: 6 }}>Summon stat block</div>
          <DiceInlineText
            text={safeSpellText(r.summon_stat_block, 2000)}
            contextLabel={`${safeSpellText(r.name || spell.name, 120)}: summon`}
            onRoll={handleInlineRoll}
            style={{ fontSize: 13, color: 'var(--amber, #c9a227)' }}
          />
        </div>
      )}

      {detailsText && (
        <div style={block}>
          <div style={{ ...mono, fontSize: 9, color: 'var(--text-muted)', marginBottom: 8 }}>Description</div>
          <DiceInlineText
            text={detailsText}
            style={{ fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}
            contextLabel={safeSpellText(r.name || spell.name, 120)}
            onRoll={handleInlineRoll}
          />
        </div>
      )}

      <div style={{ ...block, opacity: 0.85 }}>
        <div style={{ ...mono, fontSize: 9, color: 'var(--text-muted)', marginBottom: 6 }}>Source</div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{safeSpellText(r.source || spell.source || '—', 500)}</div>
        {link && (
          <a href={link} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--green-bright)', marginTop: 8, display: 'inline-block' }}>
            Open link
          </a>
        )}
        <div style={{ ...mono, fontSize: 9, color: 'var(--text-muted)', marginTop: 10 }}>spell_id</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', wordBreak: 'break-all' }}>{safeSpellText(r.spell_id || spell.spell_id || '—', 300)}</div>
        {(r.sound_effect_url || spell.sound_effect_url) && (
          <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
            SFX hook: {safeSpellText(r.sound_effect_url || spell.sound_effect_url, 2000)}
          </div>
        )}
      </div>
    </div>
  )
}

export default function SpellCompendiumBrowser({
  spells,
  bulkSpellIds,
  toggleBulkSpell,
  normalizeSpellId,
}) {
  const searchSpellCompendiumIlike = useCampaignStore((s) => s.searchSpellCompendiumIlike)
  const [q, setQ] = useState('')
  const dq = useDeferredValue(q.trim().toLowerCase())
  const [serverRows, setServerRows] = useState(null)
  const [level, setLevel] = useState('')
  const [school, setSchool] = useState('')
  const [castingTime, setCastingTime] = useState('')
  const [sourceQ, setSourceQ] = useState('')
  const [damageQ, setDamageQ] = useState('')
  const [conc, setConc] = useState('any')
  const [ritual, setRitual] = useState('any')
  const [attackFilter, setAttackFilter] = useState('any')
  const [saveFilter, setSaveFilter] = useState('any')
  const [materialFilter, setMaterialFilter] = useState('any')
  const [page, setPage] = useState(0)
  const [expandedKey, setExpandedKey] = useState(null)

  const uniqueSpells = useMemo(
    () => dedupeSpellsById(spells, normalizeSpellId),
    [spells, normalizeSpellId],
  )

  useEffect(() => {
    if (dq.length < 2) {
      setServerRows(null)
      return
    }
    setServerRows(null)
    const h = setTimeout(() => {
      searchSpellCompendiumIlike(dq)
        .then((rows) => setServerRows(Array.isArray(rows) ? rows : []))
        .catch(() => setServerRows([]))
    }, 220)
    return () => clearTimeout(h)
  }, [dq, searchSpellCompendiumIlike])

  const filterSource = dq.length >= 2 && Array.isArray(serverRows) ? dedupeSpellsById(serverRows, normalizeSpellId) : uniqueSpells

  const filtered = useMemo(() => {
    return filterSource.filter((s) => {
      const r = s._compendiumRow || s
      const hay = `${s.name || ''} ${s.description || ''} ${r.details || ''} ${r.damage_effect || ''} ${s.school || ''} ${r.school || ''} ${s.source || ''} ${r.source || ''} ${s.search_text || r.search_text || ''}`.toLowerCase()
      if (dq && !hay.includes(dq)) return false
      if (level !== '' && String(s.level) !== level) return false
      if (school && (s.school || r.school) !== school) return false
      const ct = (s.casting_time || r.casting_time || '').toLowerCase()
      if (castingTime && !ct.includes(castingTime.toLowerCase())) return false
      const src = (s.source || r.source || '').toLowerCase()
      if (sourceQ && !src.includes(sourceQ.toLowerCase())) return false
      const dmg = (r.damage_effect || s.damage_dice || '').toLowerCase()
      if (damageQ && !dmg.includes(damageQ.toLowerCase())) return false
      if (conc === 'yes' && !(s.concentration || r.concentration)) return false
      if (conc === 'no' && (s.concentration || r.concentration)) return false
      if (ritual === 'yes' && !(s.ritual || r.ritual)) return false
      if (ritual === 'no' && (s.ritual || r.ritual)) return false
      const hasAttack = !!(r.attack && String(r.attack).trim()) || s.resolution_type === 'attack' || s.attack_type
      if (attackFilter === 'yes' && !hasAttack) return false
      if (attackFilter === 'no' && hasAttack) return false
      const hasSave = !!(r.save && String(r.save).trim()) || s.resolution_type === 'save'
      if (saveFilter === 'yes' && !hasSave) return false
      if (saveFilter === 'no' && hasSave) return false
      const hasMat = !!(r.material || r.material_text || s.components?.M)
      if (materialFilter === 'yes' && !hasMat) return false
      if (materialFilter === 'no' && hasMat) return false
      return true
    })
  }, [filterSource, dq, level, school, castingTime, sourceQ, damageQ, conc, ritual, attackFilter, saveFilter, materialFilter])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE))
  const pageSafe = Math.min(page, pageCount - 1)
  const slice = useMemo(() => {
    const start = pageSafe * PAGE
    return filtered.slice(start, start + PAGE)
  }, [filtered, pageSafe])

  useEffect(() => {
    if (!expandedKey) return
    const inSlice = slice.some((s) => normalizeSpellId(s.spell_id || normalizeSpellId(s.name)) === expandedKey)
    if (!inSlice) setExpandedKey(null)
  }, [expandedKey, slice, normalizeSpellId])

  const mono = { fontFamily: 'var(--font-mono)' }
  const inputStyle = {
    width: '100%',
    padding: '7px 10px',
    background: 'var(--bg-deep)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    color: 'var(--text-primary)',
    fontSize: 12,
    outline: 'none',
    boxSizing: 'border-box',
  }
  const labelStyle = { ...mono, fontSize: 8, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 4 }

  const tri = (value, onChange) => (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle}>
      <option value="any">Any</option>
      <option value="yes">Yes</option>
      <option value="no">No</option>
    </select>
  )

  const rawCount = (spells || []).length
  const dedupedCount = uniqueSpells.length

  return (
    <div style={{ minWidth: 0, maxWidth: 900 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 10,
          marginBottom: 14,
          padding: 14,
          background: 'var(--bg-raised)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>Search</label>
          <input style={inputStyle} value={q} onChange={(e) => { setQ(e.target.value); setPage(0) }} placeholder="Name, description, school, source…" />
        </div>
        <div>
          <label style={labelStyle}>Level</label>
          <select value={level} onChange={(e) => { setLevel(e.target.value); setPage(0) }} style={inputStyle}>
            <option value="">All</option>
            <option value="0">Cantrip</option>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <option key={n} value={String(n)}>{n}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>School</label>
          <select value={school} onChange={(e) => { setSchool(e.target.value); setPage(0) }} style={inputStyle}>
            {SCHOOLS.map((s) => (
              <option key={s || 'all'} value={s}>{s || 'All'}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Casting time contains</label>
          <input style={inputStyle} value={castingTime} onChange={(e) => { setCastingTime(e.target.value); setPage(0) }} placeholder="action, bonus…" />
        </div>
        <div>
          <label style={labelStyle}>Source contains</label>
          <input style={inputStyle} value={sourceQ} onChange={(e) => { setSourceQ(e.target.value); setPage(0) }} placeholder="PHB, XGE…" />
        </div>
        <div>
          <label style={labelStyle}>Damage / effect contains</label>
          <input style={inputStyle} value={damageQ} onChange={(e) => { setDamageQ(e.target.value); setPage(0) }} placeholder="fire, necrotic…" />
        </div>
        <div>
          <label style={labelStyle}>Concentration</label>
          {tri(conc, (v) => { setConc(v); setPage(0) })}
        </div>
        <div>
          <label style={labelStyle}>Ritual</label>
          {tri(ritual, (v) => { setRitual(v); setPage(0) })}
        </div>
        <div>
          <label style={labelStyle}>Attack</label>
          {tri(attackFilter, (v) => { setAttackFilter(v); setPage(0) })}
        </div>
        <div>
          <label style={labelStyle}>Save</label>
          {tri(saveFilter, (v) => { setSaveFilter(v); setPage(0) })}
        </div>
        <div>
          <label style={labelStyle}>Material</label>
          {tri(materialFilter, (v) => { setMaterialFilter(v); setPage(0) })}
        </div>
      </div>

      <div style={{ ...mono, fontSize: 10, color: 'var(--text-muted)', marginBottom: 8 }}>
        Showing {slice.length} of {filtered.length} spells
        {filtered.length !== dedupedCount ? ` (of ${dedupedCount} before text filters)` : ''}
        {dedupedCount !== rawCount ? ` · ${dedupedCount} unique spell_id (${rawCount} rows)` : ''}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {slice.map((spell) => {
          const sid = normalizeSpellId(spell.spell_id || normalizeSpellId(spell.name))
          const r = spell._compendiumRow || spell
          const isOpen = expandedKey === sid
          return (
            <div
              key={sid}
              style={{
                background: 'var(--bg-raised)',
                border: `1px solid ${isOpen ? 'var(--green-mid)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
              }}
            >
              <div
                role="button"
                tabIndex={0}
                aria-expanded={isOpen}
                onClick={() => setExpandedKey((prev) => (prev === sid ? null : sid))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setExpandedKey((prev) => (prev === sid ? null : sid))
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'stretch',
                  gap: 10,
                  padding: '10px 12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  background: isOpen ? 'var(--green-dim)' : 'transparent',
                }}
              >
                <input
                  type="checkbox"
                  checked={bulkSpellIds.includes(sid)}
                  onChange={(e) => { e.stopPropagation(); toggleBulkSpell(sid) }}
                  style={{ cursor: 'pointer', marginTop: 4 }}
                />
                <div style={{ minWidth: 48, textAlign: 'center' }}>
                  <div style={{ ...mono, fontSize: 8, color: 'var(--text-muted)' }}>Lv</div>
                  <div style={{ ...mono, fontSize: 12, color: '#a0b0ff', fontWeight: 700 }}>{spell.level === 0 ? 'C' : spell.level}</div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>{spell.name}</div>
                  <div style={{ ...mono, fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                    {[r.school || spell.school, r.casting_time || spell.casting_time, r.range || spell.range].filter(Boolean).join(' · ')}
                  </div>
                  <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {boolChip(!!r.concentration || !!spell.concentration, 'C')}
                    {boolChip(!!r.ritual || !!spell.ritual, 'R')}
                    {(r.damage_effect || spell.damage_dice) && (
                      <span style={{ ...mono, fontSize: 9, color: 'var(--warning)' }}>
                        {(r.damage_effect || spell.damage_dice || '').slice(0, 56)}
                        {(r.damage_effect || spell.damage_dice || '').length > 56 ? '…' : ''}
                      </span>
                    )}
                  </div>
                  {(r.source || spell.source) && (
                    <div style={{ ...mono, fontSize: 9, color: '#7a8aaf', marginTop: 4 }}>{r.source || spell.source}</div>
                  )}
                </div>
                <div style={{ ...mono, minWidth: 84, fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right', letterSpacing: '0.08em', alignSelf: 'center' }}>
                  {isOpen ? 'Hide ▲' : 'Show ▼'}
                </div>
              </div>

              {isOpen && (
                <div style={{ padding: '12px 14px 16px', borderTop: '1px solid var(--border)' }}>
                  <SpellCompendiumDetail
                    spell={spell}
                    variant="inline"
                    onClose={() => setExpandedKey(null)}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {pageCount > 1 && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 16, ...mono, fontSize: 11 }}>
          <button
            type="button"
            disabled={pageSafe <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            style={{ padding: '6px 12px', background: 'var(--bg-deep)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', cursor: pageSafe <= 0 ? 'not-allowed' : 'pointer' }}
          >
            Prev
          </button>
          <span style={{ color: 'var(--text-muted)' }}>
            Page {pageSafe + 1} / {pageCount}
          </span>
          <button
            type="button"
            disabled={pageSafe >= pageCount - 1}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            style={{ padding: '6px 12px', background: 'var(--bg-deep)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', cursor: pageSafe >= pageCount - 1 ? 'not-allowed' : 'pointer' }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
