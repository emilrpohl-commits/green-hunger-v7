import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '@shared/lib/supabase.js'
import { useCampaignStore } from '../../stores/campaignStore'
import { referenceSpellRowToCampaignPayload } from '@shared/lib/reference/referenceSpellToCampaign.js'
import { srdMonsterToStatBlockDraft } from '@shared/lib/reference/srdMonsterToStatBlock.js'

const TABS = [
  { id: 'spells', label: 'Spells' },
  { id: 'monsters', label: 'Monsters' },
  { id: 'conditions', label: 'Conditions' },
]

export default function ReferenceLibrary() {
  const campaign = useCampaignStore((s) => s.campaign)
  const saveSpell = useCampaignStore((s) => s.saveSpell)
  const saveStatBlock = useCampaignStore((s) => s.saveStatBlock)

  const [tab, setTab] = useState('spells')
  const [ruleset, setRuleset] = useState('2014')
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(null)
  const [error, setError] = useState(null)

  const mono = { fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }

  const onPickTab = (id) => {
    setTab(id)
    setSelected(null)
    if ((id === 'spells' || id === 'monsters') && ruleset === '2024') setRuleset('2014')
  }

  const fetchRows = useCallback(async () => {
    setLoading(true)
    setError(null)
    const table = tab === 'spells' ? 'reference_spells' : tab === 'monsters' ? 'reference_monsters' : 'reference_conditions'
    try {
      let q = supabase.from(table).select('*').eq('ruleset', ruleset)
      const term = search.trim()
      if (term) q = q.ilike('name', `%${term}%`)
      if (tab === 'spells') {
        q = q.order('level', { ascending: true }).order('name', { ascending: true })
      } else {
        q = q.order('name', { ascending: true })
      }
      q = q.limit(200)
      const { data, error: e } = await q
      if (e) throw e
      setRows(data || [])
      setSelected((prev) => {
        if (!prev?.id) return null
        return (data || []).find((r) => r.id === prev.id) || null
      })
    } catch (err) {
      console.warn('ReferenceLibrary load:', err)
      setRows([])
      setError(err?.message || String(err))
    } finally {
      setLoading(false)
    }
  }, [tab, ruleset, search])

  useEffect(() => {
    const t = setTimeout(fetchRows, 200)
    return () => clearTimeout(t)
  }, [fetchRows])

  const copySpell = async () => {
    if (!campaign?.id || !selected || tab !== 'spells') return
    setBusy(true)
    setNotice(null)
    setError(null)
    const payload = referenceSpellRowToCampaignPayload(selected, campaign.id)
    const r = await saveSpell(payload)
    setBusy(false)
    if (r.error) setError(r.error)
    else setNotice(`Spell copied: ${r.data?.name} (${r.data?.spell_id})`)
  }

  const copyMonster = async () => {
    if (!campaign?.id || !selected || tab !== 'monsters') return
    setBusy(true)
    setNotice(null)
    setError(null)
    const raw = selected.raw_json
    if (!raw || typeof raw !== 'object') {
      setBusy(false)
      setError('Missing monster JSON on row.')
      return
    }
    const draft = srdMonsterToStatBlockDraft(raw)
    const r = await saveStatBlock({ ...draft, id: undefined })
    setBusy(false)
    if (r.error) setError(r.error)
    else setNotice(`Stat block created: ${r.data?.name}`)
  }

  const copyConditionText = async () => {
    if (!selected?.description) return
    try {
      await navigator.clipboard.writeText(`${selected.name}\n\n${selected.description}`)
      setNotice('Condition text copied to clipboard.')
    } catch {
      setError('Clipboard not available.')
    }
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <div style={{
        width: 320,
        flexShrink: 0,
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-surface)',
      }}
      >
        <div style={{ padding: 12, borderBottom: '1px solid var(--border)' }}>
          <div style={{ ...mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
            Ruleset
          </div>
          <select
            value={ruleset}
            onChange={(e) => setRuleset(e.target.value)}
            disabled={tab === 'spells' || tab === 'monsters'}
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              background: 'var(--bg-deep)',
              color: 'var(--text-primary)',
              opacity: tab === 'spells' || tab === 'monsters' ? 0.65 : 1,
            }}
          >
            <option value="2014">2014 SRD</option>
            <option value="2024">2024 SRD (conditions in bundle)</option>
          </select>
          {(tab === 'spells' || tab === 'monsters') && (
            <div style={{ ...mono, fontSize: 9, marginTop: 6, lineHeight: 1.4 }}>
              Spells and monsters import is 2014-only until 2024 JSON packs are added to the ETL.
            </div>
          )}
        </div>
        <div style={{ padding: 12, borderBottom: '1px solid var(--border)' }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name…"
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              background: 'var(--bg-deep)',
              color: 'var(--text-primary)',
              boxSizing: 'border-box',
            }}
          />
        </div>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onPickTab(t.id)}
              style={{
                flex: 1,
                padding: '10px 6px',
                border: 'none',
                cursor: 'pointer',
                background: tab === t.id ? 'rgba(100,200,100,0.1)' : 'transparent',
                color: tab === t.id ? 'var(--green-bright)' : 'var(--text-muted)',
                ...mono,
                fontSize: 9,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading && (
            <div style={{ padding: 16, ...mono }}>Loading…</div>
          )}
          {!loading && error && !rows.length && (
            <div style={{ padding: 16, color: 'var(--danger)', fontSize: 13, lineHeight: 1.5 }}>
              {error}
              <div style={{ ...mono, marginTop: 10, fontSize: 10 }}>
                Apply migration <code>20260411120000_reference_library_srd.sql</code>, then from <code>dm/</code> run{' '}
                <code>npm run reference:import</code> (sets <code>SUPABASE_URL</code> + <code>SUPABASE_SERVICE_ROLE_KEY</code>).
              </div>
            </div>
          )}
          {!loading && rows.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setSelected(r)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '10px 12px',
                border: 'none',
                borderBottom: '1px solid var(--border)',
                background: selected?.id === r.id ? 'rgba(100,200,100,0.08)' : 'transparent',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              {tab === 'spells' && (
                <span style={{ ...mono, fontSize: 10, color: 'var(--text-muted)', marginRight: 8 }}>L{r.level}</span>
              )}
              {r.name}
              {tab === 'monsters' && r.challenge_rating != null && (
                <span style={{ ...mono, marginLeft: 8, color: 'var(--text-muted)' }}>CR {r.challenge_rating}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        {!selected && (
          <div style={{ color: 'var(--text-muted)', ...mono }}>Select an entry to view details.</div>
        )}
        {selected && (
          <>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 22,
              color: 'var(--text-primary)',
              margin: '0 0 8px',
            }}
            >
              {selected.name}
            </h2>
            <div style={{ ...mono, marginBottom: 16 }}>
              {selected.source_index}
              {' · '}
              {selected.ruleset}
            </div>

            {tab === 'spells' && (
              <>
                <pre style={{
                  whiteSpace: 'pre-wrap',
                  fontSize: 13,
                  lineHeight: 1.55,
                  color: 'var(--text-secondary)',
                  marginBottom: 16,
                }}
                >
                  {selected.description || '—'}
                </pre>
                {selected.higher_level && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ ...mono, marginBottom: 6 }}>At higher levels</div>
                    <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, color: 'var(--text-muted)' }}>
                      {selected.higher_level}
                    </pre>
                  </div>
                )}
              </>
            )}

            {tab === 'monsters' && (
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
                <div><strong>AC</strong> {selected.ac ?? '—'} · <strong>HP</strong> {selected.max_hp ?? '—'} · <strong>Speed</strong> {selected.speed || '—'}</div>
                <div style={{ marginTop: 8 }}><strong>Type</strong> {selected.size} {selected.creature_type}, {selected.alignment}</div>
              </div>
            )}

            {tab === 'conditions' && (
              <pre style={{
                whiteSpace: 'pre-wrap',
                fontSize: 13,
                lineHeight: 1.55,
                color: 'var(--text-secondary)',
                marginBottom: 16,
              }}
              >
                {selected.description || '—'}
              </pre>
            )}

            {notice && (
              <div style={{ color: 'var(--green-bright)', ...mono, marginBottom: 12 }}>{notice}</div>
            )}
            {error && (
              <div style={{ color: 'var(--danger)', ...mono, marginBottom: 12 }}>{error}</div>
            )}

            {!campaign && (
              <div style={{ color: 'var(--warning)', marginBottom: 12, fontSize: 13 }}>
                Load a campaign to copy spells or monsters into it.
              </div>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {tab === 'spells' && (
                <button
                  type="button"
                  disabled={!campaign || busy}
                  onClick={copySpell}
                  style={{
                    padding: '10px 18px',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--green-mid)',
                    background: 'var(--green-dim)',
                    color: 'var(--green-bright)',
                    ...mono,
                    fontSize: 10,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    cursor: campaign && !busy ? 'pointer' : 'not-allowed',
                    opacity: campaign && !busy ? 1 : 0.5,
                  }}
                >
                  {busy ? 'Saving…' : 'Copy spell to campaign'}
                </button>
              )}
              {tab === 'monsters' && (
                <button
                  type="button"
                  disabled={!campaign || busy}
                  onClick={copyMonster}
                  style={{
                    padding: '10px 18px',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--green-mid)',
                    background: 'var(--green-dim)',
                    color: 'var(--green-bright)',
                    ...mono,
                    fontSize: 10,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    cursor: campaign && !busy ? 'pointer' : 'not-allowed',
                    opacity: campaign && !busy ? 1 : 0.5,
                  }}
                >
                  {busy ? 'Saving…' : 'Copy to stat block'}
                </button>
              )}
              {tab === 'conditions' && (
                <button
                  type="button"
                  onClick={copyConditionText}
                  style={{
                    padding: '10px 18px',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-secondary)',
                    ...mono,
                    fontSize: 10,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    cursor: 'pointer',
                  }}
                >
                  Copy text
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
