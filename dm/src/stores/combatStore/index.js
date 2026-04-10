import { create } from 'zustand'
import { getSessionRunId } from '@shared/lib/runtimeContext.js'
import { createStateSlice } from './stateSlice.js'
import { createActionsSlice } from './actionsSlice.js'
import { createFeedSlice } from './feedSlice.js'
import { createEncountersSlice } from './encountersSlice.js'

export const useCombatStore = create((set, get) => ({
  sessionRunId: getSessionRunId(),
  ...createStateSlice(set, get),
  ...createActionsSlice(set, get),
  ...createFeedSlice(set, get),
  ...createEncountersSlice(set, get),
}))
