import React, { useState } from 'react'
import { useCampaignStore } from '../../stores/campaignStore'
import ImportModal from '../builder/ImportModal'

export default function StatBlockLibrary({ onEdit, onCreate }) {
  const [showImport, setShowImport] = useState(false)
  const statBlocks = useCampaignStore(s => s.statBlocks)
  const deleteStatBlock = useCampaignStore(s => s.deleteStatBlock)
  const duplicateStatBlock = useCampaignStore(s => s.duplicateStatBlock)
  const [search, setSearch] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)

  const mono = { fontFamily: 'var(--font-mono)' }

  const filtered = statBlocks.filter(sb =>
    !search || sb.name.toLowerCase().includes(search.toLowerCase()) ||
    (sb.creature_type || '').toLowerCase().includes(search.toLowerCase()) ||
    (sb.tags || []).some(t => t.toLowerCase().includes(search.toLowerCase()))
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

      <div style={{ display: 'grid', gap: 10 }}>
        {filtered.map(sb => (
          <div
            key={sb.id}
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '12px 16px',
              background: 'var(--bg-raised)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
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
                  <ActionBtn label="Confirm" onClick={() => handleDelete(sb.id)} danger />
                  <ActionBtn label="Cancel" onClick={() => setConfirmDelete(null)} />
                </>
              ) : (
                <ActionBtn label="Delete" onClick={() => setConfirmDelete(sb.id)} danger />
              )}
            </div>
          </div>
        ))}
      </div>

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
      onClick={onClick}
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
