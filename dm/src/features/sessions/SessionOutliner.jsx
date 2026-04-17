/**
 * Session Outliner — Part 1 of MASTER-BRIEF
 *
 * Single-pane always-visible outliner replacing the drill-down
 * Sessions → Session → Scene → Beats tab → Beat form flow.
 */

import React, { useState } from 'react'
import { useCampaignStore } from '../../stores/campaignStore'
import { useSessionStore } from '../../stores/sessionStore'
import { mono, inputBase, btnSm, btnGreen } from './outlinerStyles'
import SessionRow from './SessionRow'
import { sessionRestoreConfirmMessage } from './deleteScopeCopy.js'

export default function SessionOutliner({ onImport }) {
  const sessions = useCampaignStore(s => s.sessions)
  const archivedSessions = useCampaignStore(s => s.archivedSessions)
  const restoreSession = useCampaignStore(s => s.restoreSession)
  const statBlocks = useCampaignStore(s => s.statBlocks)
  const createSession = useCampaignStore(s => s.createSession)
  const syncContentFromDb = useSessionStore(s => s.syncContentFromDb)
  const [showArchivedSessions, setShowArchivedSessions] = useState(false)

  const [newTitle, setNewTitle] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState(null)

  const allScenes = sessions.flatMap(s => s.scenes || [])

  const handleCreate = async () => {
    if (!newTitle.trim()) return
    setCreating(true)
    setCreateError(null)
    const result = await createSession(newTitle.trim())
    setCreating(false)
    if (result.error) {
      setCreateError(result.error)
    } else {
      setNewTitle('')
      syncContentFromDb(useCampaignStore.getState().sessions)
    }
  }

  return (
    <div style={{ padding: '20px 24px', maxWidth: 1000 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text-primary)', flex: 1 }}>
          Sessions
        </div>
        <input
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
          placeholder="New session title…"
          style={{ ...inputBase, width: 200 }}
        />
        <button
          onClick={handleCreate}
          disabled={creating || !newTitle.trim()}
          style={{ ...btnGreen, opacity: (creating || !newTitle.trim()) ? 0.5 : 1 }}
        >
          {creating ? 'Creating…' : '+ Session'}
        </button>
        <button
          onClick={() => onImport && onImport(null)}
          style={{ ...btnSm, padding: '7px 14px', fontSize: 10, border: '1px solid var(--border-bright)', color: 'var(--text-secondary)' }}
        >
          Import Markdown
        </button>
        <button
          onClick={() => setShowArchivedSessions(v => !v)}
          style={{ ...btnSm, padding: '7px 14px', fontSize: 10, border: '1px solid var(--border-bright)', color: showArchivedSessions ? 'var(--warning)' : 'var(--text-secondary)' }}
        >
          {showArchivedSessions ? 'Hide Archived' : `Archived (${archivedSessions.length})`}
        </button>
      </div>

      {createError && (
        <div style={{ marginBottom: 12, padding: '8px 12px', background: 'rgba(196,64,64,0.08)', border: '1px solid var(--danger)', borderRadius: 4, ...mono, fontSize: 11, color: 'var(--danger)' }}>
          {createError}
        </div>
      )}

      {sessions.length === 0 && (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          No sessions yet. Create one above or import a Markdown session document.
        </div>
      )}

      {sessions.map(session => (
        <SessionRow
          key={session.id}
          session={session}
          allScenes={allScenes}
          statBlocks={statBlocks}
          onImport={onImport}
        />
      ))}

      {showArchivedSessions && (
        <div style={{ marginTop: 20 }}>
          <div style={{ ...mono, fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
            Archived Sessions
          </div>
          {archivedSessions.length === 0 && (
            <div style={{ padding: '10px 12px', border: '1px dashed var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-muted)', fontSize: 12 }}>
              No archived sessions.
            </div>
          )}
          {archivedSessions.map(session => (
            <div key={session.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', marginBottom: 6 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  Session {session.session_number || session.order || '?'} — {session.title}
                </div>
                <div style={{ ...mono, fontSize: 10, color: 'var(--text-muted)' }}>
                  {session.archived_at ? `Archived: ${new Date(session.archived_at).toLocaleString()}` : 'Archived'}
                </div>
              </div>
              <button
                onClick={async () => {
                  if (!window.confirm(sessionRestoreConfirmMessage(session))) return
                  const result = await restoreSession(session.id)
                  if (!result?.error) syncContentFromDb(useCampaignStore.getState().sessions)
                }}
                style={{ ...btnSm }}
              >
                Restore
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
