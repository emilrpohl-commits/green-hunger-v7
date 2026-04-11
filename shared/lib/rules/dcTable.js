/**
 * Single source of truth for standard DC ladder (SRD 5.2.1).
 */
import dcDoc from './catalog/dcTables.json'

export const DC_STANDARD_LADDER = dcDoc.standardLadder

/** @deprecated Use DC_STANDARD_LADDER — alias for quick rulings */
export const DC_TABLE = DC_STANDARD_LADDER

/**
 * @param {number} dc
 * @returns {{ id: string, label: string, dc: number, hint: string } | null}
 */
export function findNearestDcRow(dc) {
  const n = Number(dc)
  if (Number.isNaN(n)) return null
  let best = null
  let bestDist = Infinity
  for (const row of DC_STANDARD_LADDER) {
    const d = Math.abs(row.dc - n)
    if (d < bestDist) {
      bestDist = d
      best = row
    }
  }
  return best
}
