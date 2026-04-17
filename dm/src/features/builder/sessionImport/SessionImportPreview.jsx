import React from 'react'

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

export default function SessionImportPreview({ parsed }) {
  if (!parsed) return null
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <StatusRow icon="✓" text={`Session ${parsed.sessionNumber} — ${parsed.sessionTitle}`} />
        <StatusRow icon="✓" text={`${parsed.scenes.length} scenes detected`} />
        <StatusRow icon="✓" text={`${parsed.scenes.reduce((n, s) => n + s.beats.length, 0)} beats detected`} />
        {parsed.statBlocks.length > 0 && (
          <StatusRow
            icon="✓"
            text={`${parsed.statBlocks.length} stat block${parsed.statBlocks.length > 1 ? 's' : ''} detected`}
            sub={parsed.statBlocks.map((sb) => sb.name).join(', ')}
          />
        )}
        {parsed.scenes.some((s) => s.isBranching) && (
          <StatusRow
            icon="⚠"
            text="Branching paths detected"
            sub={parsed.scenes.filter((s) => s.isBranching).map((s) => `Scene ${s.sceneNumber}`).join(', ')}
          />
        )}
      </div>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginBottom: 8 }}>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          marginBottom: 10,
        }}
        >
          Scene breakdown
        </div>
        {parsed.scenes.map((scene) => (
          <div
            key={scene.sceneNumber}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '5px 0',
              borderBottom: '1px solid rgba(255,255,255,0.04)',
            }}
          >
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', minWidth: 24 }}>{scene.sceneNumber}</span>
            <span style={{ flex: 1, fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{scene.title}</span>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              color: scene.sceneType === 'combat' ? 'var(--danger)' : 'var(--text-muted)',
              textTransform: 'uppercase',
              minWidth: 60,
            }}
            >{scene.sceneType}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', minWidth: 40, textAlign: 'right' }}>{scene.beats.length} beats</span>
            {scene.isBranching && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--warning)' }}>← branch</span>}
          </div>
        ))}
      </div>

      <div style={{
        marginTop: 16,
        padding: '10px 14px',
        background: 'rgba(196,160,64,0.06)',
        border: '1px solid rgba(196,160,64,0.25)',
        borderRadius: 4,
        fontSize: 12,
        color: 'var(--text-muted)',
      }}
      >
        ⓘ Import cannot be undone. Use the session outliner to edit content after import.
      </div>
    </div>
  )
}
