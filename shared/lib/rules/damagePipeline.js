/**
 * Apply damage type vs resistance / vulnerability / immunity (SRD-style).
 */

const DMG_IDS = new Set([
  'acid', 'bludgeoning', 'cold', 'fire', 'force', 'lightning', 'necrotic',
  'piercing', 'poison', 'psychic', 'radiant', 'slashing', 'thunder',
])

/** Sorted ids for damage-type dropdowns (manual HP adjustment, etc.). */
export const DAMAGE_TYPE_PIPELINE_IDS = [...DMG_IDS].sort()

function labelDamageTypeId(id) {
  if (!id) return ''
  return id.charAt(0).toUpperCase() + id.slice(1)
}

/** Options for `<select>`: value is canonical id, label is Title Case. */
export const DAMAGE_TYPE_SELECT_OPTIONS = [
  { value: '', label: 'Untyped' },
  ...DAMAGE_TYPE_PIPELINE_IDS.map((id) => ({ value: id, label: labelDamageTypeId(id) })),
]

/**
 * @param {string | null | undefined} raw
 * @returns {string | null} normalized id or null
 */
export function normalizeDamageTypeId(raw) {
  if (raw == null || raw === '') return null
  const s = String(raw).trim().toLowerCase()
  if (!s) return null
  const compact = s.replace(/\s+/g, '')
  for (const id of DMG_IDS) {
    if (id === s || id === compact) return id
  }
  const spaced = s.replace(/[-_]/g, ' ')
  for (const id of DMG_IDS) {
    if (id.replace(/[-_]/g, ' ') === spaced) return id
  }
  return null
}

/**
 * Map free-text / legacy strings to a pipeline id, or null if unknown / untyped.
 * @param {string | null | undefined} raw
 * @returns {string | null}
 */
export function coerceDamageTypeForPipeline(raw) {
  return normalizeDamageTypeId(raw)
}

function normList(arr) {
  if (!Array.isArray(arr)) return []
  const out = new Set()
  for (const x of arr) {
    const id = normalizeDamageTypeId(x)
    if (id) out.add(id)
    if (String(x).toLowerCase().includes('nonmagical') || String(x).toLowerCase().includes('non-magical')) {
      out.add('nonmagical_bypass_note')
    }
  }
  return out
}

/**
 * @param {number} amount
 * @param {string | null | undefined} damageType
 * @param {{ resistances?: string[], vulnerabilities?: string[], immunities?: string[] }} target
 * @returns {{ final: number, factors: { kind: string, detail?: string }[] }}
 */
export function applyDamageWithTraits(amount, damageType, target = {}) {
  const n = Math.max(0, Math.floor(Number(amount) || 0))
  const factors = []
  const typeId = normalizeDamageTypeId(damageType)

  const imm = normList(target.immunities || [])
  const res = normList(target.resistances || [])
  const vuln = normList(target.vulnerabilities || [])

  if (typeId && imm.has(typeId)) {
    factors.push({ kind: 'immunity', detail: typeId })
    return { final: 0, factors }
  }

  let x = n
  if (typeId && res.has(typeId)) {
    const half = Math.floor(x / 2)
    factors.push({ kind: 'resistance', detail: typeId })
    x = half
  }
  if (typeId && vuln.has(typeId)) {
    factors.push({ kind: 'vulnerability', detail: typeId })
    x = x * 2
  }

  return { final: Math.max(0, x), factors }
}

/**
 * @param {unknown} damageField
 * @returns {string | null}
 */
export function primaryDamageTypeFromAction(damageField) {
  if (!Array.isArray(damageField) || damageField.length === 0) return null
  const first = damageField[0]
  if (first && typeof first === 'object' && first.type != null) {
    return normalizeDamageTypeId(first.type)
  }
  return null
}
