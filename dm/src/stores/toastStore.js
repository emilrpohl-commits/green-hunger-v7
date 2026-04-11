import { create } from 'zustand'

const DEFAULT_MS = 3200

export const useToastStore = create((set, get) => ({
  toasts: [],

  push: (message, type = 'error', durationMs = DEFAULT_MS) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    set((s) => ({ toasts: [...s.toasts, { id, message: String(message || ''), type }] }))
    if (durationMs > 0) {
      setTimeout(() => get().dismiss(id), durationMs)
    }
    return id
  },

  dismiss: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
  },
}))

export function pushToast(message, type = 'error', durationMs) {
  return useToastStore.getState().push(message, type, durationMs)
}
