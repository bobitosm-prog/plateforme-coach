import type { AiFeature, AiQuotaPolicy } from './types'

const HOUR = 3_600_000
const THIRTY_DAYS = 2_592_000_000
const hourly: Partial<Record<AiFeature, number>> = {
  'generate-custom-program': 5,
  'analyze-progress-photo': 10,
  'generate-meal-plan': 10,
  'analyze-body': 5,
  'suggest-exercise': 20,
  'analyze-meal-photo': 15,
  'chat-ai': 20,
}
const heavy = new Set<AiFeature>(['generate-meal-plan', 'generate-custom-program', 'analyze-progress-photo', 'analyze-body'])
const loggedWithoutQuota = new Set<AiFeature>(['weekly-diagnostic'])

export function getAiQuotaPolicy(feature: AiFeature): AiQuotaPolicy {
  const hourlyLimit = hourly[feature]
  const tracking = hourlyLimit !== undefined ? 'quota' : loggedWithoutQuota.has(feature) ? 'logged' : 'untracked'
  return Object.freeze({
    id: `ai.${feature}.v1`, feature, tracking,
    ...(hourlyLimit === undefined ? {} : { hourly: { kind: 'hourly' as const, limit: hourlyLimit, windowMs: HOUR } }),
    ...(heavy.has(feature) ? { monthlyHeavy: { kind: 'rolling_30_days' as const, limit: 6, windowMs: THIRTY_DAYS } } : {}),
  })
}
