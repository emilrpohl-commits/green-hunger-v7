import React, { useState } from 'react'
import { useCampaignStore } from '../../stores/campaignStore'
import ImportModal from '../builder/ImportModal'
import StatBlockView from './StatBlockView'

export default function StatBlockLibrary({ onEdit, onCreate }) {
  const [showImport, setShowImport] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const statBlocks = useCampaignStore(s => s.statBlocks)
  const archivedStatBlocks = useCampaignStore(s => s.archivedStatBlocks)
  const deleteStatBlock = useCampaignStore(s => s.deleteStatBlock)
  const restoreStatBlock = useCampaignStore(s => s.restoreStatBlock)
  const duplicateStatBlock = useCampaignStore(s => s.duplicateStatBlock)
  const [search, setSearch] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [confirmRestoreId, setConfirmRestoreId] = useState(null)
  const statBlockLoadInfo = useCampaignStore(s => s.statBlockLoadInfo)

  const mono = { fontFamily: 'var(--font-mono)' }
  const searchValue = String(search || '').toLowerCase()

  const filtered = statBlocks.filter(sb =>
    !searchValue
      || String(sb?.name || '').toLowerCase().includes(searchValue)
      || String(sb?.creature_type || '').toLowerCase().includes(searchValue)
      || (sb?.tags || []).some(t => String(t || '').toLowerCase().includes(searchValue))
  )

  const handleDelete = async (id) => {
    await deleteStatBlock(id)
    setConfirmDelete(null)
  }

  const handleDuplicate = async (id) => {
    const result = await duplicateStatBlock(id)
    if (result.data) onEdit(result.data.id)
  }

  return (
    <div style={{ padding: 24, maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--text-primary)' }}>
          Stat Blocks
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setShowImport(true)}
            style={{
              padding: '8px 18px', background: 'transparent', color: 'var(--text-secondary)',
              border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer',
              ...mono, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
            }}
          >
            Import from Text
          </button>
          <button
            onClick={onCreate}
            style={{
              padding: '8px 18px', background: 'var(--green-bright)', color: '#0a0f0a',
              border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer',
              ...mono, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
            }}
          >
            + New Stat Block
          </button>
          <button
            onClick={() => setShowArchived(v => !v)}
            style={{
              padding: '8px 18px', background: 'transparent', color: showArchived ? 'var(--warning)' : 'var(--text-secondary)',
              border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer',
              ...mono, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
            }}
          >
            {showArchived ? 'Hide Archived' : `Archived (${archivedStatBlocks.length})`}
          </button>
        </div>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search by name, type, or tag…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{
          width: '100%', padding: '9px 14px', marginBottom: 20,
          background: 'var(--bg-raised)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', color: 'var(--text-primary)',
          fontSize: 13, outline: 'none', boxSizing: 'border-box',
        }}
      />

      {filtered.length === 0 && (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          {search ? 'No matches.' : 'No stat blocks yet. Create one or run migration.'}
        </div>
      )}

      {statBlockLoadInfo?.warning && !search && (
        <div style={{
          marginBottom: 12,
          padding: '10px 12px',
          border: '1px solid rgba(196,64,64,0.3)',
          background: 'rgba(196,64,64,0.08)',
          borderRadius: 'var(--radius)',
          color: 'var(--text-secondary)',
          fontSize: 12,
          lineHeight: 1.5,
        }}>
          {statBlockLoadInfo.warning}
        </div>
      )}

      {filtered.length === 0 && !search && archivedStatBlocks.length > 0 && (
        <div style={{
          marginBottom: 12,
          padding: '10px 12px',
          border: '1px solid rgba(196,160,64,0.35)',
          background: 'rgba(196,160,64,0.08)',
          borderRadius: 'var(--radius)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
        }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            Active list is empty, but {archivedStatBlocks.length} archived stat blocks were loaded.
          </div>
          {!showArchived && (
            <button
              onClick={() => setShowArchived(true)}
              style={{
                padding: '6px 10px',
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                ...mono,
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                flexShrink: 0,
              }}
            >
              Show Archived
            </button>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gap: 10 }}>
        {filtered.map(sb => (
          <div
            key={sb.id}
            style={{
              background: 'var(--bg-raised)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
            }}
          >
            <div
              role="button"
              tabIndex={0}
              onClick={() => setExpandedId((prev) => (prev === sb.id ? null : sb.id))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setExpandedId((prev) => (prev === sb.id ? null : sb.id))
                }
              }}
              aria-expanded={expandedId === sb.id}
              style={{
                width: '100%',
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '12px 16px',
                background: 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              {/* CR badge */}
              <div style={{
                minWidth: 36, height: 36, borderRadius: 'var(--radius)',
                background: 'rgba(196,64,64,0.12)', border: '1px solid rgba(196,64,64,0.25)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{ ...mono, fontSize: 7, color: 'var(--text-muted)', textTransform: 'uppercase' }}>CR</div>
                <div style={{ ...mono, fontSize: 13, color: 'var(--danger)', fontWeight: 700 }}>{sb.cr || '—'}</div>
              </div>

              {/* Name + type */}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>{sb.name}</div>
                <div style={{ ...mono, fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  {[sb.size, sb.creature_type].filter(Boolean).join(' ')}
                  {sb.ac ? ` · AC ${sb.ac}` : ''}
                  {sb.max_hp ? ` · HP ${sb.max_hp}` : ''}
                </div>
                {sb.cloned_from_reference_id && (
                  <div style={{ ...mono, fontSize: 9, color: 'var(--green-bright)', marginTop: 4 }}>
                    Reference clone (SRD monster)
                  </div>
                )}
              </div>

              {/* Tags */}
              {sb.tags?.length > 0 && (
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', maxWidth: 160 }}>
                  {sb.tags.slice(0, 3).map(tag => (
                    <span key={tag} style={{
                      ...mono, fontSize: 9, padding: '2px 6px',
                      background: 'var(--bg-deep)', border: '1px solid var(--border)',
                      borderRadius: 4, color: 'var(--text-muted)', textTransform: 'uppercase',
                    }}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: 6 }}>
                <ActionBtn label="Edit" onClick={() => onEdit(sb.id)} />
                <ActionBtn label="Copy" onClick={() => handleDuplicate(sb.id)} />
                {confirmDelete === sb.id ? (
                  <>
                    <ActionBtn label="Confirm Archive" onClick={() => handleDelete(sb.id)} danger />
                    <ActionBtn label="Cancel" onClick={() => setConfirmDelete(null)} />
                  </>
                ) : (
                  <ActionBtn label="Archive" onClick={() => setConfirmDelete(sb.id)} danger />
                )}
              </div>

              <div style={{ ...mono, minWidth: 84, fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right', letterSpacing: '0.08em' }}>
                {expandedId === sb.id ? 'Hide Sheet ▲' : 'Show Sheet ▼'}
              </div>
            </div>

            {expandedId === sb.id && (
              <div style={{ padding: '14px 16px 16px', borderTop: '1px solid var(--border)' }}>
                <StatBlockView data={sb} />
              </div>
            )}
          </div>
        ))}
      </div>

      {showArchived && (
        <div style={{ marginTop: 24 }}>
          <div style={{ ...mono, fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
            Archived Stat Blocks
          </div>
          {archivedStatBlocks.length === 0 && (
            <div style={{ padding: '10px 12px', border: '1px dashed var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-muted)', fontSize: 12 }}>
              No archived stat blocks.
            </div>
          )}
          {archivedStatBlocks.map(sb => (
            <div key={sb.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', marginBottom: 6, opacity: 0.9 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{sb.name}</div>
                <div style={{ ...mono, fontSize: 10, color: 'var(--text-muted)' }}>{sb.archived_at ? `Archived: ${new Date(sb.archived_at).toLocaleString()}` : 'Archived'}</div>
              </div>
              {confirmRestoreId === sb.id ? (
                <>
                  <ActionBtn label="Confirm Restore" onClick={async () => {
                    await restoreStatBlock(sb.id)
                    setConfirmRestoreId(null)
                  }} />
                  <ActionBtn label="Cancel" onClick={() => setConfirmRestoreId(null)} />
                </>
              ) : (
                <ActionBtn label="Restore" onClick={() => setConfirmRestoreId(sb.id)} />
              )}
            </div>
          ))}
        </div>
      )}

      {showImport && (
        <ImportModal
          type="statblock"
          onClose={() => setShowImport(false)}
          onSaved={(id) => { setShowImport(false); if (id) onEdit(id) }}
        />
      )}
    </div>
  )
}

function ActionBtn({ label, onClick, danger }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      style={{
        padding: '4px 10px', background: 'transparent',
        border: `1px solid ${danger ? 'rgba(196,64,64,0.4)' : 'var(--border)'}`,
        borderRadius: 'var(--radius)', cursor: 'pointer',
        color: danger ? 'var(--danger)' : 'var(--text-secondary)',
        fontFamily: 'var(--font-mono)', fontSize: 10,
        textTransform: 'uppercase', letterSpacing: '0.08em',
      }}
    >
      {label}
    </button>
  )
}
