import { create } from 'zustand'
import { CHARACTERS } from '@shared/content/session1.js'
import { PLAYER_CHARACTERS } from '@shared/content/playerCharacters.js'
import { getSessionRunId } from '@shared/lib/runtimeContext.js'
import { withSpellIds } from './helpers.js'
import { createCombatSlice } from './combatSlice.js'
import { createDataSlice } from './dataSlice.js'
import { createRealtimeSlice } from './realtimeSlice.js'

const PLAYER_RUNTIME_CHARACTERS = CHARACTERS.filter(c => !c.isNPC)

export const usePlayerStore = create((set, get) => ({
  sessionRunId: getSessionRunId(),

  /** Phase 2B: narrative comes only from DB active_session_uuid — null until hydrated */
  session: null,
  currentSceneIndex: 0,
  currentBeatIndex: 0,

  characters: PLAYER_RUNTIME_CHARACTERS,
  playerCharacters: withSpellIds(PLAYER_CHARACTERS),

  getCurrentScene: () => {
    const { session, currentSceneIndex } = get()
    if (!session?.scenes?.length) return null
    return session.scenes[currentSceneIndex] || null
  },

  getCurrentBeat: () => {
    const { session, currentSceneIndex, currentBeatIndex } = get()
    const scene = session?.scenes?.[currentSceneIndex]
    return scene?.beats?.[currentBeatIndex] || null
  },

  ...createCombatSlice(set, get),
  ...createDataSlice(set, get),
  ...createRealtimeSlice(set, get),
}))
