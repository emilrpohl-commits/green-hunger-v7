import React from 'react'
import { useNavigate } from 'react-router-dom'
import { featureFlags } from '@shared/lib/featureFlags.js'
import { useCampaignStore } from '../../stores/campaignStore'

export default function SeedlessCampaignHome() {
  const navigate = useNavigate()
  const campaignChoices = useCampaignStore(s => s.campaignChoices)
  const loadCampaign = useCampaignStore(s => s.loadCampaign)
  const error = useCampaignStore(s => s.error)

  const mono = { fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }

  return (
    <div style={{
      flex: 1,
      overflow: 'auto',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
    }}
    >
      <div style={{
        maxWidth: 440,
        textAlign: 'center',
        lineHeight: 1.65,
        color: 'var(--text-secondary)',
      }}
      >
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 22,
          color: 'var(--text-primary)',
          marginBottom: 12,
        }}
        >
          {campaignChoices?.length > 0 ? 'Choose a campaign' : 'No campaign yet'}
        </div>
        <p style={{ margin: '0 0 20px', fontSize: 14 }}>
          {campaignChoices?.length > 0
            ? 'Select which campaign to load into Run mode. You can switch later from Builder after loading.'
            : 'Create a row in the campaigns table (or run your migration) so this console has something to load. Seedless mode does not assume a bundled default slug.'}
        </p>
        {error && (
          <div style={{
            ...mono,
            color: 'var(--danger)',
            marginBottom: 16,
            padding: '10px 12px',
            borderRadius: 'var(--radius)',
            border: '1px solid rgba(196,64,64,0.35)',
            background: 'rgba(196,64,64,0.06)',
          }}
          >
            {error}
          </div>
        )}
        {campaignChoices?.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            {campaignChoices.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => loadCampaign(c.slug)}
                style={{
                  padding: '12px 16px',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'var(--font-body)',
                  fontSize: 14,
                }}
              >
                <div style={{ fontFamily: 'var(--font-display)', color: 'var(--green-bright)', marginBottom: 4 }}>
                  {c.title || c.slug}
                </div>
                {c.subtitle && (
                  <div style={{ ...mono, fontSize: 11 }}>{c.subtitle}</div>
                )}
                <div style={{ ...mono, fontSize: 10, marginTop: 6, opacity: 0.85 }}>{c.slug}</div>
              </button>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
          <button
            type="button"
            onClick={() => navigate('/build')}
            style={{
              padding: '10px 20px',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--green-mid)',
              background: 'var(--green-dim)',
              color: 'var(--green-bright)',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              cursor: 'pointer',
            }}
          >
            Open Builder
          </button>
        </div>
        {featureFlags.demoCampaign === false && (
          <p style={{ ...mono, fontSize: 10, marginTop: 24, opacity: 0.75 }}>
            Tip: set <code style={{ color: 'var(--text-secondary)' }}>VITE_DEMO_CAMPAIGN=1</code> to restore the bundled demo campaign slug.
          </p>
        )}
      </div>
    </div>
  )
}
