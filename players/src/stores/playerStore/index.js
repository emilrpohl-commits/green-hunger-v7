import { create } from 'zustand'
import { SESSION_1_PLAYER, CHARACTERS } from '@shared/content/session1.js'
import { PLAYER_CHARACTERS } from '@shared/content/playerCharacters.js'
import { getSessionRunId } from '@shared/lib/runtimeContext.js'
import { withSpellIds } from './helpers.js'
import { createCombatSlice } from './combatSlice.js'
import { createDataSlice } from './dataSlice.js'
import { createRealtimeSlice } from './realtimeSlice.js'

const PLAYER_RUNTIME_CHARACTERS = CHARACTERS.filter(c => !c.isNPC)

export const usePlayerStore = create((set, get) => ({
  sessionRunId: getSessionRunId(),

  session: SESSION_1_PLAYER,
  currentSceneIndex: 0,
  currentBeatIndex: 0,

  characters: PLAYER_RUNTIME_CHARACTERS,
  playerCharacters: withSpellIds(PLAYER_CHARACTERS),

  getCurrentScene: () => {
    const { session, currentSceneIndex } = get()
    return session.scenes[currentSceneIndex]
  },

  getCurrentBeat: () => {
    const { session, currentSceneIndex, currentBeatIndex } = get()
    return session.scenes[currentSceneIndex]?.beats[currentBeatIndex] || null
  },

  ...createCombatSlice(set, get),
  ...createDataSlice(set, get),
  ...createRealtimeSlice(set, get),
}))
