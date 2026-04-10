/**
 * Phase 2C: Resolve DB `encounters.participants` + stat block rows into enemies[] for startEncounter.
 * participants: [{ stat_block_id, count?, initiative?, role? }]
 */

/**
 * @param {Array<{ stat_block_id?: string, count?: number, initiative?: number, role?: string }>} participants
 * @param {Record<string, Record<string, unknown>>} statBlockById - map uuid -> stat_blocks row
 * @returns {Array<{ id: string, name: string, ac: number, maxHp: number, initiative: number, type: string, kind: string }>}
 */
export function expandEncounterParticipantsToEnemies(participants, statBlockById) {
  const enemies = []
  const list = Array.isArray(participants) ? participants : []
  for (const p of list) {
    const sbId = p.stat_block_id
    if (!sbId) continue
    const sb = statBlockById[sbId]
    if (!sb) continue
    const slug = sb.slug || sbId
    const count = Math.max(1, Number(p.count) || 1)
    const nameBase = sb.name || slug
    const ac = Number(sb.ac) || 10
    const maxHp = Number(sb.max_hp ?? sb.maxHp) || 10
    const initiative = typeof p.initiative === 'number' ? p.initiative : 0
    const kind = p.role || 'enemy'
    for (let i = 0; i < count; i++) {
      enemies.push({
        id: slug,
        name: nameBase,
        ac,
        maxHp,
        initiative,
        type: 'enemy',
        kind,
      })
    }
  }
  return enemies
}

/**
 * Find first encounter whose participants reference a stat block with the given slug.
 * @param {Array<Record<string, unknown>>} encounters
 * @param {string} statBlockSlug
 * @param {Record<string, Record<string, unknown>>} statBlockById
 */
export function findEncounterByStatBlockSlug(encounters, statBlockSlug, statBlockById) {
  if (!statBlockSlug || !Array.isArray(encounters)) return null
  for (const enc of encounters) {
    const parts = enc.participants
    if (!Array.isArray(parts)) continue
    for (const p of parts) {
      const sb = statBlockById[p.stat_block_id]
      if (sb && sb.slug === statBlockSlug) return enc
    }
  }
  return null
}
