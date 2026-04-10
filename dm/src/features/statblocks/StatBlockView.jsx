import React, { useEffect, useRef } from 'react'
import { STAT_BLOCKS } from '@shared/content/statblocks.js'
import { useCampaignStore } from '../../stores/campaignStore'
import { warnFallback } from '@shared/lib/fallbackTelemetry.js'
import { getPortraitPublicUrl } from '@shared/lib/portraitStorage.js'

// Normalise DB stat block field names → the shape StatBlockView expects
function normaliseDbSb(sb) {
  if (!sb) return null
  return {
    ...sb,
    type: sb.creature_type || sb.type,
    maxHp: sb.max_hp ?? sb.maxHp,
    hitDice: sb.hit_dice || sb.hitDice,
    acNote: sb.ac_note || sb.acNote,
    stats: sb.ability_scores || sb.stats,
    modifiers: sb.modifiers || computeModifiers(sb.ability_scores || sb.stats || {}),
    savingThrows: sb.saving_throws || sb.savingThrows || [],
    resistances: sb.resistances || [],
    vulnerabilities: sb.vulnerabilities || [],
    immunities: sb.immunities || { damage: [], condition: [] },
    combatPrompts: sb.combat_prompts || sb.combatPrompts || [],
    dmNotes: Array.isArray(sb.dm_notes) ? sb.dm_notes : sb.dmNotes || [],
    traits: sb.traits || [],
    actions: sb.actions || [],
    reactions: sb.reactions || [],
    portraitUrl: sb.portrait_url
      || getPortraitPublicUrl(sb.portrait_thumb_storage_path || sb.portrait_original_storage_path)
      || sb.portraitUrl,
  }
}

function computeModifiers(scores) {
  const m = {}
  for (const [k, v] of Object.entries(scores || {})) {
    m[k] = Math.floor((v - 10) / 2)
  }
  return m
}

export default function StatBlockView({ statBlockId, data, compact = false }) {
  const statBlockMap = useCampaignStore(s => s.statBlockMap)
  const warnedRef = useRef(false)

  const fromDb = statBlockId ? !!statBlockMap[statBlockId] : false
  const raw = data || (statBlockId ? (statBlockMap[statBlockId] || STAT_BLOCKS[statBlockId]) : null)
  const sb = raw ? normaliseDbSb(raw) : null

  useEffect(() => {
    if (!statBlockId || data || warnedRef.current) return
    if (!fromDb && STAT_BLOCKS[statBlockId]) {
      warnedRef.current = true
      warnFallback('Stat block view using bundled static statblocks.js', {
        system: 'StatBlockView',
        id: statBlockId,
        source: 'static',
      })
    }
  }, [statBlockId, fromDb, data])

  if (!sb) return <div style={{ padding: 12, fontSize: 12, color: 'var(--text-muted)' }}>No stat block found{statBlockId ? ` for "${statBlockId}"` : ''}.</div>

  const monoSm = { fontFamily: 'var(--font-mono)', fontSize: 10 }
  const label = { ...monoSm, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }

  return (
    <div style={{ fontSize: 12, lineHeight: 1.5 }}>
      {/* Header — name + optional portrait */}
      <div style={{ marginBottom: 10, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        {sb.portraitUrl && (
          <img
            src={sb.portraitUrl}
            alt={sb.name}
            style={{ width: compact ? 48 : 72, height: compact ? 48 : 72, objectFit: 'cover', borderRadius: 'var(--radius)', border: '1px solid var(--border)', flexShrink: 0 }}
            onError={e => { e.target.style.display = 'none' }}
          />
        )}
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: compact ? 18 : 22, color: '#d49070', letterSpacing: '0.04em', marginBottom: 2 }}>
            {sb.name}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
            {sb.size} {sb.type} · CR {sb.cr}
          </div>
        </div>
      </div>

      {/* Core stats row */}
      <div style={{
        display: 'flex', gap: 20, flexWrap: 'wrap',
        padding: '10px 14px',
        background: 'rgba(196,64,64,0.06)',
        border: '1px solid rgba(196,64,64,0.2)',
        borderRadius: 'var(--radius)',
        marginBottom: 12,
        fontFamily: 'var(--font-mono)'
      }}>
        <div><span style={{ ...label, marginRight: 4 }}>AC</span><span style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 600 }}>{sb.ac}</span><span style={{ color: 'var(--text-muted)', fontSize: 10 }}>{sb.acNote ? ` (${sb.acNote})` : ''}</span></div>
        <div><span style={{ ...label, marginRight: 4 }}>HP</span><span style={{ color: 'var(--danger)', fontSize: 14, fontWeight: 600 }}>{sb.maxHp}</span><span style={{ color: 'var(--text-muted)', fontSize: 10 }}> {sb.hitDice}</span></div>
        <div><span style={{ ...label, marginRight: 4 }}>Speed</span><span style={{ color: 'var(--text-secondary)' }}>{sb.speed}</span></div>
      </div>

      {/* Ability scores grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 5, marginBottom: 12, textAlign: 'center' }}>
        {['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'].map(s => (
          <div key={s} style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '6px 4px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>{s}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--text-primary)', fontWeight: 700, lineHeight: 1 }}>{sb.stats[s]}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--green-bright)', marginTop: 2 }}>
              {sb.modifiers[s] >= 0 ? '+' : ''}{sb.modifiers[s]}
            </div>
          </div>
        ))}
      </div>

      {/* Secondary stats */}
      <div style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {sb.savingThrows?.length > 0 && (
          <div><span style={label}>Saves </span><span style={{ color: 'var(--text-secondary)' }}>{sb.savingThrows.map(s => `${s.name} +${s.mod}`).join(', ')}</span></div>
        )}
        {sb.skills?.length > 0 && (
          <div><span style={label}>Skills </span><span style={{ color: 'var(--text-secondary)' }}>{sb.skills.map(s => `${s.name} +${s.mod}`).join(', ')}</span></div>
        )}
        {sb.resistances?.length > 0 && (
          <div><span style={label}>Resist </span><span style={{ color: 'var(--text-secondary)' }}>{sb.resistances.join(', ')}</span></div>
        )}
        {sb.vulnerabilities?.length > 0 && (
          <div><span style={label}>Vuln </span><span style={{ color: '#e08060' }}>{sb.vulnerabilities.join(', ')}</span></div>
        )}
        {sb.immunities?.condition?.length > 0 && (
          <div><span style={label}>Immune (cond) </span><span style={{ color: 'var(--text-secondary)' }}>{sb.immunities.condition.join(', ')}</span></div>
        )}
        <div><span style={label}>Senses </span><span style={{ color: 'var(--text-secondary)' }}>{sb.senses}</span></div>
        {sb.languages && sb.languages !== '—' && (
          <div><span style={label}>Languages </span><span style={{ color: 'var(--text-secondary)' }}>{sb.languages}</span></div>
        )}
      </div>

      {/* Traits */}
      {sb.traits?.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', borderBottom: '1px solid var(--border)', paddingBottom: 4, marginBottom: 8 }}>Traits</div>
          {sb.traits.map(t => (
            <div key={t.name} style={{ marginBottom: 6, lineHeight: 1.6 }}>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontStyle: 'italic' }}>{t.name}. </span>
              <span style={{ color: 'var(--text-secondary)' }}>{t.desc}</span>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      {sb.actions?.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--danger)', textTransform: 'uppercase', letterSpacing: '0.1em', borderBottom: '1px solid rgba(196,64,64,0.3)', paddingBottom: 4, marginBottom: 8 }}>Actions</div>
          {sb.actions.map(a => (
            <div key={a.name} style={{ marginBottom: 8, lineHeight: 1.6 }}>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontStyle: 'italic' }}>{a.name}. </span>
              {a.type === 'attack' && (
                <span style={{ color: 'var(--text-secondary)' }}>
                  <em style={{ color: 'var(--text-muted)' }}>Melee/Ranged Attack:</em> +{a.toHit} to hit, {a.reach || a.range}, one target. <em>Hit:</em> {a.damage}.{a.effect ? ` ${a.effect}` : ''}
                </span>
              )}
              {a.type === 'save' && (
                <span style={{ color: 'var(--text-secondary)' }}>
                  DC {a.saveDC} {a.saveType} saving throw. {a.damage}.
                </span>
              )}
              {(a.type === 'special' || (!a.type && a.desc)) && (
                <span style={{ color: 'var(--text-secondary)' }}>{a.desc}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Reactions */}
      {sb.reactions?.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: '0.1em', borderBottom: '1px solid rgba(196,160,64,0.3)', paddingBottom: 4, marginBottom: 8 }}>Reactions</div>
          {sb.reactions.map(r => (
            <div key={r.name} style={{ marginBottom: 6, lineHeight: 1.6 }}>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontStyle: 'italic' }}>{r.name}{r.recharge ? ` (Recharge ${r.recharge})` : ''}. </span>
              <span style={{ color: 'var(--text-secondary)' }}>{r.desc}</span>
            </div>
          ))}
        </div>
      )}

      {/* Combat prompts */}
      {sb.combatPrompts?.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--rot-bright)', textTransform: 'uppercase', letterSpacing: '0.1em', borderBottom: '1px solid var(--rot-mid)', paddingBottom: 4, marginBottom: 8 }}>Read-Aloud Prompts</div>
          {sb.combatPrompts.map(p => (
            <div key={p.trigger} style={{ marginBottom: 8, background: 'var(--rot-dim)', border: '1px solid var(--rot-mid)', borderRadius: 'var(--radius-lg)', padding: '10px 14px' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--rot-bright)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>{p.trigger}</div>
              <div style={{ color: '#d4a080', fontSize: 14, fontStyle: 'italic', lineHeight: 1.7 }}>{p.text}</div>
            </div>
          ))}
        </div>
      )}

      {/* DM notes */}
      {sb.dmNotes?.length > 0 && (
        <div style={{ padding: '10px 14px', background: 'rgba(40,50,36,0.5)', border: '1px solid var(--border-bright)', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>DM Notes</div>
          {sb.dmNotes.map((note, i) => (
            <div key={i} style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 5, lineHeight: 1.6 }}>• {note}</div>
          ))}
        </div>
      )}
    </div>
  )
}
