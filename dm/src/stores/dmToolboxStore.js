import { create } from 'zustand'
import {
  rollWildMagicD100,
  resolveWildMagicRoll,
  wildMagicShouldTrackActive,
} from '@shared/lib/dmToolbox/wildMagicTable.js'

const HISTORY_CAP = 10

const QUICK_RULINGS_UI_KEY = 'gh_dm_quick_rulings_ui'

function readQuickRulingsUi() {
  try {
    const j = JSON.parse(window.localStorage.getItem(QUICK_RULINGS_UI_KEY) || '{}')
    return {
      open: Boolean(j.open),
      collapsed: Boolean(j.collapsed),
    }
  } catch {
    return { open: false, collapsed: false }
  }
}

const quickRulingsUi = typeof window !== 'undefined' ? readQuickRulingsUi() : { open: false, collapsed: false }

function commitResolvedWildMagic(set, resolved) {
  if (!resolved) return null
  const roll = resolved.roll
  const historyId = `h-${Date.now()}-${roll}`
  const historyEntry = {
    historyId,
    at: Date.now(),
    roll: resolved.roll,
    effectId: resolved.id,
    title: resolved.title,
    description: resolved.description,
    type: resolved.type,
    duration: resolved.duration,
    tone: resolved.tone,
  }

  set((s) => {
    let nextActive = s.wildMagicActive
    if (wildMagicShouldTrackActive(resolved)) {
      nextActive = [
        ...s.wildMagicActive,
        {
          instanceId: `a-${Date.now()}-${roll}`,
          addedAt: Date.now(),
          roll: resolved.roll,
          effectId: resolved.id,
          title: resolved.title,
          description: resolved.description,
          type: resolved.type,
          duration: resolved.duration,
          tone: resolved.tone,
        },
      ]
    }
    return {
      wildMagicHistory: [historyEntry, ...s.wildMagicHistory].slice(0, HISTORY_CAP),
      wildMagicActive: nextActive,
    }
  })

  return historyEntry
}

function persistQuickRulingsUi() {
  if (typeof window === 'undefined') return
  try {
    const st = useDmToolboxStore.getState()
    window.localStorage.setItem(
      QUICK_RULINGS_UI_KEY,
      JSON.stringify({
        open: st.quickRulingsDrawerOpen,
        collapsed: st.quickRulingsDrawerCollapsed,
      })
    )
  } catch {
    /* ignore */
  }
}

export const useDmToolboxStore = create((set) => ({
  wildMagicHistory: [],
  wildMagicActive: [],
  /** Optional: remaining XP after building encounters */
  encounterBudgetRemaining: null,

  /** Run-mode quick rulings strip (persisted) */
  quickRulingsDrawerOpen: quickRulingsUi.open,
  quickRulingsDrawerCollapsed: quickRulingsUi.collapsed,

  setQuickRulingsDrawerOpen: (value) => {
    set({ quickRulingsDrawerOpen: Boolean(value) })
    queueMicrotask(persistQuickRulingsUi)
  },

  toggleQuickRulingsDrawerCollapsed: () => {
    set((s) => ({ quickRulingsDrawerCollapsed: !s.quickRulingsDrawerCollapsed }))
    queueMicrotask(persistQuickRulingsUi)
  },

  rollWildMagic: () => commitResolvedWildMagic(set, resolveWildMagicRoll(rollWildMagicD100())),

  /** d100 result from physical dice (or any 1–100); same history / active behavior as rollWildMagic */
  applyWildMagicManualRoll: (d100) => commitResolvedWildMagic(set, resolveWildMagicRoll(d100)),

  removeWildMagicActive: (instanceId) => {
    set((s) => ({
      wildMagicActive: s.wildMagicActive.filter((x) => x.instanceId !== instanceId),
    }))
  },

  clearWildMagicActive: () => set({ wildMagicActive: [] }),

  clearWildMagicHistory: () => set({ wildMagicHistory: [] }),

  setEncounterBudgetRemaining: (value) => {
    const n = Number(value)
    set({
      encounterBudgetRemaining: Number.isFinite(n) ? Math.max(0, n) : null,
    })
  },

  subtractEncounterBudget: (amount) => {
    const sub = Number(amount) || 0
    set((s) => {
      if (s.encounterBudgetRemaining == null) return s
      return {
        encounterBudgetRemaining: Math.max(0, s.encounterBudgetRemaining - sub),
      }
    })
  },

  initEncounterBudgetFromTotal: (total) => {
    const n = Number(total)
    if (!Number.isFinite(n) || n < 0) return
    set({ encounterBudgetRemaining: n })
  },
}))
