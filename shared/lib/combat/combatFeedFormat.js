import { formatDamageBundleLinesForFeed } from '@shared/lib/rules/damagePipeline.js'

/**
 * @param {string} baseMessage
 * @param {{ raw: number, typeId: string|null, final: number, factors: { kind: string, detail?: string }[] }[]|null|undefined} bundleLines
 */
export function appendDamagePipelineDetail(baseMessage, bundleLines) {
  if (!bundleLines?.length) return baseMessage
  const detail = formatDamageBundleLinesForFeed(bundleLines)
  if (!detail) return baseMessage
  return `${baseMessage} — ${detail}`
}
