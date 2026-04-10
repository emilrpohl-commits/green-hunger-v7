import React, { useState, useEffect } from 'react'
import { featureFlags } from '@shared/lib/featureFlags.js'
import { useCampaignStore } from '../../stores/campaignStore'
import { runMigration } from '@supabase-root/migrate.js'
import StatBlockLibrary from '../statblocks/StatBlockLibrary'
import StatBlockEditor from '../statblocks/StatBlockEditor'
import SessionOutliner from '../sessions/SessionOutliner'
import SessionImportModal from './SessionImportModal'
import SpellLibrary from '../spells/SpellLibrary'
import NpcLibrary from '../npcs/NpcLibrary'
import ReferenceLibrary from '../reference/ReferenceLibrary'
import CharacterPdfImport from '../characters/CharacterPdfImport'
import CharacterEditor from '../characters/CharacterEditor'

// Keep the syncContentFromDb call available in Build mode too
import { useSessionStore } from '../../stores/sessionStore'

const NAV_ITEMS = [
  { id: 'sessions', label: 'Sessions & Scenes', icon: '📖' },
  { id: 'stat-blocks', label: 'Stat Blocks', icon: '⚔️' },
  { id: 'spells', label: 'Spells', icon: '✨' },
  { id: 'npcs', label: 'NPCs', icon: '🧙' },
  { id: 'reference', label: 'SRD Reference', icon: '📚' },
  { id: 'character-import', label: 'Character Import', icon: '🧾' },
  { id: 'characters', label: 'Characters', icon: '🧝' },
]

export default function BuilderLayout() {
  const [activeSection, setActiveSection] = useState('sessions')
  const [editStatBlock, setEditStatBlock] = useState(null) // id or null
  const [showDocxImport, setShowDocxImport] = useState(false)
  const [migrating, setMigrating] = useState(false)
  const [migrateResult, setMigrateResult] = useState(null)

  const loading = useCampaignStore(s => s.loading)
  const error = useCampaignStore(s => s.error)
  const campaign = useCampaignStore(s => s.campaign)
  const campaignChoices = useCampaignStore(s => s.campaignChoices)
  const sessions = useCampaignStore(s => s.sessions)
  const loadCampaign = useCampaignStore(s => s.loadCampaign)

  useEffect(() => {
    if (!campaign) loadCampaign()
  }, [])

  const syncContentFromDb = useSessionStore(s => s.syncContentFromDb)

  const handleMigrate = async () => {
    setMigrating(true)
    setMigrateResult(null)
    const result = await runMigration()
    setMigrateResult(result)
    setMigrating(false)
    if (result.success) {
      await loadCampaign()
      const freshSessions = useCampaignStore.getState().sessions
      syncContentFromDb(freshSessions)
    }
  }

  const mono = { fontFamily: 'var(--font-mono)' }
  const label = { ...mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }

  const renderMain = () => {
    if (loading) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 16 }}>
          <div style={{ width: 32, height: 32, border: '2px solid var(--green-bright)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>Loading campaign…</span>
        </div>
      )
    }

    if (activeSection === 'reference') {
      return <ReferenceLibrary />
    }

    if (!campaign && !loading) {
      if (campaignChoices.length > 0) {
        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 16, padding: 24 }}>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center', maxWidth: 440, lineHeight: 1.7 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text-primary)', marginBottom: 12 }}>Choose a campaign</div>
              Several campaigns exist in the database. Pick one to load builder data, or run migration if you still need to import bundled content.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 360 }}>
              {campaignChoices.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => loadCampaign(c.slug)}
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-body)',
                    fontSize: 14,
                  }}
                >
                  <div style={{ fontFamily: 'var(--font-display)', color: 'var(--green-bright)' }}>{c.title || c.slug}</div>
                  {c.subtitle && <div style={{ ...mono, fontSize: 11, marginTop: 4 }}>{c.subtitle}</div>}
                  <div style={{ ...mono, fontSize: 10, marginTop: 6, opacity: 0.8 }}>{c.slug}</div>
                </button>
              ))}
            </div>
          </div>
        )
      }
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 20 }}>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center', maxWidth: 400, lineHeight: 1.7 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text-primary)', marginBottom: 12 }}>No Campaign Found</div>
            {featureFlags.seedlessPlatform && !featureFlags.demoCampaign
              ? 'Seedless mode does not assume a default campaign slug. Add a row to campaigns or run the migration to import bundled demo data.'
              : 'Run the migration to import your existing campaign content into Supabase, or check that the schema has been applied.'}
          </div>
          <button
            onClick={handleMigrate}
            disabled={migrating}
            style={{
              padding: '10px 24px', background: 'var(--green-bright)', color: '#0a0f0a',
              border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer',
              fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
              opacity: migrating ? 0.6 : 1
            }}
          >
            {migrating ? 'Migrating…' : 'Run Migration'}
          </button>
          {migrateResult && (
            <div style={{
              padding: '10px 16px', borderRadius: 'var(--radius)',
              background: migrateResult.success ? 'rgba(100,200,100,0.08)' : 'rgba(196,64,64,0.08)',
              border: `1px solid ${migrateResult.success ? 'var(--green-bright)' : 'var(--danger)'}`,
              ...mono, fontSize: 12,
              color: migrateResult.success ? 'var(--green-bright)' : 'var(--danger)'
            }}>
              {migrateResult.success ? '✓ Migration complete. Reload the page.' : `✗ ${migrateResult.error}`}
            </div>
          )}
        </div>
      )
    }

    if (editStatBlock !== undefined && activeSection === 'stat-blocks') {
      if (editStatBlock !== null) {
        return (
          <StatBlockEditor
            statBlockId={editStatBlock}
            onClose={() => setEditStatBlock(null)}
          />
        )
      }
    }

    switch (activeSection) {
      case 'sessions':
        return <SessionOutliner onImport={() => setShowDocxImport(true)} />
      case 'stat-blocks':
        return (
          <StatBlockLibrary
            onEdit={(id) => setEditStatBlock(id)}
            onCreate={() => setEditStatBlock('__new__')}
          />
        )
      case 'spells':
        return <SpellLibrary />
      case 'npcs':
        return <NpcLibrary />
      case 'character-import':
        return <CharacterPdfImport />
      case 'characters':
        return <CharacterEditor />
      default:
        return null
    }
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Left nav */}
      <div style={{
        width: 200, flexShrink: 0,
        background: 'var(--bg-surface)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', padding: '16px 0',
        overflowY: 'auto',
      }}>
        <div style={{ ...label, padding: '0 16px', marginBottom: 8 }}>Builder</div>

        {campaign && (
          <div style={{ padding: '8px 16px 16px', borderBottom: '1px solid var(--border)', marginBottom: 8 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, color: 'var(--green-bright)', lineHeight: 1.3 }}>
              {campaign.title}
            </div>
            {campaign.subtitle && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, fontStyle: 'italic', lineHeight: 1.4 }}>
                {campaign.subtitle}
              </div>
            )}
          </div>
        )}

        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => { setActiveSection(item.id); setEditStatBlock(null) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 16px', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%',
              background: activeSection === item.id ? 'rgba(100,200,100,0.08)' : 'transparent',
              borderLeft: activeSection === item.id ? '2px solid var(--green-bright)' : '2px solid transparent',
              color: activeSection === item.id ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontSize: 13,
            }}
          >
            <span style={{ fontSize: 14 }}>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}

        <div style={{ flex: 1 }} />

        {/* Migration button (always accessible) */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
          <button
            onClick={handleMigrate}
            disabled={migrating}
            style={{
              width: '100%', padding: '7px 12px',
              background: 'rgba(100,200,100,0.06)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              color: 'var(--text-muted)', cursor: 'pointer',
              ...mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em',
              opacity: migrating ? 0.5 : 1
            }}
          >
            {migrating ? 'Migrating…' : 'Run Migration'}
          </button>
          {migrateResult && (
            <div style={{
              marginTop: 6, fontSize: 10, ...mono,
              color: migrateResult.success ? 'var(--green-bright)' : 'var(--danger)'
            }}>
              {migrateResult.success ? '✓ Done' : `✗ ${migrateResult.error?.slice(0, 40)}`}
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-deep)' }}>
        {error && (
          <div style={{ padding: '10px 20px', background: 'rgba(196,64,64,0.1)', borderBottom: '1px solid var(--danger)', fontSize: 12, color: 'var(--danger)', fontFamily: 'var(--font-mono)' }}>
            Error: {error}
          </div>
        )}
        {renderMain()}
      </div>

      {/* Session Import modal */}
      {showDocxImport && (
        <SessionImportModal
          onClose={() => setShowDocxImport(false)}
          onDone={(sessionId) => {
            setShowDocxImport(false)
            loadCampaign()
          }}
        />
      )}
    </div>
  )
}

