import React, { useState, useEffect } from 'react'
import { useCombatStore } from '../../stores/combatStore'
import { decodeSavePrompt, decodeSavePromptStrict } from '@shared/lib/combatRules.js'
import { supabase } from '@shared/lib/supabase.js'
import { getSessionRunId } from '@shared/lib/runtimeContext.js'
import { qaHoldSavePromptChannelName } from '@shared/lib/qaDevChannels.js'
import DmCombatCarousel from './DmCombatCarousel.jsx'
import CompactCard from './cards/CompactCard.jsx'


export default function CombatPanel() {
  const active = useCombatStore(s => s.active)
  const round = useCombatStore(s => s.round)
  const combatants = useCombatStore(s => s.combatants)
  const activeCombatantIndex = useCombatStore(s => s.activeCombatantIndex)
  const feed = useCombatStore(s => s.feed)
  const nextTurn = useCombatStore(s => s.nextTurn)
  const prevTurn = useCombatStore(s => s.prevTurn)
  const sortInitiative = useCombatStore(s => s.sortInitiative)
  const endCombat = useCombatStore(s => s.endCombat)
  const initiativePhase = useCombatStore(s => s.initiativePhase)
  const setInitiative = useCombatStore(s => s.setInitiative)
  const savePrompts = useCombatStore(s => s.savePrompts)
  const resolveSavePrompt = useCombatStore(s => s.resolveSavePrompt)
  const playerRolls = useCombatStore(s => s.playerRolls)

  const [logOpen, setLogOpen] = useState(false)
  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'carousel'
  const [flashActiveIndex, setFlashActiveIndex] = useState(activeCombatantIndex)
  const [manualSaveTotals, setManualSaveTotals] = useState({})
  const [qaHoldSavePrompt, setQaHoldSavePrompt] = useState(false)
  const [seenRollMarker, setSeenRollMarker] = useState(null)

  useEffect(() => {
    if (!import.meta.env.DEV) return undefined
    const sessionRunId = getSessionRunId()
    const channel = supabase.channel(qaHoldSavePromptChannelName(sessionRunId), {
      config: {
        presence: {
          key: 'dm-qa-hold-save-prompt',
        },
      },
    })
    let cancelled = false
    channel.subscribe(async (status) => {
      if (cancelled || status !== 'SUBSCRIBED') return
      await channel.track({
        role: 'dm-qa-hold-save-prompt',
        holdSavePrompt: qaHoldSavePrompt,
      })
    })
    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [qaHoldSavePrompt])

  React.useEffect(() => {
    setFlashActiveIndex(activeCombatantIndex)
    const t = setTimeout(() => setFlashActiveIndex(-1), 1200)
    return () => clearTimeout(t)
  }, [activeCombatantIndex])

  React.useEffect(() => {
    if (playerRolls.length === 0) return
    setSeenRollMarker(playerRolls[0]?.id || null)
  }, [round, activeCombatantIndex])

  const activeCombatant = combatants[activeCombatantIndex]
  const nextCombatant = combatants[(activeCombatantIndex + 1) % Math.max(combatants.length, 1)]
  const players = combatants.filter(c => c.type === 'player')
  const enemies = combatants.filter(c => c.type === 'enemy')

  return (
    <div style={{ gridArea: 'main', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-deep)' }}>

      {/* Combat header */}
      <div style={{
        padding: '12px 20px', borderBottom: '1px solid var(--border)',
        background: 'rgba(196,64,64,0.05)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--danger)', boxShadow: '0 0 8px var(--danger)' }} />
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, color: 'var(--danger)', letterSpacing: '0.08em' }}>COMBAT</span>
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-secondary)' }}>Round {round}</span>
          {activeCombatant && (
            <span style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>— {activeCombatant.name}'s turn</span>
          )}
          {nextCombatant && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Next: {nextCombatant.name}</span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          {import.meta.env.DEV && (
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--text-muted)',
              cursor: 'pointer',
              userSelect: 'none',
            }}>
              <input
                type="checkbox"
                checked={qaHoldSavePrompt}
                onChange={(e) => setQaHoldSavePrompt(e.target.checked)}
              />
              Hold save prompts (QA)
            </label>
          )}
          <button onClick={() => setViewMode(m => m === 'grid' ? 'carousel' : 'grid')} style={{
            padding: '6px 12px', fontSize: 11, fontFamily: 'var(--font-mono)',
            background: viewMode === 'carousel' ? 'rgba(176,144,64,0.15)' : 'var(--bg-card)',
            border: `1px solid ${viewMode === 'carousel' ? 'rgba(176,144,64,0.5)' : 'var(--border)'}`,
            borderRadius: 'var(--radius)', color: viewMode === 'carousel' ? 'var(--warning)' : 'var(--text-muted)', cursor: 'pointer',
            textTransform: 'uppercase', letterSpacing: '0.06em'
          }}>
            {viewMode === 'carousel' ? '⊞ Grid' : '⊟ Carousel'}
          </button>
          <button onClick={() => setLogOpen(o => !o)} style={{
            padding: '6px 12px', fontSize: 11, fontFamily: 'var(--font-mono)',
            background: logOpen ? 'rgba(122,184,106,0.1)' : 'var(--bg-card)',
            border: `1px solid ${logOpen ? 'var(--green-mid)' : 'var(--border)'}`,
            borderRadius: 'var(--radius)', color: logOpen ? 'var(--green-bright)' : 'var(--text-muted)', cursor: 'pointer',
            textTransform: 'uppercase', letterSpacing: '0.06em'
          }}>
            {logOpen ? '▶ Hide Log' : '◀ Log'}
          </button>
          <button onClick={sortInitiative} style={{ padding: '6px 12px', fontSize: 11, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            Sort Init
          </button>
          <button onClick={prevTurn} style={{ padding: '6px 12px', fontSize: 12, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            ← Prev
          </button>
          <button onClick={nextTurn} style={{ padding: '6px 20px', fontSize: 12, background: 'var(--green-dim)', border: '1px solid var(--green-mid)', borderRadius: 'var(--radius)', color: 'var(--green-bright)', cursor: 'pointer', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>
            Next →
          </button>
          <button onClick={endCombat} style={{ padding: '6px 10px', fontSize: 11, background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-muted)', cursor: 'pointer' }}>
            End
          </button>
        </div>
      </div>

      {/* Initiative phase banner */}
      {initiativePhase && (
        <div style={{
          padding: '10px 20px',
          background: 'rgba(196,160,64,0.08)',
          borderBottom: '1px solid rgba(196,160,64,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Initiative Phase
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
              — players are rolling. Set enemy initiatives, then Sort Init to begin.
            </span>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {/* Quick enemy initiative rollers */}
            {combatants.filter(c => c.type === 'enemy').map(e => (
              <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>{e.name.replace(/ \d+$/, '')}:</span>
                <button onClick={() => {
                  const roll = Math.floor(Math.random() * 20) + 1 + 2
                  setInitiative(e.id, roll)
                }} style={{
                  padding: '3px 8px', fontSize: 10, fontFamily: 'var(--font-mono)',
                  background: e.initiativeSet ? 'rgba(196,160,64,0.15)' : 'transparent',
                  border: '1px solid rgba(196,160,64,0.4)', borderRadius: 'var(--radius)',
                  color: e.initiativeSet ? 'var(--warning)' : 'var(--text-muted)', cursor: 'pointer'
                }}>
                  {e.initiativeSet ? `${e.initiative} ↺` : 'Roll'}
                </button>
              </div>
            ))}
            <button onClick={sortInitiative} style={{
              padding: '5px 14px', fontSize: 11, fontFamily: 'var(--font-mono)',
              background: 'rgba(196,160,64,0.2)', border: '1px solid rgba(196,160,64,0.5)',
              borderRadius: 'var(--radius)', color: 'var(--warning)', cursor: 'pointer',
              fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em'
            }}>
              Begin →
            </button>
          </div>
        </div>
      )}

      {savePrompts.filter(p => !p.resolved).length > 0 && (
        <div style={{ padding: '10px 20px', borderBottom: '1px solid rgba(196,160,64,0.25)', background: 'rgba(196,160,64,0.08)' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
            Pending Save Prompts
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {savePrompts.filter(p => !p.resolved).slice(0, 4).map((prompt) => (
              <div key={prompt.promptId} style={{ background: 'var(--bg-card)', border: '1px solid rgba(196,160,64,0.4)', borderRadius: 'var(--radius)', padding: '8px 10px' }}>
                <div style={{ fontSize: 12, color: 'var(--text-primary)' }}>
                  <strong>{prompt.casterName}</strong> casts <strong>{prompt.spellName}</strong> — {prompt.saveAbility} save DC {prompt.saveDc}
                </div>
                {prompt.damage && (
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                    Fail: {prompt.damage.amount} {prompt.damage.type || ''} damage · Success: {prompt.damage.halfOnSuccess ? 'half damage' : 'no damage'}
                  </div>
                )}
                {prompt.effect?.name && (
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                    On fail effect: {prompt.effect.name}
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                  {(prompt.targets || []).map(t => (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-secondary)', minWidth: 120 }}>{t.name}</span>
                      <button
                        onClick={() => resolveSavePrompt({ prompt, targetId: t.id, mode: 'roll' })}
                        style={{ padding: '4px 10px', fontSize: 10, fontFamily: 'var(--font-mono)', background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-secondary)', cursor: 'pointer' }}
                      >
                        Roll Save
                      </button>
                      <input
                        type="number"
                        value={manualSaveTotals[`${prompt.promptId}:${t.id}`] || ''}
                        onChange={(e) => setManualSaveTotals(s => ({ ...s, [`${prompt.promptId}:${t.id}`]: e.target.value }))}
                        placeholder="Manual total"
                        style={{ width: 96, padding: '3px 6px', background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: 10 }}
                      />
                      <button
                        onClick={() => resolveSavePrompt({ prompt, targetId: t.id, mode: 'manual', manualTotal: manualSaveTotals[`${prompt.promptId}:${t.id}`] })}
                        style={{ padding: '4px 10px', fontSize: 10, fontFamily: 'var(--font-mono)', background: 'rgba(122,184,106,0.1)', border: '1px solid var(--green-mid)', borderRadius: 'var(--radius)', color: 'var(--green-bright)', cursor: 'pointer' }}
                      >
                        Apply Manual
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {active && (
        <div style={{
          padding: '8px 20px',
          borderBottom: '1px solid var(--border)',
          background: 'rgba(122,184,106,0.06)',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          flexShrink: 0,
        }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Live Rolls
          </div>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
            {(playerRolls || []).slice(0, 8).map((roll, idx) => {
              const markerIndex = (playerRolls || []).findIndex((r) => r.id === seenRollMarker)
              const unseen = markerIndex > -1 ? idx < markerIndex : false
              return (
                <div
                  key={roll.id}
                  style={{
                    minWidth: 180,
                    maxWidth: 260,
                    padding: '6px 8px',
                    borderRadius: 'var(--radius)',
                    border: `1px solid ${unseen ? 'rgba(196,160,64,0.45)' : 'var(--border)'}`,
                    background: unseen ? 'rgba(196,160,64,0.10)' : 'var(--bg-card)',
                    color: unseen ? 'var(--warning)' : 'var(--text-secondary)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={roll.text}
                >
                  {roll.text}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {viewMode === 'carousel' ? (
          <DmCombatCarousel feed={feed} logOpen={logOpen} />
        ) : (
          <>
            {/* Combatant columns */}
            <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px', display: 'flex', gap: 16 }}>

              {/* Players */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>Players</div>
                {players.map(c => (
                  <div key={c.id} style={{ position: 'relative' }}>
                    <CompactCard combatant={c} isActive={combatants.indexOf(c) === activeCombatantIndex} flashActive={combatants.indexOf(c) === flashActiveIndex} players={players} />
                  </div>
                ))}
              </div>

              {/* Enemies */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#c48060', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>Enemies</div>
                {enemies.map(c => (
                  <div key={c.id} style={{ position: 'relative' }}>
                    <CompactCard combatant={c} isActive={combatants.indexOf(c) === activeCombatantIndex} flashActive={combatants.indexOf(c) === flashActiveIndex} players={players} />
                  </div>
                ))}
              </div>
            </div>

            {/* Combat log — collapsible sidebar */}
            {logOpen && (
              <div style={{
                width: 220, borderLeft: '1px solid var(--border)',
                display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0
              }}>
                <div style={{ padding: '10px 12px 6px', borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Combat Log
                </div>
                <div style={{ flex: 1, overflow: 'auto', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {feed.filter(e => e.type !== 'player-save-prompt').map(event => (
                    <div key={event.id} style={{
                      fontSize: event.type === 'round' ? 9 : 12,
                      fontFamily: event.type === 'round' ? 'var(--font-mono)' : 'var(--font-body)',
                      color: event.type === 'damage' ? '#c49070'
                        : event.type === 'heal' ? 'var(--green-bright)'
                        : event.type === 'save-prompt' ? 'var(--warning)'
                        : event.type === 'round' ? 'var(--text-muted)'
                        : event.type === 'system' ? 'var(--warning)'
                        : 'var(--text-secondary)',
                      borderTop: event.type === 'round' ? '1px solid var(--border)' : 'none',
                      paddingTop: event.type === 'round' ? 5 : 0,
                      marginTop: event.type === 'round' ? 3 : 0,
                      display: 'flex', alignItems: 'flex-start', gap: 4, lineHeight: 1.4
                    }}>
                      {event.shared && <span style={{ fontSize: 5, color: 'var(--green-dim)', marginTop: 4, flexShrink: 0 }}>●</span>}
                      {event.type === 'save-prompt' ? (() => {
                        const strict = decodeSavePromptStrict(event.text)
                        const p = strict.ok ? strict.payload : decodeSavePrompt(event.text)
                        if (!p) return event.text
                        return `${p.casterName} casts ${p.spellName}: ${p.saveAbility} save DC ${p.saveDc} (${(p.targets || []).map(t => t.name).join(', ')})`
                      })() : event.type === 'save-prompt-resolved' ? (() => {
                        const strict = decodeSavePromptStrict(event.text)
                        const p = strict.ok ? strict.payload : decodeSavePrompt(event.text)
                        return p?.resolutionText || event.text
                      })() : event.text}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
