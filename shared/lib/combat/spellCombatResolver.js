/**
 * Side-effect helpers for spell casting (concentration, feed). Keeps hooks thin.
 */

/**
 * @param {{
 *   spell: Record<string, unknown>,
 *   characterId: string,
 *   canEditState: boolean,
 *   concentration: boolean,
 *   concentrationSpell: string,
 *   charName: string,
 *   setMyCharacterConcentration: (id: string, active: boolean, name?: string|null) => Promise<unknown>,
 *   pushRoll: (text: string, charName: string) => Promise<unknown>,
 *   confirmReplaceConcentration?: (prev: string, next: string) => boolean,
 * }} ctx
 */
export async function applySpellConcentrationAfterCast(ctx) {
  const {
    spell, characterId, canEditState, concentration, concentrationSpell, charName,
    setMyCharacterConcentration, pushRoll, confirmReplaceConcentration,
  } = ctx
  if (!spell?.concentration || !canEditState) return
  const prev = String(concentrationSpell || '').trim()
  if (concentration && prev && prev !== spell.name) {
    if (typeof confirmReplaceConcentration === 'function') {
      const ok = confirmReplaceConcentration(prev, String(spell.name || ''))
      if (!ok) return { cancelled: true }
    }
    await setMyCharacterConcentration(characterId, false, null)
    await pushRoll(`Concentration: replaces «${prev}» with «${spell.name}»`, charName)
  }
  await setMyCharacterConcentration(characterId, true, spell.name)
  return { cancelled: false }
}
