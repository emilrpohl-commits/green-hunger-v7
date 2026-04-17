/**
 * ImportModal
 *
 * Paste raw D&D 5e text (stat block or spell), auto-detect the type,
 * preview parsed fields, then save directly to the campaign.
 *
 * Usage:
 *   <ImportModal type="statblock" onClose={() => setShowImport(false)} onSaved={(id) => onEdit(id)} />
 *   <ImportModal type="spell"     onClose={() => setShowImport(false)} onSaved={() => {}} />
 *   <ImportModal type="auto"      onClose={...}  onSaved={...} />
 */

import React, { useState, useCallback } from 'react'
import { parseStatBlock } from '@shared/lib/parseStatBlock.js'
import { parseSpell } from '@shared/lib/parseSpell.js'
import { validateStatBlockImport } from '@shared/lib/validation/statBlockImportSchema.js'
import { useCampaignStore } from '../../stores/campaignStore'

// ---------------------------------------------------------------------------
// Detect whether pasted text looks like a stat block or a spell
// ---------------------------------------------------------------------------
function detectType(text) {
  const t = text.toLowerCase()
  const hasAC = /armor class/i.test(t)
  const hasHP = /hit points/i.test(t)
  const hasCR = /challenge/i.test(t)
  const hasAbility = /\bstr\b.*\bdex\b.*\bcon\b/i.test(t)
  const hasCastingTime = /casting time/i.test(t)
  const hasSchool = /(abjuration|conjuration|divination|enchantment|evocation|illusion|necromancy|transmutation)/i.test(t)
  const hasCantrip = /cantrip/i.test(t)
  const hasLevel = /\d(?:st|nd|rd|th)[- ]level/i.test(t)

  const statScore = (hasAC ? 2 : 0) + (hasHP ? 2 : 0) + (hasCR ? 2 : 0) + (hasAbility ? 3 : 0)
  const spellScore = (hasCastingTime ? 3 : 0) + (hasSchool ? 2 : 0) + (hasCantrip ? 2 : 0) + (hasLevel ? 2 : 0)

  if (statScore === 0 && spellScore === 0) return null
  return statScore >= spellScore ? 'statblock' : 'spell'
}

// ---------------------------------------------------------------------------
// Small preview of a parsed object
// ---------------------------------------------------------------------------
function PreviewField({ label, value }) {
  if (!value && value !== 0) return null
  const display = Array.isArray(value)
    ? (value.length === 0 ? null : value.join(', '))
    : typeof value === 'object'
      ? JSON.stringify(value)
      : String(value)
  if (!display) return null
  return (
    <div style={{ marginBottom: 8 }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </span>
      <div style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 2, lineHeight: 1.5, wordBreak: 'break-word' }}>
        {display}
      </div>
    </div>
  )
}

function StatBlockPreview({ parsed }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
      <PreviewField label="Name" value={parsed.name} />
      <PreviewField label="CR" value={parsed.cr} />
      <PreviewField label="Size" value={parsed.size} />
      <PreviewField label="Type" value={parsed.creature_type} />
      <PreviewField label="Alignment" value={parsed.alignment} />
      <PreviewField label="AC" value={parsed.ac} />
      <PreviewField label="HP" value={parsed.max_hp} />
      <PreviewField label="Hit Dice" value={parsed.hit_dice} />
      <PreviewField label="Speed" value={parsed.speed} />
      <div style={{ gridColumn: '1/-1' }}>
        <PreviewField label="Ability Scores" value={
          `STR ${parsed.ability_scores?.STR} / DEX ${parsed.ability_scores?.DEX} / CON ${parsed.ability_scores?.CON} / INT ${parsed.ability_scores?.INT} / WIS ${parsed.ability_scores?.WIS} / CHA ${parsed.ability_scores?.CHA}`
        } />
      </div>
      {parsed.saving_throws?.length > 0 && <div style={{ gridColumn: '1/-1' }}><PreviewField label="Saving Throws" value={parsed.saving_throws.map(s => `${s.name} ${s.mod >= 0 ? '+' : ''}${s.mod}`).join(', ')} /></div>}
      {parsed.skills?.length > 0 && <div style={{ gridColumn: '1/-1' }}><PreviewField label="Skills" value={parsed.skills.map(s => `${s.name} ${s.mod >= 0 ? '+' : ''}${s.mod}`).join(', ')} /></div>}
      {parsed.resistances?.length > 0 && <div style={{ gridColumn: '1/-1' }}><PreviewField label="Resistances" value={parsed.resistances} /></div>}
      {parsed.immunities?.damage?.length > 0 && <div style={{ gridColumn: '1/-1' }}><PreviewField label="Damage Immunities" value={parsed.immunities.damage} /></div>}
      {parsed.immunities?.condition?.length > 0 && <div style={{ gridColumn: '1/-1' }}><PreviewField label="Condition Immunities" value={parsed.immunities.condition} /></div>}
      <div style={{ gridColumn: '1/-1' }}><PreviewField label="Senses" value={parsed.senses} /></div>
      <div style={{ gridColumn: '1/-1' }}><PreviewField label="Languages" value={parsed.languages} /></div>
      {parsed.traits?.length > 0 && (
        <div style={{ gridColumn: '1/-1' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
            Traits ({parsed.traits.length})
          </div>
          {parsed.traits.map((t, i) => (
            <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, paddingLeft: 8, borderLeft: '2px solid var(--border)' }}>
              <strong>{t.name}.</strong> {t.desc}
            </div>
          ))}
        </div>
      )}
      {parsed.actions?.length > 0 && (
        <div style={{ gridColumn: '1/-1' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4, marginTop: 8 }}>
            Actions ({parsed.actions.length})
          </div>
          {parsed.actions.map((a, i) => (
            <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, paddingLeft: 8, borderLeft: '2px solid var(--border)' }}>
              <strong>{a.name}</strong>{a.type !== 'special' ? ` [${a.type}]` : ''}
              {a.toHit !== undefined ? ` +${a.toHit} to hit` : ''}
              {a.damage ? ` · ${a.damage}` : ''}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SpellPreview({ parsed }) {
  const LEVEL_NAMES = ['Cantrip', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th']
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
      <PreviewField label="Name" value={parsed.name} />
      <PreviewField label="Level" value={LEVEL_NAMES[parsed.level] ?? parsed.level} />
      <PreviewField label="School" value={parsed.school} />
      <PreviewField label="Casting Time" value={parsed.casting_time} />
      <PreviewField label="Range" value={parsed.range} />
      <PreviewField label="Duration" value={parsed.duration} />
      <PreviewField label="Components" value={parsed.components} />
      <div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Flags</div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          {[parsed.ritual && 'Ritual', parsed.concentration && 'Concentration'].filter(Boolean).join(' · ') || '—'}
        </div>
      </div>
      {parsed.classes?.length > 0 && <PreviewField label="Classes" value={parsed.classes} />}
      <div style={{ gridColumn: '1/-1', marginTop: 8 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Description</div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, maxHeight: 140, overflow: 'auto', paddingRight: 4 }}>{parsed.description || '—'}</div>
      </div>
      {parsed.higher_levels && (
        <div style={{ gridColumn: '1/-1', marginTop: 8 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>At Higher Levels</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{parsed.higher_levels}</div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function ImportModal({ type = 'auto', onClose, onSaved }) {
  const saveStatBlock = useCampaignStore(s => s.saveStatBlock)
  const saveSpell = useCampaignStore(s => s.saveSpell)

  const [pasteText, setPasteText] = useState('')
  const [detected, setDetected] = useState(null)  // 'statblock' | 'spell' | null
  const [parsed, setParsed] = useState(null)
  const [parseError, setParseError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState(null)

  const effectiveType = type !== 'auto' ? type : detected

  const handlePaste = useCallback((text) => {
    setPasteText(text)
    setSaveMsg(null)
    setParsed(null)
    setParseError(null)
    if (!text.trim()) { setDetected(null); return }

    const d = type !== 'auto' ? type : detectType(text)
    setDetected(d)

    try {
      if (d === 'statblock') {
        const raw = parseStatBlock(text)
        const v = validateStatBlockImport(raw)
        if (!v.success) {
          const msg = v.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('\n')
          setParseError(`Validation:\n${msg}`)
          return
        }
        setParsed(raw)
      } else if (d === 'spell') setParsed(parseSpell(text))
      else setParseError('Could not detect content type. Try pasting more of the stat block or spell entry.')
    } catch (e) {
      setParseError(`Parse error: ${e.message}`)
    }
  }, [type])

  const handleSave = async () => {
    if (!parsed || !effectiveType) return
    setSaving(true)
    setSaveMsg(null)

    let result
    if (effectiveType === 'statblock') {
      // Strip client-only computed fields not in the DB schema
      const { modifiers: _m, ...sbPayload } = parsed
      result = await saveStatBlock(sbPayload)
    } else {
      // Map parsed spell to the shape SpellLibrary uses
      // Strip parser-only fields and rename higher_levels → higher_level_effect
      const { higher_levels: _hl, classes: _cl, ...spellRest } = parsed
      const compStr = parsed.components || ''
      const spellPayload = {
        ...spellRest,
        higher_level_effect: parsed.higher_levels || '',
        classes: Array.isArray(parsed.classes) ? parsed.classes : [],
        components: {
          V: /\bV\b/.test(compStr),
          S: /\bS\b/.test(compStr),
          M: compStr.match(/M\s*\(([^)]+)\)/)?.[1] || (/\bM\b/.test(compStr) ? '' : null),
        },
      }
      result = await saveSpell(spellPayload)
    }

    setSaving(false)
    if (result.error) {
      setSaveMsg({ type: 'error', text: result.error })
    } else {
      setSaveMsg({ type: 'ok', text: 'Saved!' })
      if (onSaved) onSaved(result.data?.id)
      setTimeout(onClose, 800)
    }
  }

  const mono = { fontFamily: 'var(--font-mono)' }

  return (
    /* Backdrop */
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
    >
      <div style={{
        background: 'var(--bg-panel)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        width: '100%', maxWidth: 860,
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '16px 24px', borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--text-primary)', flex: 1 }}>
            Import from Text
          </div>
          {detected && (
            <span style={{
              ...mono, fontSize: 9, padding: '3px 10px',
              background: detected === 'statblock' ? 'rgba(196,64,64,0.15)' : 'rgba(100,100,255,0.15)',
              border: `1px solid ${detected === 'statblock' ? 'rgba(196,64,64,0.3)' : 'rgba(100,100,255,0.3)'}`,
              borderRadius: 4, color: detected === 'statblock' ? 'var(--danger)' : '#a0a0ff',
              textTransform: 'uppercase', letterSpacing: '0.1em',
            }}>
              Detected: {detected === 'statblock' ? 'Stat Block' : 'Spell'}
            </span>
          )}
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 20, padding: '0 4px', lineHeight: 1 }}>×</button>
        </div>

        {/* Body: two-column paste | preview */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
          {/* Left: paste area */}
          <div style={{ flex: 1, padding: 20, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)', minWidth: 0 }}>
            <div style={{ ...mono, fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
              Paste stat block or spell text below
            </div>
            <textarea
              autoFocus
              value={pasteText}
              onChange={e => handlePaste(e.target.value)}
              placeholder={`Paste D&D 5e text here…\n\nWorks with text copied from:\n• D&D Beyond\n• Roll20\n• The SRD\n• Or typed manually`}
              style={{
                flex: 1, resize: 'none',
                background: 'var(--bg-deep)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius)', color: 'var(--text-primary)',
                fontSize: 12, lineHeight: 1.7, padding: '12px 14px',
                outline: 'none', fontFamily: 'monospace',
                minHeight: 280,
              }}
            />
            {type === 'auto' && pasteText && !detected && !parseError && (
              <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                <button
                  onClick={() => { setDetected('statblock'); try { setParsed(parseStatBlock(pasteText)) } catch(e) { setParseError(e.message) } }}
                  style={{ flex: 1, padding: '7px 0', background: 'rgba(196,64,64,0.1)', border: '1px solid rgba(196,64,64,0.3)', borderRadius: 'var(--radius)', cursor: 'pointer', color: 'var(--danger)', ...mono, fontSize: 10, textTransform: 'uppercase' }}
                >
                  Parse as Stat Block
                </button>
                <button
                  onClick={() => { setDetected('spell'); try { setParsed(parseSpell(pasteText)) } catch(e) { setParseError(e.message) } }}
                  style={{ flex: 1, padding: '7px 0', background: 'rgba(100,100,255,0.1)', border: '1px solid rgba(100,100,255,0.3)', borderRadius: 'var(--radius)', cursor: 'pointer', color: '#a0a0ff', ...mono, fontSize: 10, textTransform: 'uppercase' }}
                >
                  Parse as Spell
                </button>
              </div>
            )}
          </div>

          {/* Right: preview */}
          <div style={{ flex: 1, padding: 20, overflow: 'auto', minWidth: 0 }}>
            {!pasteText && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', lineHeight: 2 }}>
                Paste text on the left<br />to see a preview here
              </div>
            )}
            {parseError && (
              <div style={{ padding: 16, background: 'rgba(196,64,64,0.08)', border: '1px solid rgba(196,64,64,0.2)', borderRadius: 'var(--radius)', color: 'var(--danger)', fontSize: 13, lineHeight: 1.6 }}>
                {parseError}
              </div>
            )}
            {parsed && effectiveType === 'statblock' && <StatBlockPreview parsed={parsed} />}
            {parsed && effectiveType === 'spell' && <SpellPreview parsed={parsed} />}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 24px', borderTop: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          {saveMsg && (
            <span style={{ ...mono, fontSize: 11, color: saveMsg.type === 'ok' ? 'var(--green-bright)' : 'var(--danger)', flex: 1 }}>
              {saveMsg.text}
            </span>
          )}
          {!saveMsg && (
            <span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)', flex: 1 }}>
              {parsed ? `Ready to save "${parsed.name || 'Untitled'}" as ${effectiveType === 'statblock' ? 'a stat block' : 'a spell'}.` : 'Paste text to get started.'}
            </span>
          )}
          <button
            onClick={onClose}
            style={{ padding: '8px 18px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer', color: 'var(--text-secondary)', ...mono, fontSize: 11, textTransform: 'uppercase' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!parsed || saving}
            style={{
              padding: '8px 24px', background: 'var(--green-bright)', color: '#0a0f0a',
              border: 'none', borderRadius: 'var(--radius)', cursor: parsed && !saving ? 'pointer' : 'not-allowed',
              ...mono, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
              opacity: !parsed || saving ? 0.4 : 1,
            }}
          >
            {saving ? 'Saving…' : 'Save to Campaign'}
          </button>
        </div>
      </div>
    </div>
  )
}
