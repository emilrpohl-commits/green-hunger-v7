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

export default function App() {
  const loadFromSupabase = useSessionStore(s => s.loadFromSupabase)
  const syncContentFromDb = useSessionStore(s => s.syncContentFromDb)
  const combatActive = useCombatStore(s => s.active)
  const subscribeToRolls = useCombatStore(s => s.subscribeToRolls)
  const loadPlayerRolls = useCombatStore(s => s.loadPlayerRolls)
  const loadCombatStateFromDb = useCombatStore(s => s.loadCombatStateFromDb)
  const subscribeToCombatStateRemote = useCombatStore(s => s.subscribeToCombatStateRemote)
  const loadCampaign = useCampaignStore(s => s.loadCampaign)
  const dbSessions = useCampaignStore(s => s.sessions)
  const [mode, setMode] = useState('run')  // 'run' | 'build'

  useEffect(() => {
    loadFromSupabase()
    loadPlayerRolls()
    subscribeToRolls()
    loadCombatStateFromDb()
    subscribeToCombatStateRemote()
    loadCampaign()
  }, [])

  // When DB sessions load, push them into run-mode session store
  useEffect(() => {
    if (dbSessions.length > 0) {
      syncContentFromDb(dbSessions)
    }
  }, [dbSessions])

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
