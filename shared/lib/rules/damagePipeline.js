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

/**
 * @typedef {{ amount: number, type?: string|null }} DamageComponentInput
 */

/**
 * Apply R/V/I per damage component, then sum. Untyped components pass through unchanged
 * (when pipeline enabled) but are labeled for feeds.
 *
 * @param {DamageComponentInput[]} components
 * @param {{ resistances?: string[], vulnerabilities?: string[], immunities?: string[] }} target
 * @param {{ usePipeline?: boolean }} [opts]
 * @returns {{
 *   totalFinal: number,
 *   lines: { raw: number, typeId: string|null, final: number, factors: { kind: string, detail?: string }[] }[]
 * }}
 */
export function applyDamageComponentsBundle(components, target = {}, opts = {}) {
  const usePipeline = opts.usePipeline !== false
  const list = Array.isArray(components) ? components : []
  /** @type {{ raw: number, typeId: string|null, final: number, factors: { kind: string, detail?: string }[] }[]} */
  const lines = []
  let totalFinal = 0

  for (const c of list) {
    const raw = Math.max(0, Math.floor(Number(c?.amount) || 0))
    if (raw <= 0) continue
    const typeId = c?.type != null && c.type !== '' ? coerceDamageTypeForPipeline(String(c.type)) : null

    if (!usePipeline) {
      lines.push({ raw, typeId, final: raw, factors: [] })
      totalFinal += raw
      continue
    }

    if (!typeId) {
      lines.push({ raw, typeId: null, final: raw, factors: [{ kind: 'untyped', detail: undefined }] })
      totalFinal += raw
      continue
    }

    const applied = applyDamageWithTraits(raw, typeId, target)
    lines.push({ raw, typeId, final: applied.final, factors: applied.factors })
    totalFinal += applied.final
  }

  return { totalFinal, lines }
}

function labelDamageTypeForFeed(typeId) {
  if (!typeId) return 'Untyped'
  return typeId.charAt(0).toUpperCase() + typeId.slice(1)
}

/**
 * Human-readable lines for combat feed (e.g. "Resistant to Fire: 11 → 5").
 * @param {{ raw: number, typeId: string|null, final: number, factors: { kind: string, detail?: string }[] }[]} lines
 */
export function formatDamageBundleLinesForFeed(lines) {
  if (!Array.isArray(lines) || !lines.length) return ''
  const parts = []
  for (const line of lines) {
    if (!line.typeId) {
      const isExplicitUntyped = line.factors?.some((f) => f.kind === 'untyped')
      parts.push(isExplicitUntyped ? `Untyped damage: ${line.raw}` : `${line.raw}`)
      continue
    }
    const label = labelDamageTypeForFeed(line.typeId)
    if (!line.factors.length) {
      parts.push(`${label}: ${line.final}`)
      continue
    }
    for (const f of line.factors) {
      const d = f.detail || line.typeId
      if (f.kind === 'immunity') {
        parts.push(`Immune to ${labelDamageTypeForFeed(d)}: ${line.raw} → 0`)
      } else if (f.kind === 'resistance') {
        parts.push(`Resistant to ${labelDamageTypeForFeed(d)}: ${line.raw} → ${line.final}`)
      } else if (f.kind === 'vulnerability') {
        parts.push(`Vulnerable to ${labelDamageTypeForFeed(d)}: ${line.raw} → ${line.final}`)
      } else if (f.kind === 'untyped') {
        parts.push(`Untyped damage: ${line.raw}`)
      }
    }
  }
  return parts.join('; ')
}
