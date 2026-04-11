import React from 'react'

export default function RecentSounds({ title = 'Recent', items = [], onTrigger, onOpen }) {
  if (!items.length) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {items.map((asset) => (
          <button
            key={asset.id}
            type="button"
            onClick={() => onTrigger?.(asset)}
            onContextMenu={(e) => {
              e.preventDefault()
              onOpen?.(asset)
            }}
            title="Right click to open in tab"
            style={{
              padding: '3px 8px',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              background: 'var(--bg-raised)',
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              cursor: 'pointer',
            }}
          >
            {asset.name}
          </button>
        ))}
      </div>
    </div>
  )
}
