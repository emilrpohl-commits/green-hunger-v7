import React, { useState } from 'react'
import { featureFlags } from '@shared/lib/featureFlags.js'
import { establishPlayerSessionClaims } from '@shared/lib/playerAuth.js'
import { usePlayerStore } from '../stores/playerStore'

function getPartyObserverSecret() {
  const v = import.meta.env.VITE_PARTY_OBSERVER_PASSWORD
  return v != null ? String(v).trim() : ''
}

export default function LoginScreen({ onLogin }) {
  const playerCharacters = usePlayerStore(s => s.playerCharacters)
  const loading = usePlayerStore(s => s.loading)
  const loadError = usePlayerStore(s => s.loadError)
  const CHARACTERS = Object.values(playerCharacters).filter(c => !c.isNPC)
  const partyObserverConfigured = getPartyObserverSecret().length > 0

  const [selected, setSelected] = useState(null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [shaking, setShaking] = useState(false)
  const [busy, setBusy] = useState(false)

  const shake = () => {
    setShaking(true)
    setTimeout(() => setShaking(false), 500)
  }

  const handleSubmit = async () => {
    setError('')
    if (!selected) return

    if (selected === 'party') {
      const secret = getPartyObserverSecret()
      if (!secret) {
        setError('Party observer is disabled: set VITE_PARTY_OBSERVER_PASSWORD in .env.local (never commit it).')
        shake()
        return
      }
      if (password.trim() !== secret) {
        setError('Incorrect password.')
        shake()
        return
      }
      setBusy(true)
      const auth = await establishPlayerSessionClaims({ mode: 'party', characterId: null })
      setBusy(false)
      if (!auth.ok) {
        setError(auth.error || 'Could not start session. Enable Anonymous sign-in in Supabase if RLS is on.')
        shake()
        return
      }
      onLogin('party')
      return
    }

    const char = playerCharacters[selected]
    if (!char) return

    if (password !== char.password) {
      setError('Incorrect password.')
      shake()
      setPassword('')
      return
    }
    setBusy(true)
    const auth = await establishPlayerSessionClaims({ mode: 'character', characterId: selected })
    setBusy(false)
    if (!auth.ok) {
      setError(auth.error || 'Could not start session. Enable Anonymous sign-in in Supabase if RLS is on.')
      shake()
      return
    }
    onLogin(selected)
  }

  if (loading) {
    return (
      <div className="gh-login-loading">
        Loading session data…
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-deep)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24
    }}>
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-5px); }
          80% { transform: translateX(5px); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Title */}
      <div style={{ textAlign: 'center', marginBottom: 36, animation: 'fadeUp 0.6s ease' }}>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 28,
          color: 'var(--green-bright)',
          letterSpacing: '0.12em',
          marginBottom: 6
        }}>
          {featureFlags.appTitle}
        </div>
        <div style={{
          fontFamily: 'var(--font-body)',
          fontSize: 14,
          color: 'var(--text-muted)',
          fontStyle: 'italic'
        }}>
          Player sign-in
        </div>
      </div>

      {/* Character select */}
      <div style={{
        width: '100%',
        maxWidth: 420,
        animation: 'fadeUp 0.7s ease'
      }}>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          marginBottom: 10
        }}>
          Who are you?
        </div>

        {loadError && (
          <div style={{
            padding: '10px 12px',
            marginBottom: 12,
            borderRadius: 'var(--radius)',
            border: '1px solid var(--danger)',
            color: 'var(--danger)',
            fontSize: 12,
            fontFamily: 'var(--font-mono)',
          }}
          >
            {loadError}
          </div>
        )}

        {CHARACTERS.length === 0 && (
          <div style={{
            padding: '12px 14px',
            marginBottom: 16,
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
            background: 'rgba(96,144,106,0.06)',
            fontSize: 13,
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
            textAlign: 'left',
          }}
          >
            No character sheets were returned from the database. Ask the DM to create or import characters, or enable{' '}
            <code style={{ fontSize: 11, color: 'var(--text-muted)' }}>VITE_DEMO_CAMPAIGN=1</code>
            {' '}for bundled demo PCs. You can still join as a party observer below.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          <button
            type="button"
            disabled={!partyObserverConfigured}
            onClick={() => { setSelected('party'); setPassword(''); setError('') }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '12px 16px',
              background: selected === 'party' ? 'rgba(96,144,106,0.12)' : 'var(--bg-card)',
              border: `1px solid ${selected === 'party' ? 'rgba(96,144,106,0.45)' : 'var(--border)'}`,
              borderLeft: `3px solid ${selected === 'party' ? '#60906a' : 'transparent'}`,
              borderRadius: 'var(--radius-lg)',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s ease',
            }}
          >
            <div>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: 14,
                color: selected === 'party' ? 'var(--text-primary)' : 'var(--text-secondary)',
                letterSpacing: '0.04em',
              }}
              >
                Party observer
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>
                {partyObserverConfigured
                  ? 'Read-only party view · password from VITE_PARTY_OBSERVER_PASSWORD'
                  : 'Read-only party view · disabled until VITE_PARTY_OBSERVER_PASSWORD is set'}
              </div>
            </div>
          </button>

          {CHARACTERS.map(char => (
            <button
              key={char.id}
              onClick={() => { setSelected(char.id); setPassword(''); setError('') }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '12px 16px',
                background: selected === char.id ? `${char.colour}18` : 'var(--bg-card)',
                border: `1px solid ${selected === char.id ? char.colour + '60' : 'var(--border)'}`,
                borderLeft: `3px solid ${selected === char.id ? char.colour : 'transparent'}`,
                borderRadius: 'var(--radius-lg)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{
                width: 40, height: 40,
                borderRadius: '50%',
                background: char.colour + '30',
                border: `1px solid ${char.colour}40`,
                overflow: 'hidden',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <img
                  src={`characters/${char.image}`}
                  alt={char.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
                  onError={e => { e.target.style.display = 'none' }}
                />
              </div>
              <div>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 14,
                  color: selected === char.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                  letterSpacing: '0.04em'
                }}>
                  {char.name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>
                  {char.species} {char.class} · Level {char.level}
                </div>
              </div>
            </button>
          ))}

        </div>

        {/* Password input */}
        {selected && (
          <div style={{ animation: 'fadeUp 0.3s ease' }}>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: 8
            }}>
              Password
            </div>
            <div style={{
              display: 'flex',
              gap: 8,
              animation: shaking ? 'shake 0.5s ease' : 'none'
            }}>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !busy && handleSubmit()}
                placeholder="Enter your password…"
                autoFocus
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  fontFamily: 'var(--font-body)',
                  fontSize: 15,
                  background: 'var(--bg-raised)',
                  border: `1px solid ${error ? 'var(--danger)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
              />
              <button
                onClick={() => handleSubmit()}
                disabled={busy}
                style={{
                  padding: '10px 20px',
                  background: 'var(--green-dim)',
                  border: '1px solid var(--green-mid)',
                  borderRadius: 'var(--radius)',
                  color: 'var(--green-bright)',
                  fontSize: 13,
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.06em',
                  cursor: 'pointer'
                }}
              >
                {busy ? '…' : 'Enter'}
              </button>
            </div>
            {error && (
              <div style={{
                marginTop: 8,
                fontSize: 12,
                color: 'var(--danger)',
                fontFamily: 'var(--font-mono)'
              }}>
                {error}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
