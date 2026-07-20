import { AI_MODEL_REGISTRY } from './registry'
import type { AiCapabilityState, AiModelDefinition, AiModelResolution, AiModelRegistryResult } from './types'

const MODEL_IDENTIFIER = /^[A-Za-z0-9._:/-]+$/

export function listAiModels(): readonly Readonly<AiModelDefinition>[] {
  return AI_MODEL_REGISTRY
}

export function getAiModel(logicalId: string): Readonly<AiModelDefinition> | null {
  if (!isValidIdentifier(logicalId)) return null
  return AI_MODEL_REGISTRY.find(model => model.logicalId === logicalId) ?? null
}

export function resolveAiModel(identifier: string, registry: AiModelRegistryResult = { ok: true, models: AI_MODEL_REGISTRY }): AiModelResolution {
  if (!isValidIdentifier(identifier)) return { ok: false, reason: 'invalid_identifier' }
  if (!registry.ok) return { ok: false, reason: 'unknown_model' }
  const logical = registry.models.find(model => model.logicalId === identifier)
  if (logical) return { ok: true, model: logical, matchedBy: 'logical_id' }
  const provider = registry.models.find(model => model.providerModelId === identifier)
  return provider ? { ok: true, model: provider, matchedBy: 'provider_id' } : { ok: false, reason: 'unknown_model' }
}

export function getAiModelCapability(identifier: string, capability: keyof AiModelDefinition['capabilities']): AiCapabilityState | null {
  const resolved = resolveAiModel(identifier)
  return resolved.ok ? resolved.model.capabilities[capability] : null
}

function isValidIdentifier(value: string): boolean {
  return value.length > 0 && value.length <= 256 && MODEL_IDENTIFIER.test(value)
}
