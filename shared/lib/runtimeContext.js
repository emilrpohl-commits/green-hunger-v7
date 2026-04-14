import { featureFlags } from './featureFlags.js'

const DEFAULT_SESSION_RUN_ID = 'session-1'

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function getSessionRunId() {
  if (canUseStorage()) {
    const stored = window.localStorage.getItem('gh.session_run_id')
    if (stored && String(stored).trim()) return String(stored).trim()
  }
  return DEFAULT_SESSION_RUN_ID
}

export function setSessionRunId(value) {
  const normalized = String(value || '').trim()
  if (!normalized || !canUseStorage()) return DEFAULT_SESSION_RUN_ID
  window.localStorage.setItem('gh.session_run_id', normalized)
  return normalized
}

export function getRulesetContext() {
  if (canUseStorage()) {
    try {
      const raw = window.localStorage.getItem('gh.ruleset_context')
      if (raw) return JSON.parse(raw)
    } catch {}
  }
  return {
    active_ruleset: '2024',
    fallback_allowed: true,
    source_of_truth: 'canonical',
    rulesDamagePipeline: featureFlags.rulesDamagePipeline,
    use5eEngine: featureFlags.use5eEngine,
    engineConditions: featureFlags.engineConditions,
  }
}

export function setRulesetContext(context = {}) {
  const normalized = {
    active_ruleset: ['2024', '2014', 'custom'].includes(context.active_ruleset) ? context.active_ruleset : '2024',
    fallback_allowed: Boolean(context.fallback_allowed),
    source_of_truth: context.source_of_truth || 'canonical',
    rulesDamagePipeline: context.rulesDamagePipeline == null ? featureFlags.rulesDamagePipeline : Boolean(context.rulesDamagePipeline),
    use5eEngine: context.use5eEngine == null ? featureFlags.use5eEngine : Boolean(context.use5eEngine),
    engineConditions: context.engineConditions == null ? featureFlags.engineConditions : Boolean(context.engineConditions),
  }
  if (canUseStorage()) {
    window.localStorage.setItem('gh.ruleset_context', JSON.stringify(normalized))
  }
  return normalized
}

