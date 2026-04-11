import React, { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '@shared/lib/supabase.js'
import { getDmAuthSession, signInDmWithEmailPassword } from '@shared/lib/dmAuth.js'
import { useSessionStore } from './stores/sessionStore'
import { useCombatStore } from './stores/combatStore'
import { useCampaignStore } from './stores/campaignStore'
import { featureFlags } from '@shared/lib/featureFlags.js'
import TopBar from './features/runtime/TopBar'
import SeedlessCampaignHome from './features/runtime/SeedlessCampaignHome'
import LeftRail from './features/runtime/LeftRail'
import MainPanel from './features/runtime/MainPanel'
import CombatPanel from './features/combat/CombatPanel'
import RightRail from './features/runtime/RightRail'
import BuilderLayout from './features/builder/BuilderLayout'
import SoundToastHost from './components/SoundToastHost.jsx'

const DM_PASSWORD = 'Sherlock*123'
const DM_UNLOCK_KEY = 'gh_dm_unlocked'

function DmGate({ onUnlock }) {
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [dmPasswordInput, setDmPasswordInput] = useState('')
  const [dmGateError, setDmGateError] = useState('')
  const [authBusy, setAuthBusy] = useState(false)

  const trySupabase = async () => {
    setDmGateError('')
    setAuthBusy(true)
    const { error } = await signInDmWithEmailPassword(email.trim(), pw)
    setAuthBusy(false)
    if (error) {
      setDmGateError(error.message)
      return
    }
    onUnlock()
  }

  const tryLegacyUnlock = () => {
    if (dmPasswordInput === DM_PASSWORD) {
      window.localStorage.setItem(DM_UNLOCK_KEY, 'ok')
      setDmGateError('')
      onUnlock()
    } else {
      setDmGateError('Incorrect password.')
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-deep)', padding: 20
    }}>
      <div style={{
        width: 'min(440px, 100%)', background: 'var(--bg-card)',
        border: '1px solid var(--border)', borderRadius: 12,
        padding: 24, boxShadow: '0 8px 40px rgba(0,0,0,0.45)'
      }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
          {featureFlags.appTitle}
        </div>
        <h1 style={{ margin: '0 0 10px', fontFamily: 'var(--font-display)', color: 'var(--text-primary)', fontSize: 24 }}>
          DM Access Required
        </h1>
        <p style={{ margin: '0 0 14px', color: 'var(--text-muted)', fontSize: 13 }}>
          Sign in with Supabase (recommended), or use the legacy shared password.
        </p>

        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Supabase</div>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          style={{
            width: '100%', padding: '10px 12px', background: 'var(--bg-raised)',
            border: '1px solid var(--border)', borderRadius: 8,
            color: 'var(--text-primary)', marginBottom: 8, boxSizing: 'border-box'
          }}
        />
        <input
          type="password"
          placeholder="Password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') trySupabase() }}
          autoComplete="current-password"
          style={{
            width: '100%', padding: '10px 12px', background: 'var(--bg-raised)',
            border: '1px solid var(--border)', borderRadius: 8,
            color: 'var(--text-primary)', marginBottom: 10, boxSizing: 'border-box'
          }}
        />
        <button
          type="button"
          onClick={trySupabase}
          disabled={authBusy || !email.trim() || !pw}
          style={{
            width: '100%', padding: '10px 12px', background: 'var(--green-dim)',
            border: '1px solid var(--green-mid)', borderRadius: 8, color: 'var(--green-bright)',
            fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase',
            letterSpacing: '0.08em', cursor: authBusy ? 'wait' : 'pointer', opacity: authBusy ? 0.7 : 1
          }}
        >
          {authBusy ? 'Signing in…' : 'Sign in with Supabase'}
        </button>

        <div style={{ height: 1, background: 'var(--border)', margin: '18px 0' }} />
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Legacy gate</div>
        <input
          type="password"
          value={dmPasswordInput}
          onChange={(e) => setDmPasswordInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') tryLegacyUnlock() }}
          placeholder="Shared DM password"
          style={{
            width: '100%', padding: '10px 12px', background: 'var(--bg-raised)',
            border: '1px solid var(--border)', borderRadius: 8,
            color: 'var(--text-primary)', marginBottom: 10, boxSizing: 'border-box'
          }}
        />
        <button
          type="button"
          onClick={tryLegacyUnlock}
          style={{
            width: '100%', padding: '10px 12px', background: 'transparent',
            border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-secondary)',
            fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase',
            letterSpacing: '0.08em', cursor: 'pointer'
          }}
        >
          Unlock with legacy password
        </button>
        {dmGateError && (
          <div style={{ marginTop: 10, color: '#c87474', fontSize: 12 }}>{dmGateError}</div>
        )}
      </div>
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

function RunLayout() {
  const combatActive = useCombatStore(s => s.active)
  const navigate = useNavigate()
  const campaign = useCampaignStore(s => s.campaign)
  const loading = useCampaignStore(s => s.loading)
  const seedlessHome = featureFlags.seedlessPlatform && !featureFlags.demoCampaign
  const [rightRailCollapsed, setRightRailCollapsed] = useState(false)

  if (seedlessHome && !loading && !campaign) {
    return (
      <div style={{
        display: 'grid',
        gridTemplateRows: '48px 1fr',
        height: '100vh',
        background: 'var(--bg-deep)',
        overflow: 'hidden',
      }}
      >
        <TopBar onSwitchToBuilder={() => navigate('/build')} />
        <SeedlessCampaignHome />
      </div>
    )
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateRows: '48px 1fr',
      gridTemplateColumns: rightRailCollapsed
        ? '240px 1fr 0px'
        : (combatActive ? '240px 1fr 320px' : '240px 1fr 280px'),
      gridTemplateAreas: '"topbar topbar topbar" "left main right"',
      height: '100vh',
      background: 'var(--bg-deep)',
      overflow: 'hidden',
      transition: 'grid-template-columns 0.3s ease',
      position: 'relative',
    }}>
      <TopBar onSwitchToBuilder={() => navigate('/build')} />
      <LeftRail />
      {combatActive ? <CombatPanel /> : <MainPanel />}
      {!rightRailCollapsed && (
        <RightRail onCollapse={() => setRightRailCollapsed(true)} />
      )}
      {rightRailCollapsed && (
        <button
          type="button"
          onClick={() => setRightRailCollapsed(false)}
          title="Show sidebar"
          style={{
            position: 'absolute',
            right: 6,
            top: 62,
            zIndex: 220,
            padding: '6px 8px',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border)',
            background: 'var(--bg-raised)',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            cursor: 'pointer',
          }}
        >
          ◀ Rail
        </button>
      )}
    </div>
  )
}

function BuildLayout() {
  const navigate = useNavigate()

  return (
    <div style={{ display: 'grid', gridTemplateRows: '48px 1fr', height: '100vh', background: 'var(--bg-deep)', overflow: 'hidden' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)', gap: 16,
      }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, letterSpacing: '0.1em', color: 'var(--green-bright)', textTransform: 'uppercase' }}>
          {featureFlags.appTitle}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ModeTab label="Builder" active onClick={() => {}} />
          <ModeTab label="Run Mode" onClick={() => navigate('/run')} />
        </div>
        <div style={{ width: 120 }} />
      </div>
      <BuilderLayout />
    </div>
  )
}

export default function App() {
  const loadFromSupabase = useSessionStore(s => s.loadFromSupabase)
  const syncContentFromDb = useSessionStore(s => s.syncContentFromDb)
  const subscribeToRolls = useCombatStore(s => s.subscribeToRolls)
  const subscribeToFeed = useCombatStore(s => s.subscribeToFeed)
  const loadPlayerRolls = useCombatStore(s => s.loadPlayerRolls)
  const loadCombatStateFromDb = useCombatStore(s => s.loadCombatStateFromDb)
  const subscribeToCombatStateRemote = useCombatStore(s => s.subscribeToCombatStateRemote)
  const loadCampaign = useCampaignStore(s => s.loadCampaign)
  const dbSessions = useCampaignStore(s => s.sessions)
  const [dmUnlocked, setDmUnlocked] = useState(false)

  useEffect(() => {
    const host = window.location.hostname
    const isLocal = host === 'localhost' || host === '127.0.0.1'
    if (isLocal) {
      setDmUnlocked(true)
      return
    }
    let cancelled = false
    ;(async () => {
      const session = await getDmAuthSession()
      if (cancelled) return
      if (session?.user) {
        setDmUnlocked(true)
        return
      }
      const unlocked = window.localStorage.getItem(DM_UNLOCK_KEY) === 'ok'
      setDmUnlocked(unlocked)
    })()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) setDmUnlocked(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!dmUnlocked) return
    let cancelled = false
    ;(async () => {
      // Phase 2B: load session_state (active_session_uuid) before syncing run-mode sessions from campaign
      await loadFromSupabase()
      if (cancelled) return
      await loadCampaign()
      if (cancelled) return
      const sessions = useCampaignStore.getState().sessions
      if (sessions.length > 0) {
        syncContentFromDb(sessions)
      }
    })()
    loadPlayerRolls()
    subscribeToRolls()
    subscribeToFeed()
    loadCombatStateFromDb()
    subscribeToCombatStateRemote()
    return () => { cancelled = true }
  }, [dmUnlocked])

  useEffect(() => {
    if (dbSessions.length > 0) {
      syncContentFromDb(dbSessions)
    }
  }, [dbSessions])

  if (!dmUnlocked) {
    return <DmGate onUnlock={() => setDmUnlocked(true)} />
  }

  return (
    <>
      <SoundToastHost />
      <Routes>
        <Route path="/run" element={<RunLayout />} />
        <Route path="/build" element={<BuildLayout />} />
        <Route path="*" element={<Navigate to="/run" replace />} />
      </Routes>
    </>
  )
}
