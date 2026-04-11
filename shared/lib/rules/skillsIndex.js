/**
 * SRD skill list → ability mapping.
 */
import skillsDoc from './catalog/skillsIndex.json'

const byName = new Map()
const byIndex = new Map()
for (const s of skillsDoc.skills) {
  byName.set(s.name.toLowerCase(), s)
  byIndex.set(s.index, s)
}

export const SKILLS_LIST = skillsDoc.skills

/**
 * @param {string} nameOrIndex
 * @returns {{ index: string, name: string, ability: string } | null}
 */
export function lookupSkill(nameOrIndex) {
  const raw = String(nameOrIndex || '').trim()
  if (!raw) return null
  const byIdx = byIndex.get(raw.toLowerCase().replace(/\s+/g, '-'))
  if (byIdx) return byIdx
  return byName.get(raw.toLowerCase()) || null
}

/**
 * @param {string} abilityKey str|dex|con|int|wis|cha
 * @returns {typeof SKILLS_LIST}
 */
export function skillsForAbility(abilityKey) {
  const k = String(abilityKey || '').toLowerCase().slice(0, 3)
  return SKILLS_LIST.filter((s) => s.ability === k)
}
