import React, { useState, useEffect, useMemo } from 'react'
import { useRevealStore, isLoreCardRevealedInSession } from '../../stores/revealStore'
import { useSessionStore } from '../../stores/sessionStore'
import { useCampaignStore } from '../../stores/campaignStore'

const TONE_STYLE = {
  narrative: { color: 'var(--green-bright)', border: 'var(--green-dim)' },
  ominous:   { color: '#9a7ab0', border: '#3a2a50' },
  danger:    { color: 'var(--danger)', border: 'rgba(196,64,64,0.3)' },
  npc:       { color: '#70a0c0', border: '#203040' },
  item:      { color: 'var(--warning)', border: 'rgba(196,160,64,0.3)' },
  lore:      { color: 'var(--text-secondary)', border: 'var(--border)' },
  location:  { color: '#80b090', border: '#203028' },
}

const TONE_OPTIONS = Object.keys(TONE_STYLE)

function normalizeLoreId(name = '') {
  const s = String(name)
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return s || 'lore_card'
}

function nextUniqueLoreId(base, catalog) {
  let id = base
  let n = 2
  while ((catalog || []).some((c) => c.id === id)) {
    id = `${base}_${n}`
    n += 1
  }
  return id
}

const inputBase = {
  width: '100%',
  padding: '6px 8px',
  fontFamily: 'var(--font-body)',
  fontSize: 13,
  background: 'var(--bg-raised)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  color: 'var(--text-primary)',
  outline: 'none',
  boxSizing: 'border-box',
}

const labelMono = {
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  display: 'block',
  marginBottom: 4,
}

export default function RevealPanel() {
  const reveals = useRevealStore((s) => s.reveals)
  const loreCatalog = useRevealStore((s) => s.loreCatalog)
  const revealBeat = useRevealStore((s) => s.revealBeat)
  const revealLoreCard = useRevealStore((s) => s.revealLoreCard)
  const revealCustom = useRevealStore((s) => s.revealCustom)
  const hideReveal = useRevealStore((s) => s.hideReveal)
  const clearAllReveals = useRevealStore((s) => s.clearAllReveals)
  const loadReveals = useRevealStore((s) => s.loadReveals)
  const loadLoreCatalog = useRevealStore((s) => s.loadLoreCatalog)
  const saveLoreCard = useRevealStore((s) => s.saveLoreCard)
  const deleteLoreCard = useRevealStore((s) => s.deleteLoreCard)

  const campaign = useCampaignStore((s) => s.campaign)
  const campaignId = campaign?.id

  const session = useSessionStore((s) => s.session)
  const currentSceneIndex = useSessionStore((s) => s.currentSceneIndex)
  const currentBeatIndex = useSessionStore((s) => s.currentBeatIndex)

  const scene = session?.scenes?.[currentSceneIndex]
  const beat = scene?.beats?.[currentBeatIndex]

  const [activeTab, setActiveTab] = useState('current')
  const [filterCategory, setFilterCategory] = useState('All')
  const [loreSearch, setLoreSearch] = useState('')
  const [expandedLore, setExpandedLore] = useState({})
  const [loreFormMsg, setLoreFormMsg] = useState(null)
  const [loreBusy, setLoreBusy] = useState(false)

  const [editingLoreId, setEditingLoreId] = useState(null)
  const [editForm, setEditForm] = useState({
    id: '',
    category: '',
    title: '',
    content: '',
    tone: 'lore',
    sort_order: 0,
  })

  const [showNewLore, setShowNewLore] = useState(false)
  const [newForm, setNewForm] = useState({
    id: '',
    category: '',
    title: '',
    content: '',
    tone: 'lore',
    sort_order: 0,
  })

  const [customTitle, setCustomTitle] = useState('')
  const [customContent, setCustomContent] = useState('')
  const [customCategory, setCustomCategory] = useState('Note')

  const CATEGORIES = useMemo(
    () => [...new Set((loreCatalog || []).map((c) => c.category).filter(Boolean))],
    [loreCatalog],
  )

  useEffect(() => {
    loadReveals()
  }, [loadReveals])

  useEffect(() => {
    loadLoreCatalog(campaignId)
  }, [campaignId, loadLoreCatalog])

  const filteredByCategory =
    filterCategory === 'All'
      ? loreCatalog || []
      : (loreCatalog || []).filter((c) => c.category === filterCategory)

  const q = loreSearch.trim().toLowerCase()
  const filteredLore = !q
    ? filteredByCategory
    : filteredByCategory.filter(
        (c) =>
          (c.title || '').toLowerCase().includes(q) ||
          (c.category || '').toLowerCase().includes(q) ||
          (c.content || '').toLowerCase().includes(q),
      )

  const maxSortOrder = useMemo(() => {
    const rows = loreCatalog || []
    if (!rows.length) return 0
    return Math.max(...rows.map((r) => (typeof r.sort_order === 'number' ? r.sort_order : 0)))
  }, [loreCatalog])

  const refetchId = campaignId

  const openEdit = (card) => {
    setEditingLoreId(card.id)
    setEditForm({
      id: card.id,
      category: card.category || '',
      title: card.title || '',
      content: card.content || '',
      tone: card.tone || 'lore',
      sort_order: typeof card.sort_order === 'number' ? card.sort_order : 0,
    })
    setLoreFormMsg(null)
  }

  const cancelEdit = () => {
    setEditingLoreId(null)
    setLoreFormMsg(null)
  }

  const handleSaveEdit = async () => {
    if (!editForm.title.trim() || !editForm.content.trim()) {
      setLoreFormMsg({ type: 'err', text: 'Title and content required.' })
      return
    }
    setLoreBusy(true)
    setLoreFormMsg(null)
    const res = await saveLoreCard(
      {
        id: editForm.id,
        category: editForm.category.trim() || null,
        title: editForm.title.trim(),
        content: editForm.content.trim(),
        tone: editForm.tone,
        sort_order: Number(editForm.sort_order) || 0,
        campaign_id: campaignId ?? null,
      },
      refetchId,
    )
    setLoreBusy(false)
    if (res.error) setLoreFormMsg({ type: 'err', text: res.error })
    else cancelEdit()
  }

  const handleSaveNew = async () => {
    if (!newForm.title.trim() || !newForm.content.trim()) {
      setLoreFormMsg({ type: 'err', text: 'Title and content required.' })
      return
    }
    const baseId = (newForm.id.trim() || normalizeLoreId(newForm.title))
    const id = nextUniqueLoreId(baseId, loreCatalog || [])
    setLoreBusy(true)
    setLoreFormMsg(null)
    const res = await saveLoreCard(
      {
        id,
        category: newForm.category.trim() || null,
        title: newForm.title.trim(),
        content: newForm.content.trim(),
        tone: newForm.tone,
        sort_order: Number(newForm.sort_order) || maxSortOrder + 1,
        // Global catalog when no campaign loaded (comment: DM can still seed shared lore rows).
        campaign_id: campaignId ?? null,
      },
      refetchId,
    )
    setLoreBusy(false)
    if (res.error) setLoreFormMsg({ type: 'err', text: res.error })
    else {
      setNewForm({
        id: '',
        category: '',
        title: '',
        content: '',
        tone: 'lore',
        sort_order: maxSortOrder + 2,
      })
      setShowNewLore(false)
    }
  }

  const handleDeleteLore = async (card) => {
    if (!window.confirm(`Delete lore card “${card.title}”? This cannot be undone.`)) return
    setLoreBusy(true)
    const res = await deleteLoreCard(card.id, refetchId)
    setLoreBusy(false)
    if (res.error) setLoreFormMsg({ type: 'err', text: res.error })
    if (editingLoreId === card.id) cancelEdit()
  }

  const toggleLoreExpand = (id) => {
    setExpandedLore((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const handleRevealBeat = () => {
    if (beat && scene) revealBeat(beat, scene.title)
  }

  const handleCustomReveal = () => {
    if (!customTitle.trim() || !customContent.trim()) return
    revealCustom(customTitle, customContent, customCategory)
    setCustomTitle('')
    setCustomContent('')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {[
          { id: 'current', label: 'Current Beat' },
          { id: 'lore', label: 'Lore Cards' },
          { id: 'custom', label: 'Custom' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            style={{
              flex: 1,
              padding: '8px 0',
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              background: activeTab === t.id ? 'var(--bg-raised)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === t.id ? '2px solid var(--rot-bright)' : '2px solid transparent',
              color: activeTab === t.id ? 'var(--rot-bright)' : 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>

        {activeTab === 'current' && (
          <div style={{ padding: '14px' }}>
            {beat ? (
              <>
                <div
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '12px 14px',
                    marginBottom: 10,
                  }}
                >
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 9,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      marginBottom: 5,
                    }}
                  >
                    {scene?.title} · {beat.title}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: 'var(--text-secondary)',
                      fontStyle: 'italic',
                      lineHeight: 1.6,
                      marginBottom: 12,
                    }}
                  >
                    {(beat.player_text || beat.content || '').length > 120
                      ? `${(beat.player_text || beat.content || '').slice(0, 120)}…`
                      : beat.player_text || beat.content || ''}
                  </div>
                  <button
                    type="button"
                    onClick={handleRevealBeat}
                    style={{
                      width: '100%',
                      padding: '8px 0',
                      background: 'rgba(196,112,64,0.12)',
                      border: '1px solid rgba(196,112,64,0.35)',
                      borderRadius: 'var(--radius)',
                      color: 'var(--rot-bright)',
                      fontSize: 12,
                      fontFamily: 'var(--font-mono)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      cursor: 'pointer',
                    }}
                  >
                    ✦ Reveal to Players
                  </button>
                </div>

                {reveals.length > 0 && (
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 8,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 9,
                          color: 'var(--text-muted)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                        }}
                      >
                        Revealed ({reveals.length})
                      </span>
                      <button
                        type="button"
                        onClick={clearAllReveals}
                        style={{
                          padding: '2px 7px',
                          fontSize: 10,
                          background: 'transparent',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius)',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                        }}
                      >
                        Clear all
                      </button>
                    </div>
                    {reveals.map((r) => (
                      <div
                        key={r.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          padding: '6px 8px',
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius)',
                          marginBottom: 4,
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 12, color: 'var(--text-primary)' }}>{r.title}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{r.category}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => hideReveal(r.id)}
                          style={{
                            padding: '2px 6px',
                            fontSize: 10,
                            background: 'transparent',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius)',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            flexShrink: 0,
                            marginLeft: 8,
                          }}
                        >
                          Hide
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No beat selected.</div>
            )}
          </div>
        )}

        {activeTab === 'lore' && (
          <div style={{ padding: '14px' }}>
            <input
              type="search"
              placeholder="Search lore…"
              value={loreSearch}
              onChange={(e) => setLoreSearch(e.target.value)}
              style={{ ...inputBase, marginBottom: 10 }}
            />

            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>
              {['All', ...CATEGORIES].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setFilterCategory(cat)}
                  style={{
                    padding: '3px 8px',
                    fontSize: 10,
                    fontFamily: 'var(--font-mono)',
                    background: filterCategory === cat ? 'rgba(196,112,64,0.15)' : 'var(--bg-raised)',
                    border: `1px solid ${filterCategory === cat ? 'rgba(196,112,64,0.4)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius)',
                    color: filterCategory === cat ? 'var(--rot-bright)' : 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            {loreFormMsg && (
              <div
                style={{
                  fontSize: 11,
                  marginBottom: 8,
                  color: loreFormMsg.type === 'err' ? 'var(--danger)' : 'var(--green-bright)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {loreFormMsg.text}
              </div>
            )}

            <div style={{ marginBottom: 12 }}>
              <button
                type="button"
                onClick={() => {
                  setShowNewLore((v) => {
                    const next = !v
                    if (next) {
                      setNewForm({
                        id: '',
                        category: '',
                        title: '',
                        content: '',
                        tone: 'lore',
                        sort_order: maxSortOrder + 1,
                      })
                    }
                    setLoreFormMsg(null)
                    return next
                  })
                }}
                style={{
                  width: '100%',
                  padding: '6px',
                  fontSize: 10,
                  fontFamily: 'var(--font-mono)',
                  textTransform: 'uppercase',
                  background: 'var(--bg-raised)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                {showNewLore ? 'Cancel new card' : '+ New lore card'}
              </button>
            </div>

            {showNewLore && (
              <div
                style={{
                  padding: 10,
                  marginBottom: 12,
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                }}
              >
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', marginBottom: 8 }}>
                  New card · ID auto-filled from title if empty · {campaignId ? 'Scoped to campaign' : 'Global (no campaign id)'}
                </div>
                <label style={labelMono}>Id (optional)</label>
                <input
                  style={{ ...inputBase, marginBottom: 8 }}
                  value={newForm.id}
                  onChange={(e) => setNewForm((f) => ({ ...f, id: e.target.value }))}
                  placeholder="slug_from_title"
                />
                <label style={labelMono}>Category</label>
                <input
                  style={{ ...inputBase, marginBottom: 8 }}
                  value={newForm.category}
                  onChange={(e) => setNewForm((f) => ({ ...f, category: e.target.value }))}
                />
                <label style={labelMono}>Title</label>
                <input
                  style={{ ...inputBase, marginBottom: 8 }}
                  value={newForm.title}
                  onChange={(e) => setNewForm((f) => ({ ...f, title: e.target.value }))}
                />
                <label style={labelMono}>Content</label>
                <textarea
                  style={{ ...inputBase, minHeight: 72, resize: 'vertical', lineHeight: 1.5, marginBottom: 8 }}
                  value={newForm.content}
                  onChange={(e) => setNewForm((f) => ({ ...f, content: e.target.value }))}
                />
                <label style={labelMono}>Tone</label>
                <select
                  style={{ ...inputBase, marginBottom: 8 }}
                  value={newForm.tone}
                  onChange={(e) => setNewForm((f) => ({ ...f, tone: e.target.value }))}
                >
                  {TONE_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <label style={labelMono}>Sort order</label>
                <input
                  type="number"
                  style={{ ...inputBase, marginBottom: 8 }}
                  value={newForm.sort_order}
                  onChange={(e) => setNewForm((f) => ({ ...f, sort_order: parseInt(e.target.value, 10) || 0 }))}
                />
                <button
                  type="button"
                  disabled={loreBusy}
                  onClick={handleSaveNew}
                  style={{
                    width: '100%',
                    padding: '8px',
                    fontSize: 11,
                    fontFamily: 'var(--font-mono)',
                    textTransform: 'uppercase',
                    background: 'rgba(196,112,64,0.12)',
                    border: '1px solid rgba(196,112,64,0.35)',
                    borderRadius: 'var(--radius)',
                    color: 'var(--rot-bright)',
                    cursor: loreBusy ? 'wait' : 'pointer',
                  }}
                >
                  Save to database
                </button>
              </div>
            )}

            {filteredLore.map((card) => {
              const style = TONE_STYLE[card.tone] || TONE_STYLE.lore
              const alreadyRevealed = isLoreCardRevealedInSession(card.id, reveals)
              const expanded = !!expandedLore[card.id]
              const isEditing = editingLoreId === card.id
              const teaser =
                card.content.length > 100 ? `${card.content.slice(0, 100)}…` : card.content

              if (isEditing) {
                return (
                  <div
                    key={card.id}
                    style={{
                      background: 'var(--bg-card)',
                      border: `1px solid ${style.border}`,
                      borderRadius: 'var(--radius-lg)',
                      padding: '10px 12px',
                      marginBottom: 8,
                    }}
                  >
                    <div style={{ ...labelMono, marginBottom: 6 }}>Edit · {editForm.id}</div>
                    <label style={labelMono}>Category</label>
                    <input
                      style={{ ...inputBase, marginBottom: 6 }}
                      value={editForm.category}
                      onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}
                    />
                    <label style={labelMono}>Title</label>
                    <input
                      style={{ ...inputBase, marginBottom: 6 }}
                      value={editForm.title}
                      onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                    />
                    <label style={labelMono}>Content</label>
                    <textarea
                      style={{ ...inputBase, minHeight: 80, resize: 'vertical', lineHeight: 1.5, marginBottom: 6 }}
                      value={editForm.content}
                      onChange={(e) => setEditForm((f) => ({ ...f, content: e.target.value }))}
                    />
                    <label style={labelMono}>Tone</label>
                    <select
                      style={{ ...inputBase, marginBottom: 6 }}
                      value={editForm.tone}
                      onChange={(e) => setEditForm((f) => ({ ...f, tone: e.target.value }))}
                    >
                      {TONE_OPTIONS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    <label style={labelMono}>Sort order</label>
                    <input
                      type="number"
                      style={{ ...inputBase, marginBottom: 8 }}
                      value={editForm.sort_order}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, sort_order: parseInt(e.target.value, 10) || 0 }))
                      }
                    />
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        disabled={loreBusy}
                        onClick={handleSaveEdit}
                        style={{
                          flex: 1,
                          padding: '6px',
                          fontSize: 10,
                          fontFamily: 'var(--font-mono)',
                          textTransform: 'uppercase',
                          background: 'var(--green-dim)',
                          border: '1px solid var(--green-mid)',
                          borderRadius: 'var(--radius)',
                          color: 'var(--green-bright)',
                          cursor: loreBusy ? 'wait' : 'pointer',
                        }}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        style={{
                          flex: 1,
                          padding: '6px',
                          fontSize: 10,
                          fontFamily: 'var(--font-mono)',
                          background: 'transparent',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius)',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )
              }

              return (
                <div
                  key={card.id}
                  style={{
                    background: 'var(--bg-card)',
                    border: `1px solid ${style.border}`,
                    borderRadius: 'var(--radius-lg)',
                    padding: '10px 12px',
                    marginBottom: 8,
                    opacity: alreadyRevealed ? 0.5 : 1,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5, gap: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 9,
                          color: style.color,
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                          marginBottom: 2,
                        }}
                      >
                        {card.category}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{card.title}</div>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'flex-end', flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={() => revealLoreCard(card)}
                        disabled={alreadyRevealed}
                        style={{
                          padding: '3px 8px',
                          fontSize: 10,
                          background: alreadyRevealed ? 'transparent' : 'rgba(196,112,64,0.1)',
                          border: `1px solid ${alreadyRevealed ? 'var(--border)' : 'rgba(196,112,64,0.35)'}`,
                          borderRadius: 'var(--radius)',
                          color: alreadyRevealed ? 'var(--text-muted)' : 'var(--rot-bright)',
                          cursor: alreadyRevealed ? 'default' : 'pointer',
                        }}
                      >
                        {alreadyRevealed ? 'Revealed' : '✦ Reveal'}
                      </button>
                      <button
                        type="button"
                        onClick={() => openEdit(card)}
                        disabled={loreBusy}
                        style={{
                          padding: '3px 8px',
                          fontSize: 10,
                          background: 'transparent',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius)',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteLore(card)}
                        disabled={loreBusy}
                        style={{
                          padding: '3px 8px',
                          fontSize: 10,
                          background: 'transparent',
                          border: '1px solid rgba(196,64,64,0.35)',
                          borderRadius: 'var(--radius)',
                          color: 'var(--danger)',
                          cursor: 'pointer',
                        }}
                      >
                        Del
                      </button>
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--text-muted)',
                      fontStyle: 'italic',
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {expanded ? card.content : teaser}
                  </div>
                  {card.content.length > 100 && (
                    <button
                      type="button"
                      onClick={() => toggleLoreExpand(card.id)}
                      style={{
                        marginTop: 6,
                        padding: 0,
                        fontSize: 10,
                        fontFamily: 'var(--font-mono)',
                        background: 'none',
                        border: 'none',
                        color: 'var(--rot-bright)',
                        cursor: 'pointer',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                      }}
                    >
                      {expanded ? 'Show less' : 'Show full text'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {activeTab === 'custom' && (
          <div style={{ padding: '14px' }}>
            <div style={{ marginBottom: 10 }}>
              <label style={labelMono}>Category</label>
              <input
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="Note"
                style={inputBase}
              />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={labelMono}>Title</label>
              <input
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="What the players see as the heading"
                style={inputBase}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelMono}>Content</label>
              <textarea
                value={customContent}
                onChange={(e) => setCustomContent(e.target.value)}
                placeholder="The text your players will read…"
                rows={5}
                style={{ ...inputBase, resize: 'vertical', lineHeight: 1.6 }}
              />
            </div>
            <button
              type="button"
              onClick={handleCustomReveal}
              disabled={!customTitle.trim() || !customContent.trim()}
              style={{
                width: '100%',
                padding: '10px 0',
                background: 'rgba(196,112,64,0.12)',
                border: '1px solid rgba(196,112,64,0.35)',
                borderRadius: 'var(--radius)',
                color: 'var(--rot-bright)',
                fontSize: 12,
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                cursor: 'pointer',
              }}
            >
              ✦ Reveal to Players
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
