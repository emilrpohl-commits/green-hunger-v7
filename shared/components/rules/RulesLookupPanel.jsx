import React, { useEffect, useMemo, useState } from 'react'
import { searchRulesGlossary, getRulesGlossaryMeta } from '@shared/lib/rules/glossaryService.js'

/**
 * Modal rules lookup: search flattened SRD glossary (from @rules-data).
 * @param {{ open: boolean, onClose: () => void }} props
 */
export default function RulesLookupPanel({ open, onClose }) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)

  const results = useMemo(() => searchRulesGlossary(query), [query])
  const meta = useMemo(() => getRulesGlossaryMeta(), [])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  useEffect(() => {
    if (results.length && selectedIndex >= results.length) setSelectedIndex(0)
  }, [results.length, selectedIndex])

  const selected = results.length ? results[Math.min(selectedIndex, results.length - 1)] : null

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Rules lookup"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 400,
        background: 'rgba(10,12,10,0.72)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div
        style={{
          width: 'min(520px, 100%)',
          maxHeight: 'min(80vh, 640px)',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-card, #141814)',
          border: '1px solid var(--border, #2a3028)',
          borderRadius: 'var(--radius-lg, 12px)',
          boxShadow: '0 12px 48px rgba(0,0,0,0.45)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '12px 14px',
            borderBottom: '1px solid var(--border, #2a3028)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: 'var(--font-mono, monospace)',
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'var(--text-muted, #8a9088)',
              }}
            >
              Rules glossary
            </div>
            {meta?.title && (
              <div style={{ fontSize: 12, color: 'var(--text-secondary, #b8c0b0)', marginTop: 2 }}>
                {meta.title}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '6px 12px',
              fontSize: 11,
              fontFamily: 'var(--font-mono, monospace)',
              borderRadius: 'var(--radius, 6px)',
              border: '1px solid var(--border, #2a3028)',
              background: 'transparent',
              color: 'var(--text-muted, #8a9088)',
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>

        <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border, #2a3028)' }}>
          <input
            type="search"
            autoFocus
            placeholder="Search concentration, bonus action, blinded…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '8px 10px',
              fontSize: 14,
              borderRadius: 'var(--radius, 6px)',
              border: '1px solid var(--border, #2a3028)',
              background: 'var(--bg-raised, #1a1e18)',
              color: 'var(--text-primary, #e8ebe4)',
              outline: 'none',
            }}
          />
        </div>

        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          <div
            style={{
              width: '38%',
              minWidth: 140,
              borderRight: '1px solid var(--border, #2a3028)',
              overflowY: 'auto',
            }}
          >
            {results.length === 0 && (
              <div style={{ padding: 12, fontSize: 12, color: 'var(--text-muted, #8a9088)' }}>
                No matches
              </div>
            )}
            {results.map((e, i) => (
              <button
                key={`${e.term}-${e.key || i}`}
                type="button"
                onClick={() => setSelectedIndex(i)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 10px',
                  fontSize: 12,
                  border: 'none',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  background: selectedIndex === i ? 'rgba(122,184,106,0.12)' : 'transparent',
                  color: 'var(--text-primary, #e8ebe4)',
                  cursor: 'pointer',
                }}
              >
                {e.term}
              </button>
            ))}
          </div>
          <div style={{ flex: 1, padding: '12px 14px', overflowY: 'auto', fontSize: 13, lineHeight: 1.55 }}>
            {selected ? (
              <>
                <div
                  style={{
                    fontFamily: 'var(--font-display, serif)',
                    fontSize: 16,
                    marginBottom: 8,
                    color: 'var(--green-bright, #7ab86a)',
                  }}
                >
                  {selected.term}
                </div>
                {selected.families?.length > 0 && (
                  <div
                    style={{
                      fontSize: 10,
                      fontFamily: 'var(--font-mono, monospace)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: 'var(--text-muted, #8a9088)',
                      marginBottom: 10,
                    }}
                  >
                    {selected.families.join(' · ')}
                  </div>
                )}
                <div style={{ color: 'var(--text-secondary, #b8c0b0)', whiteSpace: 'pre-wrap' }}>
                  {selected.definition}
                </div>
              </>
            ) : (
              <div style={{ color: 'var(--text-muted, #8a9088)' }}>Type to search</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
