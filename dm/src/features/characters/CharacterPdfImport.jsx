import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '@shared/lib/supabase.js'
import { useCampaignStore } from '../../stores/campaignStore'
import { makeCampaignSpellId, referenceSpellRowToCampaignPayload } from '@shared/lib/reference/referenceSpellToCampaign.js'
import { ABILITIES, PHB_CLASSES as CLASS_NAMES, slugify, toAbilityBlock } from '@shared/lib/characterSheetShape.js'

function normalizeSpellName(value = '') {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
}

function parseAbilityScore(text, ability) {
  const r = new RegExp(`\\b${ability}\\b[^0-9]{0,10}(\\d{1,2})\\b`, 'i')
  const m = text.match(r)
  return m ? Number(m[1]) : null
}

function parseClassAndLevel(text) {
  const a = text.match(/Class(?:\s*&\s*Level|\/Level)?\s*[:\-]\s*([^\n]+)/i)
  if (a?.[1]) {
    const raw = a[1].trim()
    const levelMatch = raw.match(/(\d{1,2})/)
    const classMatch = CLASS_NAMES.find((c) => new RegExp(`\\b${c}\\b`, 'i').test(raw))
    return {
      className: classMatch || 'Fighter',
      level: levelMatch ? Number(levelMatch[1]) : 1,
    }
  }
  const b = text.match(/(\d{1,2})(?:st|nd|rd|th)?\s+Level\s+([A-Za-z]+)/i)
  if (b) return { className: b[2], level: Number(b[1]) }
  return { className: 'Fighter', level: 1 }
}

function extractSpellCandidates(text) {
  const section = text.match(/Spells?(?:\s+Known|\s+Prepared)?\s*[:\n]([\s\S]{0,1200})/i)?.[1] || ''
  if (!section) return []
  const stop = section.split(/\n(?:Features|Equipment|Attacks|Inventory|Proficiencies|Traits)\b/i)[0]
  return stop
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2 && s.length < 45)
}

function parseDraftFromText(rawText) {
  const text = rawText || ''
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  const firstNameLine = lines.find((l) => /^[A-Za-z][A-Za-z' -]{2,40}$/.test(l))
  const explicitName = text.match(/Character\s*Name\s*[:\-]\s*([^\n]+)/i)?.[1]?.trim()
  const name = explicitName || firstNameLine || 'Imported Character'
  const { className, level } = parseClassAndLevel(text)
  const species = text.match(/(?:Race|Species)\s*[:\-]\s*([^\n]+)/i)?.[1]?.trim() || ''
  const background = text.match(/Background\s*[:\-]\s*([^\n]+)/i)?.[1]?.trim() || ''
  const maxHp = Number(text.match(/(?:Hit\s*Points|HP)\s*[:\-]?\s*(\d{1,3})/i)?.[1] || 0) || null
  const ac = Number(text.match(/(?:Armor\s*Class|AC)\s*[:\-]?\s*(\d{1,2})/i)?.[1] || 0) || null

  const abilityScores = {}
  ABILITIES.forEach((a) => {
    abilityScores[a] = toAbilityBlock(parseAbilityScore(text, a) || 10)
  })

  return {
    id: `${slugify(name) || 'character'}-${Date.now().toString().slice(-6)}`,
    name,
    class: className,
    level: Math.max(1, Math.min(20, Number(level) || 1)),
    species,
    background,
    stats: {
      maxHp,
      ac,
      speed: 30,
      initiative: '+0',
      proficiencyBonus: '+2',
    },
    ability_scores: abilityScores,
    spellCandidates: extractSpellCandidates(text),
  }
}

async function pdfToText(file) {
  const pdfjs = await import('pdfjs-dist')
  const bytes = new Uint8Array(await file.arrayBuffer())
  const loadingTask = pdfjs.getDocument({ data: bytes, disableWorker: true })
  const pdf = await loadingTask.promise
  const chunks = []
  for (let p = 1; p <= pdf.numPages; p += 1) {
    const page = await pdf.getPage(p)
    const tc = await page.getTextContent()
    const pageText = tc.items.map((it) => it.str).join(' ')
    chunks.push(pageText)
  }
  return chunks.join('\n')
}

export default function CharacterPdfImport() {
  const campaign = useCampaignStore((s) => s.campaign)
  const [ruleset, setRuleset] = useState('2014')
  const [refSpells, setRefSpells] = useState([])
  const [loadingRef, setLoadingRef] = useState(false)

  const [file, setFile] = useState(null)
  const [parsing, setParsing] = useState(false)
  const [rawText, setRawText] = useState('')
  const [draft, setDraft] = useState(null)
  const [spellMatches, setSpellMatches] = useState([])
  const [unresolvedSpellNames, setUnresolvedSpellNames] = useState([])
  const [parseError, setParseError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveNotice, setSaveNotice] = useState(null)

  const mono = { fontFamily: 'var(--font-mono)' }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoadingRef(true)
      const { data, error } = await supabase
        .from('reference_spells')
        .select('id,ruleset,source_index,name,level,school,casting_time,range,components,duration,ritual,concentration,description,higher_level,attack_type,damage_dice,damage_type,save_ability,classes,source_url')
        .eq('ruleset', ruleset)
        .order('name')
      if (cancelled) return
      if (error) {
        setRefSpells([])
      } else {
        setRefSpells(data || [])
      }
      setLoadingRef(false)
    })()
    return () => { cancelled = true }
  }, [ruleset])

  const normalizedSpellLookup = useMemo(() => {
    const map = new Map()
    refSpells.forEach((row) => {
      map.set(normalizeSpellName(row.name), row)
    })
    return map
  }, [refSpells])

  const runParse = async () => {
    if (!file) return
    setParseError(null)
    setSaveNotice(null)
    setParsing(true)
    try {
      const text = await pdfToText(file)
      setRawText(text)
      const nextDraft = parseDraftFromText(text)
      setDraft(nextDraft)

      const textNorm = ` ${normalizeSpellName(text)} `
      const found = []
      const seen = new Set()
      refSpells.forEach((row) => {
        const key = normalizeSpellName(row.name)
        if (!key || seen.has(key)) return
        if (textNorm.includes(` ${key} `)) {
          seen.add(key)
          found.push({ ...row, confidence: 'high' })
        }
      })
      found.sort((a, b) => (a.level - b.level) || String(a.name).localeCompare(String(b.name)))
      setSpellMatches(found)

      const unresolved = []
      ;(nextDraft.spellCandidates || []).forEach((candidate) => {
        const key = normalizeSpellName(candidate)
        if (!key) return
        if (!normalizedSpellLookup.has(key)) unresolved.push(candidate)
      })
      setUnresolvedSpellNames(Array.from(new Set(unresolved)))
    } catch (e) {
      setParseError(String(e?.message || e))
    }
    setParsing(false)
  }

  const persistImport = async () => {
    if (!campaign?.id || !draft) return
    setSaving(true)
    setSaveNotice(null)
    setParseError(null)
    try {
      const characterPayload = {
        id: draft.id,
        campaign_id: campaign.id,
        name: draft.name,
        password: 'imported',
        class: draft.class || 'Fighter',
        subclass: null,
        level: Number(draft.level) || 1,
        species: draft.species || null,
        background: draft.background || null,
        player: null,
        image: null,
        colour: '#6f9b7a',
        is_npc: false,
        is_active: true,
        stats: draft.stats || {},
        ability_scores: draft.ability_scores || {},
        saving_throws: [],
        skills: [],
        spell_slots: {},
        features: [],
        weapons: [],
        healing_actions: [],
        buff_actions: [],
        equipment: [],
        magic_items: [],
        passive_scores: {},
        senses: null,
        languages: null,
        backstory: null,
        srd_refs: {
          imported_from_pdf: file?.name || null,
          importer_ruleset: ruleset,
          matched_reference_spell_indexes: spellMatches.map((s) => s.source_index),
        },
        homebrew_json: {
          importer: 'pdf-stage-4',
          imported_at: new Date().toISOString(),
          unresolved_spell_names: unresolvedSpellNames,
          extracted_text_sample: rawText.slice(0, 1500),
        },
        updated_at: new Date().toISOString(),
      }

      const { data: charRow, error: charErr } = await supabase
        .from('characters')
        .upsert(characterPayload, { onConflict: 'id' })
        .select()
        .single()
      if (charErr) throw charErr

      const desiredSpellIds = spellMatches.map((row) => makeCampaignSpellId(campaign.id, row))
      const existingSpellRows = desiredSpellIds.length > 0
        ? await supabase.from('spells').select('spell_id').in('spell_id', desiredSpellIds)
        : { data: [] }
      if (existingSpellRows.error) throw existingSpellRows.error
      const existingSpellIdSet = new Set((existingSpellRows.data || []).map((r) => r.spell_id))

      const toInsert = spellMatches
        .filter((row) => !existingSpellIdSet.has(makeCampaignSpellId(campaign.id, row)))
        .map((row) => referenceSpellRowToCampaignPayload(row, campaign.id))
      if (toInsert.length > 0) {
        const { error: insErr } = await supabase.from('spells').insert(toInsert)
        if (insErr) throw insErr
      }

      const { data: existingCharSpells, error: exCharErr } = await supabase
        .from('character_spells')
        .select('slot_level, order_index, spell_id')
        .eq('character_id', charRow.id)
      if (exCharErr) throw exCharErr

      const slotState = {}
      ;(existingCharSpells || []).forEach((row) => {
        const key = String(row.slot_level)
        if (!slotState[key]) slotState[key] = { maxOrder: 0, spellIds: new Set() }
        slotState[key].maxOrder = Math.max(slotState[key].maxOrder, row.order_index || 0)
        if (row.spell_id) slotState[key].spellIds.add(row.spell_id)
      })

      const newCharSpellRows = []
      spellMatches.forEach((ref) => {
        const spellId = makeCampaignSpellId(campaign.id, ref)
        const slot = Number(ref.level) === 0 ? 'cantrip' : String(ref.level || 1)
        if (!slotState[slot]) slotState[slot] = { maxOrder: 0, spellIds: new Set() }
        if (slotState[slot].spellIds.has(spellId)) return
        slotState[slot].maxOrder += 1
        newCharSpellRows.push({
          character_id: charRow.id,
          slot_level: slot,
          order_index: slotState[slot].maxOrder,
          spell_id: spellId,
          spell_data: {},
          overrides_json: {},
          updated_at: new Date().toISOString(),
        })
      })
      if (newCharSpellRows.length > 0) {
        const { error: charSpellErr } = await supabase.from('character_spells').insert(newCharSpellRows)
        if (charSpellErr) throw charSpellErr
      }

      setSaveNotice(`Saved "${charRow.name}" with ${spellMatches.length} matched spell(s).`)
    } catch (e) {
      setParseError(String(e?.message || e))
    }
    setSaving(false)
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', height: '100%', overflow: 'hidden' }}>
      <div style={{ borderRight: '1px solid var(--border)', padding: 16, overflowY: 'auto', background: 'var(--bg-surface)' }}>
        <div style={{ ...mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 8 }}>
          Stage 4 · PDF Character Import
        </div>
        <h2 style={{ margin: '0 0 10px', fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
          Upload & Parse
        </h2>
        <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
          Import a character sheet PDF, preview mapped fields, then confirm save. Spells are matched against internal reference rows with explicit unmatched flags.
        </p>

        <label style={{ ...mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
          Ruleset for spell matching
        </label>
        <select
          value={ruleset}
          onChange={(e) => setRuleset(e.target.value)}
          style={{
            width: '100%', marginTop: 6, marginBottom: 12, padding: '8px 10px',
            background: 'var(--bg-deep)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', color: 'var(--text-primary)',
          }}
        >
          <option value="2014">2014 SRD</option>
          <option value="2024">2024 SRD</option>
        </select>

        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          style={{ width: '100%', marginBottom: 12 }}
        />
        <button
          type="button"
          onClick={runParse}
          disabled={!file || parsing || loadingRef}
          style={{
            width: '100%', padding: '10px 12px',
            background: 'var(--green-dim)', border: '1px solid var(--green-mid)',
            borderRadius: 'var(--radius)', color: 'var(--green-bright)',
            ...mono, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em',
            cursor: !file || parsing || loadingRef ? 'not-allowed' : 'pointer',
            opacity: !file || parsing || loadingRef ? 0.55 : 1,
          }}
        >
          {parsing ? 'Parsing PDF…' : (loadingRef ? 'Loading reference…' : 'Parse PDF')}
        </button>

        <button
          type="button"
          onClick={persistImport}
          disabled={!campaign?.id || !draft || saving}
          style={{
            width: '100%', marginTop: 10, padding: '10px 12px',
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', color: 'var(--text-secondary)',
            ...mono, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em',
            cursor: !campaign?.id || !draft || saving ? 'not-allowed' : 'pointer',
            opacity: !campaign?.id || !draft || saving ? 0.55 : 1,
          }}
        >
          {saving ? 'Saving…' : 'Confirm & Save to DB'}
        </button>

        {!campaign?.id && (
          <div style={{ marginTop: 10, fontSize: 12, color: 'var(--warning)' }}>
            Load a campaign first.
          </div>
        )}
        {parseError && (
          <div style={{ marginTop: 10, fontSize: 12, color: 'var(--danger)', lineHeight: 1.5 }}>
            {parseError}
          </div>
        )}
        {saveNotice && (
          <div style={{ marginTop: 10, fontSize: 12, color: 'var(--green-bright)', lineHeight: 1.5 }}>
            {saveNotice}
          </div>
        )}
      </div>

      <div style={{ padding: 20, overflowY: 'auto' }}>
        {!draft && (
          <div style={{ color: 'var(--text-muted)', ...mono }}>
            Upload a PDF and run parse to preview import data.
          </div>
        )}
        {draft && (
          <>
            <h2 style={{ margin: '0 0 10px', fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
              Preview JSON
            </h2>
            <pre style={{
              padding: 12, borderRadius: 'var(--radius)',
              border: '1px solid var(--border)', background: 'var(--bg-card)',
              color: 'var(--text-secondary)', fontSize: 12, whiteSpace: 'pre-wrap',
              lineHeight: 1.5, marginBottom: 16,
            }}
            >
              {JSON.stringify({
                id: draft.id,
                name: draft.name,
                class: draft.class,
                level: draft.level,
                species: draft.species,
                background: draft.background,
                stats: draft.stats,
                ability_scores: draft.ability_scores,
              }, null, 2)}
            </pre>

            <h3 style={{ margin: '0 0 8px', color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
              Spell matches ({spellMatches.length})
            </h3>
            <div style={{ marginBottom: 16 }}>
              {spellMatches.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No reference spells matched.</div>}
              {spellMatches.slice(0, 50).map((s) => (
                <div key={s.id} style={{ padding: '4px 0', fontSize: 13, color: 'var(--text-secondary)' }}>
                  L{s.level} · {s.name} <span style={{ color: 'var(--text-muted)' }}>({s.confidence})</span>
                </div>
              ))}
            </div>

            <h3 style={{ margin: '0 0 8px', color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
              Unresolved spell names ({unresolvedSpellNames.length})
            </h3>
            <div style={{ marginBottom: 16 }}>
              {unresolvedSpellNames.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>None</div>}
              {unresolvedSpellNames.map((name) => (
                <div key={name} style={{ padding: '2px 0', fontSize: 13, color: 'var(--warning)' }}>{name}</div>
              ))}
            </div>

            <h3 style={{ margin: '0 0 8px', color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
              Extracted text sample
            </h3>
            <pre style={{
              padding: 12, borderRadius: 'var(--radius)',
              border: '1px solid var(--border)', background: 'var(--bg-deep)',
              color: 'var(--text-muted)', fontSize: 11, whiteSpace: 'pre-wrap',
              lineHeight: 1.45,
            }}
            >
              {rawText.slice(0, 4000)}
            </pre>
          </>
        )}
      </div>
    </div>
  )
}

