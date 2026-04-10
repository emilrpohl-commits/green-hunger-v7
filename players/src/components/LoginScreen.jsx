import React, { useState } from 'react'
import { featureFlags } from '@shared/lib/featureFlags.js'
import { usePlayerStore } from '../stores/playerStore'

const PARTY_PASSWORD = 'weald' // anyone can join as party observer

export default function LoginScreen({ onLogin }) {
  const playerCharacters = usePlayerStore(s => s.playerCharacters)
  const CHARACTERS = Object.values(playerCharacters).filter(c => !c.isNPC)

  const [selected, setSelected] = useState(null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [shaking, setShaking] = useState(false)

  const shake = () => {
    setShaking(true)
    setTimeout(() => setShaking(false), 500)
  }

  const handleSubmit = () => {
    setError('')
    if (!selected) return

    if (selected === 'party') {
      if (password.toLowerCase() === PARTY_PASSWORD) {
        onLogin('party')
      } else {
        setError('Incorrect password.')
        shake()
      }
      return
    }

    const char = playerCharacters[selected]
    if (!char) return

    if (password === char.password) {
      onLogin(selected)
    } else {
      setError('Incorrect password.')
      shake()
      setPassword('')
    }
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
                Read-only party view · password: weald
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
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
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
                onClick={handleSubmit}
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
                Enter
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
