/**
 * Map a reference_spells row (from Supabase) → spells table payload for campaign copy.
 * spell_id must be globally unique (see spells_spell_id_unique).
 */

function inferResolutionType(ref) {
  if (ref.attack_type) return 'attack'
  if (ref.save_ability) return 'save'
  return 'utility'
}

/**
 * @param {string} campaignId uuid
 * @param {Record<string, unknown>} ref — reference_spells row
 */
export function makeCampaignSpellId(campaignId, ref) {
  const short = String(campaignId || '').replace(/-/g, '').slice(0, 12)
  const rs = String(ref.ruleset || 'srd').replace(/[^a-z0-9]/gi, '')
  const idx = String(ref.source_index || ref.name || 'spell').replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '')
  return `cpy_${short}_${rs}_${idx}`.toLowerCase()
}

/**
 * @param {Record<string, unknown>} ref
 * @param {string} campaignId
 * @returns {Record<string, unknown>}
 */
export function referenceSpellRowToCampaignPayload(ref, campaignId) {
  const spell_id = makeCampaignSpellId(campaignId, ref)
  return {
    spell_id,
    campaign_id: campaignId,
    name: ref.name,
    level: ref.level ?? 0,
    school: ref.school,
    casting_time: ref.casting_time,
    range: ref.range,
    components: ref.components || { V: false, S: false, M: null },
    duration: ref.duration,
    ritual: !!ref.ritual,
    concentration: !!ref.concentration,
    description: ref.description || '',
    higher_level_effect: ref.higher_level || null,
    damage_dice: ref.damage_dice || null,
    damage_type: ref.damage_type || null,
    save_type: ref.save_ability || null,
    save_ability: ref.save_ability || null,
    attack_type: ref.attack_type || null,
    resolution_type: inferResolutionType(ref),
    target_mode: 'special',
    ruleset: ref.ruleset || '2014',
    source_index: ref.source_index,
    source_url: ref.source_url,
    source: 'SRD reference library',
    classes: ref.classes || null,
    rules_json: {
      cloned_from_reference_spell_id: ref.id,
      source_index: ref.source_index,
      ruleset: ref.ruleset,
    },
    imported_at: new Date().toISOString(),
  }
}
