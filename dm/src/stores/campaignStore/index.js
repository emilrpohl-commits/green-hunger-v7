import { create } from 'zustand'
import { createDataSlice } from './dataSlice.js'
import { createContentCrudSlice } from './contentCrudSlice.js'
import { createEntityCrudSlice } from './entityCrudSlice.js'

export const useCampaignStore = create((set, get) => ({
  ...createDataSlice(set, get),
  ...createContentCrudSlice(set, get),
  ...createEntityCrudSlice(set, get),
}))
