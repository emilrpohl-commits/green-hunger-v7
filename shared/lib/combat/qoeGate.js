const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {}

/**
 * QoE polish is intentionally gated and should only be enabled after
 * reliability milestones are consistently passing.
 */
export const combatQoePolishEnabled = !!env.VITE_COMBAT_QOE_POLISH
