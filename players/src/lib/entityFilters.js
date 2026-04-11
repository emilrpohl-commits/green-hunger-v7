/** @typedef {'all'|'action'|'bonus_action'|'reaction'|'passive'|'limited'|'concentration'|'attack'|'utility'} EntityFilter */

export const ENTITY_FILTER_LABELS = [
  { id: 'all', label: 'All' },
  { id: 'action', label: 'Action' },
  { id: 'bonus_action', label: 'Bonus' },
  { id: 'reaction', label: 'Reaction' },
  { id: 'passive', label: 'Passive' },
  { id: 'limited', label: 'Limited' },
  { id: 'concentration', label: 'Conc.' },
  { id: 'attack', label: 'Attack' },
  { id: 'utility', label: 'Utility' },
]

/**
 * @param {EntityFilter} filter
 * @param {Set<string>} tags
 */
export function matchesEntityFilter(filter, tags) {
  if (!filter || filter === 'all') return true
  return tags.has(filter)
}

export function spellToFilterTags(spell) {
  const tags = new Set()
  const at = spell.actionType || 'action'
  if (at === 'bonus_action') tags.add('bonus_action')
  else if (at === 'reaction') tags.add('reaction')
  else if (at === 'action') tags.add('action')
  else tags.add('utility')

  if (spell.concentration) tags.add('concentration')
  if (spell.mechanic === 'attack') tags.add('attack')
  if (['utility', 'heal', 'control'].includes(spell.mechanic) && spell.mechanic !== 'attack') tags.add('utility')
  if (spell.mechanic === 'heal') tags.add('utility')
  return tags
}

export function weaponToFilterTags() {
  return new Set(['action', 'attack'])
}

export function healingActionToFilterTags(ha) {
  const tags = new Set(['utility'])
  const a = String(ha.action || '').toLowerCase()
  if (a.includes('bonus')) tags.add('bonus_action')
  else tags.add('action')
  if (ha.slotLevel) tags.add('limited')
  return tags
}

export function buffActionToFilterTags() {
  return new Set(['bonus_action', 'limited'])
}

export function featureToFilterTags(f) {
  const tags = new Set()
  const uses = String(f.uses || '').toLowerCase()
  if (!f.uses || uses === 'passive' || uses === '—' || uses === '-') {
    tags.add('passive')
  } else {
    tags.add('limited')
  }
  const desc = String(f.description || '').toLowerCase()
  if (desc.includes('bonus action')) tags.add('bonus_action')
  if (desc.includes('reaction')) tags.add('reaction')
  if (desc.includes('action') && !tags.has('bonus_action')) tags.add('action')
  if (tags.size === 1 && tags.has('limited')) tags.add('action')
  return tags
}
