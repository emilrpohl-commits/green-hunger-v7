import React, { useEffect, useState } from 'react'
import { useSessionStore } from './stores/sessionStore'
import { useCombatStore } from './stores/combatStore'
import { useCampaignStore } from './stores/campaignStore'
import TopBar from './features/runtime/TopBar'
import LeftRail from './features/runtime/LeftRail'
import MainPanel from './features/runtime/MainPanel'
import CombatPanel from './features/combat/CombatPanel'
import RightRail from './features/runtime/RightRail'
import BuilderLayout from './features/builder/BuilderLayout'

const DM_PASSWORD = 'Sherlock*123'
const DM_UNLOCK_KEY = 'gh_dm_unlocked'

export default function App() {
  const loadFromSupabase = useSessionStore(s => s.loadFromSupabase)
  const syncContentFromDb = useSessionStore(s => s.syncContentFromDb)
  const combatActive = useCombatStore(s => s.active)
  const subscribeToRolls = useCombatStore(s => s.subscribeToRolls)
  const subscribeToFeed = useCombatStore(s => s.subscribeToFeed)
  const loadPlayerRolls = useCombatStore(s => s.loadPlayerRolls)
  const loadCombatStateFromDb = useCombatStore(s => s.loadCombatStateFromDb)
  const subscribeToCombatStateRemote = useCombatStore(s => s.subscribeToCombatStateRemote)
  const loadCampaign = useCampaignStore(s => s.loadCampaign)
  const dbSessions = useCampaignStore(s => s.sessions)
  const [mode, setMode] = useState('run')  // 'run' | 'build'
  const [dmUnlocked, setDmUnlocked] = useState(false)
  const [dmPasswordInput, setDmPasswordInput] = useState('')
  const [dmGateError, setDmGateError] = useState('')

  useEffect(() => {
    const host = window.location.hostname
    const isLocal = host === 'localhost' || host === '127.0.0.1'
    if (isLocal) {
      setDmUnlocked(true)
      return
    }
    const unlocked = window.localStorage.getItem(DM_UNLOCK_KEY) === 'ok'
    setDmUnlocked(unlocked)
  }, [])

  useEffect(() => {
    if (!dmUnlocked) return
    loadFromSupabase()
    loadPlayerRolls()
    subscribeToRolls()
    subscribeToFeed()
    loadCombatStateFromDb()
    subscribeToCombatStateRemote()
    loadCampaign()
  }, [dmUnlocked])

  // When DB sessions load, push them into run-mode session store
  useEffect(() => {
    if (dbSessions.length > 0) {
      syncContentFromDb(dbSessions)
    }
  }, [dbSessions])

  if (!dmUnlocked) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-deep)',
        padding: 20
      }}>
        <div style={{
          width: 'min(420px, 100%)',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 24,
          boxShadow: '0 8px 40px rgba(0,0,0,0.45)'
        }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
            The Green Hunger
          </div>
          <h1 style={{ margin: '0 0 10px', fontFamily: 'var(--font-display)', color: 'var(--text-primary)', fontSize: 24 }}>
            DM Access Required
          </h1>
          <p style={{ margin: '0 0 14px', color: 'var(--text-muted)', fontSize: 13 }}>
            Enter DM password to continue.
          </p>
          <input
            type="password"
            value={dmPasswordInput}
            onChange={(e) => setDmPasswordInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return
              if (dmPasswordInput === DM_PASSWORD) {
                window.localStorage.setItem(DM_UNLOCK_KEY, 'ok')
                setDmGateError('')
                setDmUnlocked(true)
              } else {
                setDmGateError('Incorrect password.')
              }
            }}
            autoFocus
            style={{
              width: '100%',
              padding: '10px 12px',
              background: 'var(--bg-raised)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              color: 'var(--text-primary)',
              marginBottom: 10
            }}
          />
          <button
            onClick={() => {
              if (dmPasswordInput === DM_PASSWORD) {
                window.localStorage.setItem(DM_UNLOCK_KEY, 'ok')
                setDmGateError('')
                setDmUnlocked(true)
              } else {
                setDmGateError('Incorrect password.')
              }
            }}
            style={{
              width: '100%',
              padding: '10px 12px',
              background: 'var(--green-dim)',
              border: '1px solid var(--green-mid)',
              borderRadius: 8,
              color: 'var(--green-bright)',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              cursor: 'pointer'
            }}
          >
            Unlock DM App
          </button>
          {dmGateError && (
            <div style={{ marginTop: 10, color: '#c87474', fontSize: 12 }}>{dmGateError}</div>
          )}
        </div>
      </div>
    )
  }

  if (mode === 'build') {
    return (
      <div style={{ display: 'grid', gridTemplateRows: '48px 1fr', height: '100vh', background: 'var(--bg-deep)', overflow: 'hidden' }}>
        {/* Builder topbar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 16px', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)', gap: 16,
        }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, letterSpacing: '0.1em', color: 'var(--green-bright)', textTransform: 'uppercase' }}>
            The Green Hunger
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ModeTab label="Builder" active onClick={() => {}} />
            <ModeTab label="Run Mode" onClick={() => setMode('run')} />
          </div>
          <div style={{ width: 120 }} />
        </div>
        <BuilderLayout />
      </div>
    )
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateRows: '48px 1fr',
      gridTemplateColumns: combatActive ? '240px 1fr 320px' : '240px 1fr 280px',
      gridTemplateAreas: '"topbar topbar topbar" "left main right"',
      height: '100vh',
      background: 'var(--bg-deep)',
      overflow: 'hidden',
      transition: 'grid-template-columns 0.3s ease'
    }}>
      <TopBar onSwitchToBuilder={() => setMode('build')} />
      <LeftRail />
      {combatActive ? <CombatPanel /> : <MainPanel />}
      <RightRail />
    </div>
  )
}

function ModeTab({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '5px 14px', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius)',
        background: active ? 'rgba(100,200,100,0.12)' : 'transparent',
        color: active ? 'var(--green-bright)' : 'var(--text-muted)',
        fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em',
        outline: active ? '1px solid rgba(100,200,100,0.3)' : 'none',
      }}
    >
      {label}
    </button>
  )
}
