import React, { useState, useEffect } from 'react'
import { useRevealStore, LORE_CARDS } from '../../stores/revealStore'
import { useSessionStore } from '../../stores/sessionStore'

const TONE_STYLE = {
  narrative: { color: 'var(--green-bright)', border: 'var(--green-dim)' },
  ominous:   { color: '#9a7ab0', border: '#3a2a50' },
  danger:    { color: 'var(--danger)', border: 'rgba(196,64,64,0.3)' },
  npc:       { color: '#70a0c0', border: '#203040' },
  item:      { color: 'var(--warning)', border: 'rgba(196,160,64,0.3)' },
  lore:      { color: 'var(--text-secondary)', border: 'var(--border)' },
  location:  { color: '#80b090', border: '#203028' }
}

const CATEGORIES = [...new Set(LORE_CARDS.map(c => c.category))]

export default function RevealPanel() {
  const reveals = useRevealStore(s => s.reveals)
  const revealBeat = useRevealStore(s => s.revealBeat)
  const revealLoreCard = useRevealStore(s => s.revealLoreCard)
  const revealCustom = useRevealStore(s => s.revealCustom)
  const hideReveal = useRevealStore(s => s.hideReveal)
  const clearAllReveals = useRevealStore(s => s.clearAllReveals)
  const loadReveals = useRevealStore(s => s.loadReveals)

  const session = useSessionStore(s => s.session)
  const currentSceneIndex = useSessionStore(s => s.currentSceneIndex)
  const currentBeatIndex = useSessionStore(s => s.currentBeatIndex)

  const scene = session?.scenes?.[currentSceneIndex]
  const beat = scene?.beats?.[currentBeatIndex]

  const [activeTab, setActiveTab] = useState('current') // current | lore | custom
  const [filterCategory, setFilterCategory] = useState('All')
  const [customTitle, setCustomTitle] = useState('')
  const [customContent, setCustomContent] = useState('')
  const [customCategory, setCustomCategory] = useState('Note')

  useEffect(() => { loadReveals() }, [])

  const filteredLore = filterCategory === 'All'
    ? LORE_CARDS
    : LORE_CARDS.filter(c => c.category === filterCategory)

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

      {/* Sub-tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {[
          { id: 'current', label: 'Current Beat' },
          { id: 'lore', label: 'Lore Cards' },
          { id: 'custom', label: 'Custom' }
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
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
            cursor: 'pointer'
          }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>

        {/* Current Beat tab */}
        {activeTab === 'current' && (
          <div style={{ padding: '14px' }}>
            {beat ? (
              <>
                <div style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '12px 14px',
                  marginBottom: 10
                }}>
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 9,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    marginBottom: 5
                  }}>
                    {scene?.title} · {beat.title}
                  </div>
                  <div style={{
                    fontSize: 13,
                    color: 'var(--text-secondary)',
                    fontStyle: 'italic',
                    lineHeight: 1.6,
                    marginBottom: 12
                  }}>
                    {beat.content.length > 120
                      ? beat.content.slice(0, 120) + '…'
                      : beat.content}
                  </div>
                  <button onClick={handleRevealBeat} style={{
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
                    cursor: 'pointer'
                  }}>
                    ✦ Reveal to Players
                  </button>
                </div>

                {/* Active reveals */}
                {reveals.length > 0 && (
                  <div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 8
                    }}>
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 9,
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em'
                      }}>
                        Revealed ({reveals.length})
                      </span>
                      <button onClick={clearAllReveals} style={{
                        padding: '2px 7px',
                        fontSize: 10,
                        background: 'transparent',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)',
                        color: 'var(--text-muted)',
                        cursor: 'pointer'
                      }}>
                        Clear all
                      </button>
                    </div>
                    {reveals.map(r => (
                      <div key={r.id} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        padding: '6px 8px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)',
                        marginBottom: 4
                      }}>
                        <div>
                          <div style={{ fontSize: 12, color: 'var(--text-primary)' }}>{r.title}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{r.category}</div>
                        </div>
                        <button onClick={() => hideReveal(r.id)} style={{
                          padding: '2px 6px',
                          fontSize: 10,
                          background: 'transparent',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius)',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          flexShrink: 0,
                          marginLeft: 8
                        }}>
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

        {/* Lore Cards tab */}
        {activeTab === 'lore' && (
          <div style={{ padding: '14px' }}>
            {/* Category filter */}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>
              {['All', ...CATEGORIES].map(cat => (
                <button key={cat} onClick={() => setFilterCategory(cat)} style={{
                  padding: '3px 8px',
                  fontSize: 10,
                  fontFamily: 'var(--font-mono)',
                  background: filterCategory === cat ? 'rgba(196,112,64,0.15)' : 'var(--bg-raised)',
                  border: `1px solid ${filterCategory === cat ? 'rgba(196,112,64,0.4)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius)',
                  color: filterCategory === cat ? 'var(--rot-bright)' : 'var(--text-muted)',
                  cursor: 'pointer'
                }}>
                  {cat}
                </button>
              ))}
            </div>

            {/* Lore card list */}
            {filteredLore.map(card => {
              const style = TONE_STYLE[card.tone] || TONE_STYLE.lore
              const alreadyRevealed = reveals.some(r => r.title === card.title)
              return (
                <div key={card.id} style={{
                  background: 'var(--bg-card)',
                  border: `1px solid ${style.border}`,
                  borderRadius: 'var(--radius-lg)',
                  padding: '10px 12px',
                  marginBottom: 8,
                  opacity: alreadyRevealed ? 0.5 : 1
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5 }}>
                    <div>
                      <div style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 9,
                        color: style.color,
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        marginBottom: 2
                      }}>
                        {card.category}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                        {card.title}
                      </div>
                    </div>
                    <button
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
                        flexShrink: 0,
                        marginLeft: 8
                      }}
                    >
                      {alreadyRevealed ? 'Revealed' : '✦ Reveal'}
                    </button>
                  </div>
                  <div style={{
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    fontStyle: 'italic',
                    lineHeight: 1.5
                  }}>
                    {card.content.length > 100 ? card.content.slice(0, 100) + '…' : card.content}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Custom tab */}
        {activeTab === 'custom' && (
          <div style={{ padding: '14px' }}>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>
                Category
              </label>
              <input
                value={customCategory}
                onChange={e => setCustomCategory(e.target.value)}
                placeholder="Note"
                style={{
                  width: '100%', padding: '6px 8px',
                  fontFamily: 'var(--font-body)', fontSize: 13,
                  background: 'var(--bg-raised)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)', color: 'var(--text-primary)', outline: 'none'
                }}
              />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>
                Title
              </label>
              <input
                value={customTitle}
                onChange={e => setCustomTitle(e.target.value)}
                placeholder="What the players see as the heading"
                style={{
                  width: '100%', padding: '6px 8px',
                  fontFamily: 'var(--font-body)', fontSize: 13,
                  background: 'var(--bg-raised)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)', color: 'var(--text-primary)', outline: 'none'
                }}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>
                Content
              </label>
              <textarea
                value={customContent}
                onChange={e => setCustomContent(e.target.value)}
                placeholder="The text your players will read…"
                rows={5}
                style={{
                  width: '100%', padding: '6px 8px',
                  fontFamily: 'var(--font-body)', fontSize: 13,
                  background: 'var(--bg-raised)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)', color: 'var(--text-primary)', outline: 'none',
                  resize: 'vertical', lineHeight: 1.6
                }}
              />
            </div>
            <button
              onClick={handleCustomReveal}
              disabled={!customTitle.trim() || !customContent.trim()}
              style={{
                width: '100%', padding: '10px 0',
                background: 'rgba(196,112,64,0.12)',
                border: '1px solid rgba(196,112,64,0.35)',
                borderRadius: 'var(--radius)',
                color: 'var(--rot-bright)',
                fontSize: 12,
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                cursor: 'pointer'
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
