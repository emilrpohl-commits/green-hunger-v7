/**
 * SessionImportModal — Part 2 of MASTER-BRIEF
 *
 * Accepts a .md file, parses it as session markdown, shows a structured
 * preview, then imports to Supabase using existing campaignStore actions.
 *
 * States: idle → parsing → preview → importing → done | error
 */

import React, { useState, useRef } from 'react'
import { validateSessionImportPayload } from '@shared/lib/validation/importPayloadSchema.js'
import { useCampaignStore } from '../../stores/campaignStore'
import { useSessionStore } from '../../stores/sessionStore'
import { supabase } from '@shared/lib/supabase.js'
import { buildSessionImportPayload } from './sessionImport/buildSessionImportPayload.js'
import { parseSessionImportMarkdownFile } from './sessionImport/SessionImportParser.js'
import { runLegacySessionImport } from './sessionImport/SessionImportExecutor.js'
import SessionImportPreview from './sessionImport/SessionImportPreview.jsx'

const mono = { fontFamily: 'var(--font-mono)' }
const TEMPLATE_URL = 'https://raw.githubusercontent.com/emilrpohl-commits/green-hunger-v7/main/docs/session-template.md'

// ─── Small helpers ────────────────────────────────────────────────────────────

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
    setPhase('parsing')
    setErrorMsg('')
    setParsed(null)
    const out = await parseSessionImportMarkdownFile(file, { sessions, normalizeKey, slugify })
    if (!out.ok) {
      setErrorMsg(out.errorMsg)
      if (out.conflictSession) setConflictSession(out.conflictSession)
      if (out.parsed) setParsed(out.parsed)
      setPhase('error')
      return
    }
    setParsed(out.parsed)
    setPhase('preview')
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

  const runRpcTransactionalImport = async () => {
    const payload = buildSessionImportPayload(parsed, adventureId)
    if (!payload || !adventureId || !campaignId) return { skipped: true }
    const checked = validateSessionImportPayload(payload)
    if (!checked.success) {
      const msg = checked.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')
      return { error: `Payload validation failed: ${msg}` }
    }
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
        const fallback = await runLegacySessionImport({
          supabase,
          parsed,
          adventureId,
          saveStatBlock,
          saveSession,
          saveScene,
          saveBeat,
          saveBranch,
          addLog,
          onSessionCreated: (id) => setImportedSessionId(id),
        })
        finalSessionId = fallback.sessionId || null
        setImportedSessionId(fallback.sessionId)
      } else if (tx?.data?.session_id) {
        finalSessionId = tx.data.session_id
        setImportedSessionId(tx.data.session_id)
        addLog('ok', 'Transactional import completed')
      }
      if (!finalSessionId) {
        const txErr = typeof tx?.error === 'string' ? tx.error : null
        throw new Error(txErr || 'Import did not return a session id. Load a campaign with an adventure and try again.')
      }
      await refreshSession(finalSessionId)
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
            <SessionImportPreview parsed={parsed} />
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
