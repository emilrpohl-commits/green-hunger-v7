import React, { useEffect, useState } from 'react'
import { usePlayerStore } from './stores/playerStore'
import LoginScreen from './components/LoginScreen'
import PartyView from './components/PartyView'
import CharacterProfile from './components/CharacterProfile'

export default function App() {
  const subscribe = usePlayerStore(s => s.subscribe)
  const ilyaAssignedTo = usePlayerStore(s => s.ilyaAssignedTo)
  const [loggedInAs, setLoggedInAs] = useState(null)
  const [view, setView] = useState('party')

  useEffect(() => {
    const unsubscribe = subscribe()
    return unsubscribe
  }, [])

  useEffect(() => {
    const saved = sessionStorage.getItem('gh_player')
    if (saved) setLoggedInAs(saved)
  }, [])

  useEffect(() => {
    if (view === 'companion' && ilyaAssignedTo !== loggedInAs) {
      setView('profile')
    }
  }, [ilyaAssignedTo])

  const handleLogin = (id) => {
    sessionStorage.setItem('gh_player', id)
    setLoggedInAs(id)
  }

  const handleLogout = () => {
    sessionStorage.removeItem('gh_player')
    setLoggedInAs(null)
    setView('party')
  }

  if (!loggedInAs) {
    return <LoginScreen onLogin={handleLogin} />
  }

  const navTabs = [
    { id: 'party', label: 'Party' },
    loggedInAs !== 'party' ? { id: 'profile', label: 'My Sheet' } : null,
    loggedInAs !== 'party' && ilyaAssignedTo === loggedInAs ? { id: 'companion', label: 'Ilya' } : null,
  ].filter(Boolean)

  const activeView = loggedInAs === 'party' ? 'party' : view

  function renderView() {
    if (activeView === 'companion') {
      return <CharacterProfile characterId="ilya" />
    }
    if (activeView === 'profile' && loggedInAs !== 'party') {
      return <CharacterProfile characterId={loggedInAs} />
    }
    return <PartyView />
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-deep)', display: 'flex', flexDirection: 'column' }}>
      {/* ── Header ── */}
      <div style={{
        padding: '12px 20px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'var(--bg-surface)',
        flexShrink: 0,
      }}>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 14,
          color: 'var(--green-bright)',
          letterSpacing: '0.1em',
        }}>
          The Green Hunger
        </div>

        {/* Nav tabs */}
        <div style={{ display: 'flex', gap: 4 }}>
          {navTabs.map(tab => {
            const isActive = activeView === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setView(tab.id)}
                style={{
                  padding: '5px 14px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  background: isActive ? 'var(--green-dim)' : 'transparent',
                  border: `1px solid ${isActive ? 'var(--green-mid)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius)',
                  color: isActive ? 'var(--green-bright)' : 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        <button
          onClick={handleLogout}
          style={{
            padding: '4px 10px',
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            background: 'transparent',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            color: 'var(--text-muted)',
            cursor: 'pointer',
          }}
        >
          Leave
        </button>
      </div>

      {/* ── Main content ── */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {renderView()}
      </div>
    </div>
  )
}
