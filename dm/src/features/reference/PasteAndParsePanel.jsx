import React, { useMemo, useState } from 'react'
import { detectContentType } from '@shared/lib/parsers/detectContentType.js'
import { parseSpell } from '@shared/lib/parseSpell.js'
import { parseStatBlock } from '@shared/lib/parseStatBlock.js'
import { parseFeat } from '@shared/lib/parsers/parseFeat.js'
import { parseRace } from '@shared/lib/parsers/parseRace.js'
import { parseTrait } from '@shared/lib/parsers/parseTrait.js'
import { parseBackground } from '@shared/lib/parsers/parseBackground.js'
import { parseClassFeature } from '@shared/lib/parsers/parseClassFeature.js'
import { parseEquipment } from '@shared/lib/parsers/parseEquipment.js'
import { parseMagicItem } from '@shared/lib/parsers/parseMagicItem.js'
import { parseSubclass } from '@shared/lib/parsers/parseSubclass.js'

const TYPE_OPTIONS = [
  { id: 'auto', label: 'Auto-detect' },
  { id: 'spell', label: 'Spell' },
  { id: 'stat-block', label: 'Stat Block' },
  { id: 'feat', label: 'Feat' },
  { id: 'race', label: 'Race / Species' },
  { id: 'trait', label: 'Trait' },
  { id: 'background', label: 'Background' },
  { id: 'class-feature', label: 'Class Feature' },
  { id: 'equipment', label: 'Equipment' },
  { id: 'magic-item', label: 'Magic Item' },
  { id: 'subclass', label: 'Subclass' },
]

const PARSERS = {
  spell: parseSpell,
  'stat-block': parseStatBlock,
  feat: parseFeat,
  race: parseRace,
  trait: parseTrait,
  background: parseBackground,
  'class-feature': parseClassFeature,
  equipment: parseEquipment,
  'magic-item': parseMagicItem,
  subclass: parseSubclass,
}

export default function PasteAndParsePanel({ onParsed }) {
  const [rawText, setRawText] = useState('')
  const [selectedType, setSelectedType] = useState('auto')
  const [sourceBook, setSourceBook] = useState("Player's Handbook")
  const [detectedType, setDetectedType] = useState('unknown')
  const [parseError, setParseError] = useState(null)
  const [showRaw, setShowRaw] = useState(false)

  const resolvedType = useMemo(
    () => (selectedType === 'auto' ? detectedType : selectedType),
    [selectedType, detectedType]
  )

  const handleParse = () => {
    const text = rawText.trim()
    if (!text) return
    const autoType = detectContentType(text)
    setDetectedType(autoType)
    const type = selectedType === 'auto' ? autoType : selectedType
    const parser = PARSERS[type]
    if (!parser) {
      setParseError('Could not detect content type. Select a type manually and parse again.')
      return
    }
    try {
      const parsed = parser(text) || {}
      setParseError(null)
      onParsed?.({
        type,
        rawText: text,
        source_book: sourceBook,
        source_type: sourceBook.toLowerCase() === 'homebrew' ? 'custom' : 'third-party',
        parsed: {
          ...parsed,
          source_book: sourceBook,
          source_type: sourceBook.toLowerCase() === 'homebrew' ? 'custom' : 'third-party',
        },
      })
    } catch (e) {
      setParseError(String(e?.message || e))
    }
  }

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 14, background: 'var(--bg-surface)' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 8 }}>
        Paste & Parse
      </div>
      <textarea
        value={rawText}
        onChange={(e) => setRawText(e.target.value)}
        placeholder="Paste content from your sourcebook here…"
        style={{ width: '100%', minHeight: 180, resize: 'vertical', padding: '10px 12px', boxSizing: 'border-box', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg-deep)', color: 'var(--text-primary)', fontSize: 13, lineHeight: 1.55 }}
      />
      <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr auto auto', gap: 8, marginTop: 10, alignItems: 'center' }}>
        <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} style={{ padding: '8px 10px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg-deep)', color: 'var(--text-primary)' }}>
          {TYPE_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
        </select>
        <input value={sourceBook} onChange={(e) => setSourceBook(e.target.value)} placeholder="Source book" style={{ padding: '8px 10px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg-deep)', color: 'var(--text-primary)' }} />
        <button type="button" onClick={() => setShowRaw((x) => !x)} style={{ padding: '8px 10px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase' }}>
          {showRaw ? 'Hide Raw' : 'Edit Raw'}
        </button>
        <button type="button" onClick={handleParse} style={{ padding: '8px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--green-mid)', background: 'var(--green-dim)', color: 'var(--green-bright)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase' }}>
          Parse
        </button>
      </div>
      <div style={{ marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: 10, color: parseError ? 'var(--danger)' : 'var(--text-muted)' }}>
        {parseError || `Detected: ${resolvedType || 'unknown'}`}
      </div>
      {showRaw && (
        <pre style={{ marginTop: 10, padding: 10, border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--bg-raised)', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', maxHeight: 200, overflow: 'auto' }}>
          {rawText || 'No raw text yet.'}
        </pre>
      )}
    </div>
  )
}
