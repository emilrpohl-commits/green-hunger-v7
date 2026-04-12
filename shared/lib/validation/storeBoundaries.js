/**
 * Runtime validation at Supabase → Zustand boundaries.
 * Invalid rows are dropped or coerced with console warnings (no silent corruption).
 */
import { z } from 'zod'

const combatantSchema = z.object({ id: z.string() }).passthrough()

const characterStateRowSchema = z.object({
  id: z.string(),
  cur_hp: z.number().optional().nullable(),
  temp_hp: z.number().optional().nullable(),
  concentration: z.boolean().optional().nullable(),
  spell_slots: z.record(z.string(), z.any()).optional().nullable(),
  death_saves: z.record(z.string(), z.any()).optional().nullable(),
  conditions: z.array(z.string()).optional().nullable(),
  tactical_json: z.unknown().optional().nullable(),
  green_marks: z.number().optional().nullable(),
}).passthrough()

const dbCharacterRowSchema = z.object({
  id: z.string(),
}).passthrough()

const spellRowSchema = z.object({
  name: z.string().optional().nullable(),
  spell_id: z.string().optional().nullable(),
}).passthrough()

const beatRowSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  scene_id: z.string().optional().nullable(),
  order: z.number().optional().nullable(),
  title: z.string().optional().nullable(),
  type: z.string().optional().nullable(),
}).passthrough()

export function parseCombatantsArray(raw, label = 'combatants') {
  let arr = raw
  if (typeof raw === 'string') {
    try {
      arr = JSON.parse(raw)
    } catch {
      console.warn(`[validation] ${label}: invalid JSON string`)
      return []
    }
  }
  if (!Array.isArray(arr)) {
    console.warn(`[validation] ${label}: expected array`)
    return []
  }
  const out = []
  for (let i = 0; i < arr.length; i++) {
    const raw = arr[i]
    let candidate = raw
    if (raw && typeof raw === 'object' && raw.id != null && typeof raw.id !== 'string') {
      candidate = { ...raw, id: String(raw.id) }
    }
    const r = combatantSchema.safeParse(candidate)
    if (r.success) out.push(r.data)
    else console.warn(`[validation] ${label}[${i}]:`, r.error.flatten())
  }
  return out
}

export function filterValidCharacterStateRows(rows) {
  if (!Array.isArray(rows)) return []
  return rows.filter((row, i) => {
    const r = characterStateRowSchema.safeParse(row)
    if (!r.success) {
      console.warn(`[validation] character_states[${i}]:`, r.error.flatten())
      return false
    }
    return true
  })
}

export function filterValidCharacterRows(rows) {
  if (!Array.isArray(rows)) return []
  return rows.filter((row, i) => {
    const r = dbCharacterRowSchema.safeParse(row)
    if (!r.success) {
      console.warn(`[validation] characters[${i}]:`, r.error.flatten())
      return false
    }
    return true
  })
}

export function filterValidSpellRows(rows) {
  if (!Array.isArray(rows)) return []
  return rows.filter((row, i) => {
    const r = spellRowSchema.safeParse(row)
    if (!r.success) {
      console.warn(`[validation] spells[${i}]:`, r.error.flatten())
      return false
    }
    return true
  })
}

export function filterValidBeatRows(rows) {
  if (!Array.isArray(rows)) return []
  return rows.filter((row, i) => {
    const r = beatRowSchema.safeParse(row)
    if (!r.success) {
      console.warn(`[validation] beats[${i}]:`, r.error.flatten())
      return false
    }
    return true
  })
}
