import React, { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { featureFlags } from '@shared/lib/featureFlags.js'
import { establishPlayerSessionClaims } from '@shared/lib/playerAuth.js'
import { usePlayerStore } from './stores/playerStore'
import LoginScreen from './components/LoginScreen'
import PartyView from './components/PartyView'
import CharacterProfile from './components/CharacterProfile'
import PlayerDiceRollerDock from './components/PlayerDiceRollerDock.jsx'
import ErrorBoundary from '@shared/components/ErrorBoundary.jsx'

export default function App() {
  const subscribe = usePlayerStore(s => s.subscribe)
  const unsubscribeRealtime = usePlayerStore(s => s.unsubscribe)
  const ilyaAssignedTo = usePlayerStore(s => s.ilyaAssignedTo)
  const characters = usePlayerStore(s => s.characters)
  const [loggedInAs, setLoggedInAs] = useState(null)
  const [diceDockExpanded, setDiceDockExpanded] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const saved = sessionStorage.getItem('gh_player')
      if (saved) {
        await establishPlayerSessionClaims({
          mode: saved === 'party' ? 'party' : 'character',
          characterId: saved === 'party' ? null : saved,
        })
        if (cancelled) return
        setLoggedInAs(saved)
        usePlayerStore.getState().setActiveSessionUserId(saved)
      }
      if (cancelled) return
      subscribe()
    })()
    return () => {
      cancelled = true
      unsubscribeRealtime()
    }
  }, [subscribe, unsubscribeRealtime])

  useEffect(() => {
    const stored = sessionStorage.getItem('gh_player_dice_dock_expanded')
    setDiceDockExpanded(stored === 'true')
  }, [])

  useEffect(() => {
    sessionStorage.setItem('gh_player_dice_dock_expanded', diceDockExpanded ? 'true' : 'false')
  }, [diceDockExpanded])

  const roster = Array.isArray(characters) ? characters : []
  const ilyaLinkedToPlayer = roster.some(
    (c) => c.id === 'ilya' && String(c.assignedPcId || '') === String(loggedInAs || '')
  ) || String(ilyaAssignedTo || '') === String(loggedInAs || '')

  useEffect(() => {
    if (location.pathname === '/companion' && loggedInAs !== 'party' && !ilyaLinkedToPlayer) {
      navigate('/profile', { replace: true })
    }
  }, [ilyaLinkedToPlayer, loggedInAs, location.pathname, navigate])

  const handleLogin = (id) => {
    sessionStorage.setItem('gh_player', id)
    setLoggedInAs(id)
    usePlayerStore.getState().setActiveSessionUserId(id)
    navigate(id === 'party' ? '/party' : '/profile')
  }

  const handleLogout = () => {
    sessionStorage.removeItem('gh_player')
    setLoggedInAs(null)
    usePlayerStore.getState().setActiveSessionUserId(null)
    navigate('/')
  }

  if (!loggedInAs) {
    return <LoginScreen onLogin={handleLogin} />
  }

  const showCompanionTab = loggedInAs !== 'party' && ilyaLinkedToPlayer
  const isPartyOnly = loggedInAs === 'party'

  const navTabs = [
    { path: '/party', label: 'Party' },
    !isPartyOnly ? { path: '/profile', label: 'My Sheet' } : null,
    showCompanionTab ? { path: '/companion', label: 'Ilya' } : null,
  ].filter(Boolean)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-deep)', display: 'flex', flexDirection: 'column' }}>
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
          {featureFlags.appTitle}
        </div>

        <div style={{ display: 'flex', gap: 4 }}>
          {navTabs.map(tab => {
            const isActive = location.pathname === tab.path
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
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

      <div style={{ flex: 1, overflow: 'auto', paddingBottom: diceDockExpanded ? 300 : 72 }}>
        <ErrorBoundary label="Player app">
          <Routes>
            <Route path="/party" element={<PartyView />} />
            <Route path="/profile" element={
              isPartyOnly ? <Navigate to="/party" replace /> : (
                <CharacterProfile characterId={loggedInAs} onBackToLogin={handleLogout} />
              )
            } />
            <Route path="/companion" element={
              showCompanionTab ? (
                <CharacterProfile characterId="ilya" onBackToLogin={handleLogout} />
              ) : <Navigate to="/profile" replace />
            } />
            <Route path="*" element={<Navigate to={isPartyOnly ? '/party' : '/profile'} replace />} />
          </Routes>
        </ErrorBoundary>
      </div>
      <PlayerDiceRollerDock
        actorName={loggedInAs === 'party' ? 'Party' : 'Player'}
        expanded={diceDockExpanded}
        onExpandedChange={setDiceDockExpanded}
      />
    </div>
  )
}
