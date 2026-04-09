import React, { useEffect, useState } from 'react'
import { usePlayerStore } from './stores/playerStore'
import LoginScreen from './components/LoginScreen'
import PartyView from './components/PartyView'
import CharacterProfile from './components/CharacterProfile'
import CombatCarousel from './components/CombatCarousel'

export default function App() {
  const subscribe = usePlayerStore(s => s.subscribe)
  const ilyaAssignedTo = usePlayerStore(s => s.ilyaAssignedTo)
  const combatActive = usePlayerStore(s => s.combatActive)
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

  // Auto-navigate to combat view when combat starts
  useEffect(() => {
    if (combatActive && view === 'party') {
      setView('combat')
    }
    if (!combatActive && view === 'combat') {
      setView('party')
    }
  }, [combatActive])

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

  // Build available nav tabs
  const navTabs = [
    { id: 'party', label: 'Party' },
    combatActive ? { id: 'combat', label: '⚔ Combat' } : null,
    loggedInAs !== 'party' ? { id: 'profile', label: 'My Sheet' } : null,
    loggedInAs !== 'party' && ilyaAssignedTo === loggedInAs ? { id: 'companion', label: 'Ilya' } : null,
  ].filter(Boolean)

  const activeView = loggedInAs === 'party' ? 'party' : view

  function renderView() {
    if (activeView === 'combat' && combatActive) {
      return <CombatCarousel loggedInAs={loggedInAs} />
    }
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
            const isCombat = tab.id === 'combat'
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
                  background: isActive
                    ? (isCombat ? 'rgba(176,48,48,0.25)' : 'var(--green-dim)')
                    : 'transparent',
                  border: `1px solid ${
                    isActive
                      ? (isCombat ? 'rgba(176,48,48,0.6)' : 'var(--green-mid)')
                      : 'var(--border)'
                  }`,
                  borderRadius: 'var(--radius)',
                  color: isActive
                    ? (isCombat ? '#e07070' : 'var(--green-bright)')
                    : 'var(--text-muted)',
                  cursor: 'pointer',
                  // Pulse the combat tab when active but not selected
                  animation: (isCombat && !isActive) ? 'glow-pulse 2s ease-in-out infinite' : 'none',
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
