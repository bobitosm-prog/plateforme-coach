import type {
  AdapterContext,
  AdapterResult,
  AdapterWarning,
  AssignedProgram,
  LegacyFormatId,
  TrainingProgram,
  TrainingSource,
} from '../model'
import { convertDays, isRecord, unknownKeys, unsupported, WEEKDAYS_FR } from './shared'

function source(format: LegacyFormatId, context: AdapterContext, kind: TrainingSource['kind'], provider?: string): TrainingSource {
  const createdBy = context.owner.kind === 'coach'
    ? { kind: 'coach' as const, id: context.owner.coachId }
    : context.owner.kind === 'client'
      ? { kind: 'client' as const, id: context.owner.clientId }
      : { kind: 'platform' as const }
  return { kind, createdBy, provider, legacyFormat: format, createdAt: context.now }
}

function programFromDays(
  raw: Record<string, unknown>,
  days: unknown[],
  format: LegacyFormatId,
  context: AdapterContext,
  kind: TrainingProgram['kind'],
  sourceKind: TrainingSource['kind'],
  provider?: string,
  weekdays?: number[],
): AdapterResult<TrainingProgram> {
  const warnings: AdapterWarning[] = []
  const converted = convertDays(days, format, context.id, warnings, context.clientId, weekdays)
  if (!converted.week) return unsupported(format, converted.error ?? 'Jours invalides', context.sourceId)
  const name = context.name
    ?? (typeof raw.name === 'string' ? raw.name : undefined)
    ?? (typeof raw.program_name === 'string' ? raw.program_name : undefined)
  if (!name) return unsupported(format, 'Nom de programme absent', context.sourceId)
  const unmappedFields = unknownKeys(raw, [
    'id', 'name', 'program_name', 'description', 'days', 'program', 'split', 'duration', 'tags', 'source',
    'created_at', 'updated_at', 'is_template', 'is_active', 'total_weeks', 'current_week', 'phases', 'scheduled', 'start_date',
  ])
  for (const field of ['split', 'duration', 'total_weeks', 'current_week', 'phases', 'scheduled', 'start_date']) {
    if (raw[field] !== undefined && raw[field] !== null && !unmappedFields.includes(field)) unmappedFields.push(field)
  }
  unmappedFields.sort()
  for (const field of unmappedFields) {
    warnings.push({ code: 'unmapped_field', path: field, detail: 'Champ racine conservé seulement dans la source legacy' })
  }
  return {
    status: 'converted',
    legacyFormat: format,
    value: {
      id: context.id,
      formatVersion: 1,
      revision: 1,
      owner: context.owner,
      source: source(format, context, sourceKind, provider),
      kind,
      name,
      description: context.description ?? (typeof raw.description === 'string' ? raw.description : undefined),
      tags: Array.isArray(raw.tags) ? raw.tags.filter((tag): tag is string => typeof tag === 'string') : [],
      status: raw.is_active === true ? 'active' : 'draft',
      weeks: [converted.week],
      createdAt: typeof raw.created_at === 'string' ? raw.created_at : context.now,
      updatedAt: typeof raw.updated_at === 'string' ? raw.updated_at : context.now,
    },
    warnings,
    unmappedFields,
  }
}

export function adaptCoachTemplate(input: unknown, context: AdapterContext): AdapterResult<TrainingProgram> {
  const format = 'coach-template-envelope-v1' as const
  if (context.owner.kind !== 'coach') return unsupported(format, 'Owner coach explicite requis', context.sourceId)
  if (!isRecord(input) || !isRecord(input.program) || !Array.isArray(input.program.days)) {
    return unsupported(format, 'Enveloppe training_programs.program attendue', context.sourceId)
  }
  return programFromDays({ ...input, ...input.program }, input.program.days, format, context, 'template', 'catalog-template')
}

export function adaptCustomProgram(input: unknown, context: AdapterContext): AdapterResult<TrainingProgram> {
  const format = 'custom-program-days-v1' as const
  if (context.owner.kind !== 'client') return unsupported(format, 'Owner client explicite requis', context.sourceId)
  if (!isRecord(input) || !Array.isArray(input.days)) return unsupported(format, 'custom_programs.days doit être un tableau', context.sourceId)
  return programFromDays(input, input.days, format, context, 'personal', input.source === 'ai' ? 'ai' : 'manual', input.source === 'ai' ? 'anthropic' : undefined)
}

export function adaptAiGeneratedProgram(input: unknown, context: AdapterContext): AdapterResult<TrainingProgram> {
  const format = 'ai-generated-program-v1' as const
  if (context.owner.kind !== 'client') return unsupported(format, 'Owner client explicite requis', context.sourceId)
  if (!isRecord(input) || !Array.isArray(input.days) || typeof input.program_name !== 'string') {
    return unsupported(format, 'Sortie IA { program_name, days } attendue', context.sourceId)
  }
  return programFromDays(input, input.days, format, context, 'personal', 'ai', 'anthropic')
}

export function adaptClientAssignment(input: unknown, context: AdapterContext): AdapterResult<AssignedProgram> {
  if (!isRecord(input) || !context.clientId) {
    return unsupported('client-program-days-v1', 'Affectation ou clientId absent', context.sourceId)
  }
  const rawProgram = input.program
  let format: 'client-program-days-v1' | 'client-program-weekdays-fr-v1'
  let days: unknown[]
  let weekdayIndexes: number[] | undefined
  if (Array.isArray(rawProgram)) {
    format = 'client-program-days-v1'
    days = rawProgram
  } else if (isRecord(rawProgram)) {
    const present = WEEKDAYS_FR.filter(day => Object.hasOwn(rawProgram, day))
    const unknown = Object.keys(rawProgram).filter(key => !WEEKDAYS_FR.includes(key as typeof WEEKDAYS_FR[number]))
    if (present.length === 0 || unknown.length > 0) {
      return unsupported('client-program-weekdays-fr-v1', `Clés hebdomadaires inconnues: ${unknown.join(', ') || 'aucune clé reconnue'}`, context.sourceId)
    }
    format = 'client-program-weekdays-fr-v1'
    days = present.map(day => rawProgram[day])
    weekdayIndexes = present.map(day => WEEKDAYS_FR.indexOf(day))
  } else {
    return unsupported('client-program-days-v1', 'client_programs.program doit être un tableau ou objet hebdomadaire', context.sourceId)
  }
  const program = programFromDays(
    input,
    days,
    format,
    { ...context, id: context.sourceProgramId ?? `${context.id}:snapshot`, name: context.name ?? (typeof input.program_name === 'string' ? input.program_name : 'Programme assigné') },
    'personal',
    'legacy',
    undefined,
    weekdayIndexes,
  )
  if (program.status !== 'converted') return program
  const coachId = context.coachId ?? (typeof input.coach_id === 'string' ? input.coach_id : undefined)
  const warnings = [...program.warnings]
  if (!context.sourceProgramId && typeof input.training_program_id !== 'string') {
    warnings.push({ code: 'unresolved_reference', path: 'training_program_id', detail: 'Aucun template source résolu' })
  }
  return {
    status: 'converted',
    legacyFormat: format,
    value: {
      id: context.id,
      formatVersion: 1,
      clientId: context.clientId,
      assignedBy: coachId ? { kind: 'coach', coachId } : { kind: 'client', clientId: context.clientId },
      sourceProgramId: context.sourceProgramId ?? (typeof input.training_program_id === 'string' ? input.training_program_id : program.value.id),
      sourceRevision: 1,
      programSnapshot: program.value,
      status: 'active',
      startsOn: typeof input.week_start === 'string' ? input.week_start : undefined,
      timezone: context.timezone ?? 'UTC',
      createdAt: typeof input.created_at === 'string' ? input.created_at : context.now,
    },
    warnings,
    unmappedFields: program.unmappedFields,
  }
}

export function adaptImportedProgram(
  input: unknown,
  context: AdapterContext,
  provider: 'moovx-xlsx' | 'strong' | 'hevy',
): AdapterResult<TrainingProgram> {
  const format = provider === 'moovx-xlsx' ? 'moovx-xlsx-v1' : 'strong-hevy-csv-v1'
  if (context.owner.kind !== 'client') return unsupported(format, 'Owner client explicite requis', context.sourceId)
  if (!isRecord(input) || !Array.isArray(input.days)) return unsupported(format, 'Import normalisé avec days[] attendu', context.sourceId)
  const result = programFromDays(input, input.days, format, context, 'personal', 'import', provider)
  if (result.status === 'converted' && provider !== 'moovx-xlsx') {
    result.warnings.push({ code: 'lossy_import', path: 'days', detail: 'Les lignes par série ont été agrégées; charges et répétitions individuelles ne sont pas restituables' })
  }
  return result
}
