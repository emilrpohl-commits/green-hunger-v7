import { DC_STANDARD_LADDER, findNearestDcRow } from './dcTable.js'

/**
 * Prefer an exact ladder row for `dc`, else nearest (per `findNearestDcRow`).
 * @param {number | string | null | undefined} dc
 * @returns {{ dc: number | null, label: string | null, row: { dc: number, label: string } | null }}
 */
export function dcWithLabel(dc) {
  const n = Number(dc)
  if (Number.isNaN(n)) return { dc: null, label: null, row: null }
  const exact = DC_STANDARD_LADDER.find((r) => r.dc === n)
  const row = exact || findNearestDcRow(n)
  return {
    dc: n,
    label: row?.label ?? null,
    row: row ?? null,
  }
}

/**
 * @param {number | string | null | undefined} dc
 * @returns {string}
 */
export function formatDcWithLabel(dc) {
  const { dc: n, label } = dcWithLabel(dc)
  if (n == null) return ''
  return label ? `DC ${n} (${label})` : `DC ${n}`
}
