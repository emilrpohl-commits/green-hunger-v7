/**
 * SessionImportModal — Part 2 of MASTER-BRIEF
 *
 * Accepts a .md file, parses it as session markdown, shows a structured
 * preview, then imports to Supabase using existing campaignStore actions.
 *
 * States: idle → parsing → preview → importing → done | error
 */

import React, { useState, useRef } from 'react'
import { parseSessionMarkdown } from '@shared/lib/parseSessionMarkdown.js'
import { useCampaignStore } from '../../stores/campaignStore'
import { useSessionStore } from '../../stores/sessionStore'
import { supabase } from '@shared/lib/supabase.js'

const mono = { fontFamily: 'var(--font-mono)' }
const TEMPLATE_URL = 'https://raw.githubusercontent.com/emilrpohl-commits/green-hunger-v7/main/docs/session-template.md'

// ─── Small helpers ────────────────────────────────────────────────────────────

function StatusRow({ icon, text, sub }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0' }}>
      <span style={{ fontSize: 16, minWidth: 22 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{text}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  )
}

function LogLine({ status, text }) {
  const colour = status === 'ok' ? 'var(--green-bright)' : status === 'pending' ? 'var(--text-muted)' : 'var(--danger)'
  const icon = status === 'ok' ? '✓' : status === 'pending' ? '⋯' : '✗'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0', ...mono, fontSize: 12 }}>
      <span style={{ color: colour, minWidth: 14 }}>{icon}</span>
      <span style={{ color: colour === 'var(--text-muted)' ? 'var(--text-secondary)' : colour }}>{text}</span>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SessionImportModal({ onClose, onDone }) {
  const sessions = useCampaignStore(s => s.sessions)
  const campaignId = useCampaignStore(s => s.campaign?.id)
  const adventureId = useCampaignStore(s => s.adventureId)
  const saveSession = useCampaignStore(s => s.saveSession)
  const saveScene = useCampaignStore(s => s.saveScene)
  const saveBeat = useCampaignStore(s => s.saveBeat)
  const saveBranch = useCampaignStore(s => s.saveBranch)
  const saveStatBlock = useCampaignStore(s => s.saveStatBlock)
  const refreshSession = useCampaignStore(s => s.refreshSession)
  const syncContentFromDb = useSessionStore(s => s.syncContentFromDb)

  const [phase, setPhase] = useState('idle')  // idle | parsing | preview | importing | done | error
  const [parsed, setParsed] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [conflictSession, setConflictSession] = useState(null)
  const [importLog, setImportLog] = useState([])
  const [doneStats, setDoneStats] = useState(null)
  const [importedSessionId, setImportedSessionId] = useState(null)

  const fileRef = useRef()
  const dropRef = useRef()

  const normalizeKey = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '')
  const slugify = (s) => (s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

  // ── File handling ────────────────────────────────────────────────────────

  const handleFile = async (file) => {
    if (!file || !String(file.name || '').toLowerCase().endsWith('.md')) {
      setErrorMsg('Please select a .md file.')
      setPhase('error')
      return
    }

    setPhase('parsing')
    setErrorMsg('')
    setParsed(null)

    try {
      const markdown = await file.text()
      const result = parseSessionMarkdown(markdown)

      if (!result.sessionNumber && !result.sessionTitle) {
        throw new Error('Could not detect a session structure in this document. Check that it follows the expected format.')
      }

      // Check for existing session conflict
      const parsedTitleKey = normalizeKey(result.sessionTitle)
      const parsedChapterKey = normalizeKey(result.chapterSubtitle)
      const parsedSlug = slugify(result.sessionTitle)
      const conflict = sessions.find(s => {
        const byNumber = result.sessionNumber != null && s.session_number === result.sessionNumber
        const byTitleKey = parsedTitleKey && normalizeKey(s.title) === parsedTitleKey
        const byChapterKey = parsedChapterKey && normalizeKey(s.subtitle) === parsedChapterKey
        const bySlug = parsedSlug && slugify(s.title) === parsedSlug
        return byNumber || byTitleKey || byChapterKey || bySlug
      })
      if (conflict) {
        setConflictSession(conflict)
        setParsed(result)
        setPhase('error')
        return
      }

      setParsed(result)
      setPhase('preview')
    } catch (e) {
      setErrorMsg(e.message || 'Failed to parse document.')
      setPhase('error')
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    handleFile(file)
  }

  const handleFileInput = (e) => {
    const file = e.target.files[0]
    handleFile(file)
  }

  // ── Import sequence ──────────────────────────────────────────────────────

  const addLog = (status, text) => {
    setImportLog(prev => {
      const existing = prev.findIndex(l => l.text === text)
      if (existing >= 0) {
        const next = [...prev]
        next[existing] = { status, text }
        return next
      }
      return [...prev, { status, text }]
    })
  }

  const buildImportPayload = () => {
    if (!parsed) return null
    return {
      session: {
        adventure_id: adventureId,
        session_number: parsed.sessionNumber,
        order: parsed.sessionNumber,
        title: parsed.sessionTitle,
        subtitle: parsed.chapterSubtitle,
        notes: parsed.backgroundNotes,
        estimated_duration: parsed.estimatedDuration,
        objectives: parsed.objectives || [],
      },
      stat_blocks: (parsed.statBlocks || []).map(sb => {
        const { modifiers: _m, ...rest } = sb
        return rest
      }),
      scenes: (parsed.scenes || []).map(scene => ({
        scene_key: String(scene.sceneNumber),
        order: scene.order,
        slug: scene.slug,
        title: scene.title,
        scene_type: scene.sceneType,
        purpose: scene.purpose,
        estimated_time: scene.estimatedTime,
        fallback_notes: scene.fallbackNotes,
        dm_notes: scene.dmNotes,
        outcomes: scene.outcomes || [],
        is_published: false,
        beats: (scene.beats || []).map(beat => ({
          order: beat.order,
          slug: beat.slug,
          title: beat.title,
          type: beat.type,
          trigger_text: beat.triggerText,
          content: beat.content,
          player_text: beat.playerText || beat.content,
          dm_notes: beat.dmNotes,
          mechanical_effect: beat.mechanicalEffect || null,
          stat_block_ref: beat.statBlockRef || null,
          stat_block_source_index: beat.statBlockSourceIndex || null,
        })),
        branches: (scene.branches || []).map(branch => ({
          order: branch.order,
          label: branch.label,
          description: branch.description,
          condition_text: branch.conditionText,
          condition_type: 'explicit',
          target_scene_key: String(branch.targetSceneNumber),
          is_dm_only: false,
        })),
      })),
    }
  }

  const runRpcTransactionalImport = async () => {
    const payload = buildImportPayload()
    if (!payload || !adventureId || !campaignId) return { skipped: true }
    const { data, error } = await supabase.rpc('import_session_bundle_tx', {
      p_adventure_id: adventureId,
      p_campaign_id: campaignId,
      p_payload: payload,
      // Safety: never overwrite an existing session during import.
      p_overwrite_session_id: null,
    })
    if (error) return { error: error.message }
    return { data }
  }

  const rollbackSessionById = async (sessionId) => {
    if (!sessionId) return
    try {
      await supabase.from('sessions').delete().eq('id', sessionId)
    } catch {}
  }

  const runLegacyImportWithRollback = async () => {
    let currentStep = 'init'
    let createdSessionId = null
    try {
      // 1. Stat blocks
      const statBlockIdMap = {}
      for (const sb of parsed.statBlocks) {
        currentStep = `stat block: ${sb.name}`
        addLog('pending', `Saving stat block: ${sb.name}…`)
        const { modifiers: _m, ...sbPayload } = sb
        const { data, error } = await saveStatBlock(sbPayload)
        if (error) throw new Error(`Stat block "${sb.name}": ${error}`)
        statBlockIdMap[sb.name.toLowerCase()] = data.id
        if (data.slug) statBlockIdMap[String(data.slug).toLowerCase()] = data.id
        addLog('ok', `Stat block: ${sb.name}`)
      }

      // 2. Session
      currentStep = 'session'
      addLog('pending', `Saving session: ${parsed.sessionTitle}…`)
      const { data: session, error: sessErr } = await saveSession({
        adventure_id: adventureId,
        session_number: parsed.sessionNumber,
        order: parsed.sessionNumber,
        title: parsed.sessionTitle,
        subtitle: parsed.chapterSubtitle,
        notes: parsed.backgroundNotes,
        estimated_duration: parsed.estimatedDuration,
        objectives: parsed.objectives,
      })
      if (sessErr) throw new Error(`Session: ${sessErr}`)
      createdSessionId = session.id
      addLog('ok', `Session: ${parsed.sessionTitle}`)
      setImportedSessionId(session.id)

      // 3. Scenes — non-branching first, then branching
      const sceneIdMap = {}
      const sortedScenes = [
        ...parsed.scenes.filter(s => !s.isBranching),
        ...parsed.scenes.filter(s => s.isBranching),
      ]

      for (const scene of sortedScenes) {
        currentStep = `scene: ${scene.title}`
        addLog('pending', `Saving Scene ${scene.sceneNumber}: ${scene.title}…`)

        const { data: savedScene, error: sceneErr } = await saveScene({
          session_id: session.id,
          order: scene.order,
          slug: scene.slug,
          title: scene.title,
          scene_type: scene.sceneType,
          purpose: scene.purpose,
          estimated_time: scene.estimatedTime,
          fallback_notes: scene.fallbackNotes,
          dm_notes: scene.dmNotes,
          outcomes: scene.outcomes,
          is_published: false,
        })
        if (sceneErr) throw new Error(`Scene "${scene.title}": ${sceneErr}`)
        sceneIdMap[scene.sceneNumber] = savedScene
        addLog('ok', `Scene ${scene.sceneNumber}: ${scene.title}`)

        // 4. Beats
        for (const beat of scene.beats) {
          currentStep = `beat: ${beat.title}`
          const sbNameLower = beat.statBlockRef?.toLowerCase()
          const sbIndexLower = beat.statBlockSourceIndex?.toLowerCase()
          const sbKey = sbNameLower
            ? Object.keys(statBlockIdMap).find(k => sbNameLower.includes(k) || k.includes(sbNameLower))
            : null
          const sbKeyByIndex = sbIndexLower
            ? Object.keys(statBlockIdMap).find(k => k === sbIndexLower)
            : null

          const { error: beatErr } = await saveBeat({
            scene_id: savedScene.id,
            order: beat.order,
            slug: beat.slug,
            title: beat.title,
            type: beat.type,
            trigger_text: beat.triggerText,
            content: beat.content,
            player_text: beat.playerText || beat.content,
            dm_notes: beat.dmNotes,
            mechanical_effect: beat.mechanicalEffect || null,
            stat_block_id: sbKeyByIndex ? statBlockIdMap[sbKeyByIndex] : (sbKey ? statBlockIdMap[sbKey] : null),
          })
          if (beatErr) throw new Error(`Beat "${beat.title}": ${beatErr}`)
        }
      }

      // 5. Branches
      for (const scene of parsed.scenes) {
        for (const branch of (scene.branches || [])) {
          currentStep = `branch: ${branch.label}`
          const parentScene = sceneIdMap[scene.sceneNumber]
          const targetScene = sceneIdMap[branch.targetSceneNumber]
          if (!parentScene || !targetScene) continue

          const { error: branchErr } = await saveBranch({
            scene_id: parentScene.id,
            order: branch.order,
            label: branch.label,
            description: branch.description,
            condition_text: branch.conditionText,
            condition_type: 'explicit',
            target_scene_id: targetScene.id,
            target_slug: targetScene.slug,
            is_dm_only: false,
          })
          if (branchErr) throw new Error(`Branch "${branch.label}": ${branchErr}`)
        }
      }

      return { sessionId: createdSessionId }
    } catch (e) {
      await rollbackSessionById(createdSessionId)
      throw new Error(`Import failed at "${currentStep}": ${e.message}`)
    }
  }

  const runImport = async () => {
    if (!parsed) return
    setPhase('importing')
    setImportLog([])
    try {
      let finalSessionId = null
      addLog('pending', 'Attempting transactional import (RPC)…')
      const tx = await runRpcTransactionalImport()
      if (tx?.error || tx?.skipped) {
        addLog('pending', 'Using markdown importer with rollback…')
        const fallback = await runLegacyImportWithRollback()
        finalSessionId = fallback.sessionId || null
        setImportedSessionId(fallback.sessionId)
      } else if (tx?.data?.session_id) {
        finalSessionId = tx.data.session_id
        setImportedSessionId(tx.data.session_id)
        addLog('ok', 'Transactional import completed')
      }
      if (finalSessionId) await refreshSession(finalSessionId)
      syncContentFromDb(useCampaignStore.getState().sessions)

      setDoneStats({
        scenes: parsed.scenes.length,
        beats: parsed.scenes.reduce((n, s) => n + s.beats.length, 0),
        statBlocks: parsed.statBlocks.length,
      })
      setPhase('done')
    } catch (e) {
      console.error('Import failed:', e)
      setErrorMsg(e.message || 'Import failed')
      setPhase('error')
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  const overlay = {
    position: 'fixed', inset: 0, zIndex: 2000,
    background: 'rgba(0,0,0,0.8)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 24,
  }
  const panel = {
    background: 'var(--bg-panel, var(--bg-surface))',
    border: '1px solid var(--border)',
    borderRadius: 8,
    width: '100%', maxWidth: 680,
    maxHeight: '88vh', display: 'flex', flexDirection: 'column',
    overflow: 'hidden',
  }
  const header = {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '16px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0,
  }
  const body = { flex: 1, overflowY: 'auto', padding: '24px' }
  const footer = {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '14px 24px', borderTop: '1px solid var(--border)', flexShrink: 0,
  }
  const btnGreen = { padding: '8px 22px', background: 'var(--green-bright)', color: '#0a0f0a', border: 'none', borderRadius: 4, cursor: 'pointer', ...mono, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }
  const btnGhost = { padding: '8px 18px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', color: 'var(--text-secondary)', ...mono, fontSize: 11, textTransform: 'uppercase' }
  const btnSm = {
    ...btnGhost,
    padding: '6px 12px',
    fontSize: 10,
    textTransform: 'none',
    letterSpacing: 'normal',
    color: 'var(--text-muted)',
  }

  return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={panel}>

        {/* Header */}
        <div style={header}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--text-primary)', flex: 1 }}>
            Import Session from Markdown
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 20, padding: '0 4px' }}>×</button>
        </div>

        {/* Body */}
        <div style={body}>

          {/* ── IDLE ─────────────────────────────────────────────────── */}
          {phase === 'idle' && (
            <div>
              <div
                ref={dropRef}
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                style={{
                  border: '2px dashed var(--border-bright)',
                  borderRadius: 8, padding: '48px 24px',
                  textAlign: 'center', cursor: 'pointer',
                  background: 'rgba(100,200,100,0.03)',
                  transition: 'border-color 0.2s',
                }}
              >
                <div style={{ fontSize: 36, marginBottom: 12 }}>📄</div>
                <div style={{ fontSize: 14, color: 'var(--text-primary)', marginBottom: 6 }}>
                  Drop your session .md file here
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  or click to browse
                </div>
                <input ref={fileRef} type="file" accept=".md,text/markdown" style={{ display: 'none' }} onChange={handleFileInput} />
              </div>
              <div style={{ marginTop: 16, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7 }}>
                Use markdown headings like <code style={{ ...mono, background: 'var(--bg-raised)', padding: '1px 5px', borderRadius: 3 }}>## Scene N — Title</code> and beat headings as <code style={{ ...mono, background: 'var(--bg-raised)', padding: '1px 5px', borderRadius: 3 }}>### [type] Beat title</code> where type is one of: narrative, prompt, check, decision, combat, reveal, transition.
              </div>
              <div style={{ marginTop: 12 }}>
                <a
                  href={TEMPLATE_URL}
                  target="_blank"
                  rel="noreferrer"
                  style={{ ...btnSm, display: 'inline-block', textDecoration: 'none', padding: '6px 12px', borderStyle: 'dashed' }}
                >
                  Download Markdown Template
                </a>
              </div>
            </div>
          )}

          {/* ── PARSING ──────────────────────────────────────────────── */}
          {phase === 'parsing' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '40px 0' }}>
              <div style={{ width: 32, height: 32, border: '2px solid var(--green-bright)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <div style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>Reading markdown…</div>
            </div>
          )}

          {/* ── PREVIEW ──────────────────────────────────────────────── */}
          {phase === 'preview' && parsed && (
            <div>
              <div style={{ marginBottom: 20 }}>
                <StatusRow icon="✓" text={`Session ${parsed.sessionNumber} — ${parsed.sessionTitle}`} />
                <StatusRow icon="✓" text={`${parsed.scenes.length} scenes detected`} />
                <StatusRow icon="✓" text={`${parsed.scenes.reduce((n, s) => n + s.beats.length, 0)} beats detected`} />
                {parsed.statBlocks.length > 0 && (
                  <StatusRow icon="✓" text={`${parsed.statBlocks.length} stat block${parsed.statBlocks.length > 1 ? 's' : ''} detected`}
                    sub={parsed.statBlocks.map(sb => sb.name).join(', ')} />
                )}
                {parsed.scenes.some(s => s.isBranching) && (
                  <StatusRow icon="⚠" text="Branching paths detected"
                    sub={parsed.scenes.filter(s => s.isBranching).map(s => `Scene ${s.sceneNumber}`).join(', ')} />
                )}
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginBottom: 8 }}>
                <div style={{ ...mono, fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
                  Scene breakdown
                </div>
                {parsed.scenes.map(scene => (
                  <div key={scene.sceneNumber} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <span style={{ ...mono, fontSize: 10, color: 'var(--text-muted)', minWidth: 24 }}>{scene.sceneNumber}</span>
                    <span style={{ flex: 1, fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{scene.title}</span>
                    <span style={{ ...mono, fontSize: 9, color: scene.sceneType === 'combat' ? 'var(--danger)' : 'var(--text-muted)', textTransform: 'uppercase', minWidth: 60 }}>{scene.sceneType}</span>
                    <span style={{ ...mono, fontSize: 10, color: 'var(--text-muted)', minWidth: 40, textAlign: 'right' }}>{scene.beats.length} beats</span>
                    {scene.isBranching && <span style={{ ...mono, fontSize: 9, color: 'var(--warning)' }}>← branch</span>}
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 16, padding: '10px 14px', background: 'rgba(196,160,64,0.06)', border: '1px solid rgba(196,160,64,0.25)', borderRadius: 4, fontSize: 12, color: 'var(--text-muted)' }}>
                ⓘ Import cannot be undone. Use the session outliner to edit content after import.
              </div>
            </div>
          )}

          {/* ── IMPORTING ────────────────────────────────────────────── */}
          {phase === 'importing' && (
            <div>
              <div style={{ ...mono, fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
                Importing…
              </div>
              {importLog.map((l, i) => <LogLine key={i} status={l.status} text={l.text} />)}
            </div>
          )}

          {/* ── DONE ─────────────────────────────────────────────────── */}
          {phase === 'done' && doneStats && (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--green-bright)', marginBottom: 8 }}>
                Session {parsed.sessionNumber} imported successfully
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {doneStats.scenes} scenes · {doneStats.beats} beats{doneStats.statBlocks > 0 ? ` · ${doneStats.statBlocks} stat blocks` : ''}
              </div>
            </div>
          )}

          {/* ── ERROR ────────────────────────────────────────────────── */}
          {phase === 'error' && conflictSession && (
            <div>
              <div style={{ fontSize: 28, marginBottom: 12 }}>⛔</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--danger)', marginBottom: 12 }}>
                Session {parsed?.sessionNumber} already exists
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 16 }}>
                Session {parsed?.sessionNumber} ("{conflictSession.title}") is already in the database.
                Markdown import will not overwrite existing sessions. Edit it in the outliner, or change the session number/title in your markdown and import again.
              </div>
            </div>
          )}

          {phase === 'error' && !conflictSession && (
            <div>
              <div style={{ fontSize: 28, marginBottom: 12 }}>⚠️</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--danger)', marginBottom: 12 }}>
                Import failed
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, background: 'rgba(196,64,64,0.08)', border: '1px solid rgba(196,64,64,0.3)', borderRadius: 4, padding: '12px 16px' }}>
                {errorMsg}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div style={footer}>
          <div style={{ flex: 1 }} />

          {phase === 'idle' && (
            <button onClick={onClose} style={btnGhost}>Cancel</button>
          )}

          {phase === 'preview' && (
            <>
              <button onClick={() => { setParsed(null); setPhase('idle') }} style={btnGhost}>Cancel</button>
              <button onClick={runImport} style={btnGreen}>Import to Supabase →</button>
            </>
          )}

          {phase === 'done' && (
            <>
              {importedSessionId && onDone && (
                <button onClick={() => { onDone(importedSessionId); onClose() }} style={btnGreen}>
                  Open in Outliner
                </button>
              )}
              <button onClick={onClose} style={btnGhost}>Close</button>
            </>
          )}

          {(phase === 'error') && (
            <>
              {!conflictSession && (
                <button onClick={() => { setPhase('idle'); setErrorMsg(''); setConflictSession(null) }} style={btnGhost}>
                  Try Again
                </button>
              )}
              <button onClick={onClose} style={btnGhost}>Close</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
