import { z } from 'zod'
import type { NormalizedAthenaTrainingRequest } from './training-policy'

const MUSCLE_GROUP_IDS = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps', 'quads',
  'hamstrings', 'glutes', 'calves', 'core', 'abs',
] as const

const techniqueSchema = z.enum(['dropset', 'restpause', 'superset', 'mechanical']).nullable()

const exerciseSchema = z.object({
  custom_name: z.string().trim().min(1).max(120),
  muscle_primary: z.string().trim().min(1).max(80),
  sets: z.number().int().min(1).max(4),
  reps: z.number().int().min(1).max(30),
  rest_seconds: z.number().int().min(30).max(300),
  order: z.number().int().min(1).max(10),
  tempo: z.string().regex(/^\d-\d-\d$/),
  technique: techniqueSchema,
  technique_details: z.string().max(160),
})

const daySchema = z.object({
  day_number: z.number().int().min(1).max(6),
  name: z.string().trim().min(1).max(120),
  focus: z.string().trim().min(1).max(160),
  muscle_groups: z.array(z.enum(MUSCLE_GROUP_IDS)).min(1).max(8),
  exercises: z.array(exerciseSchema),
})

const programSchema = z.object({
  program_name: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(1000),
  days: z.array(daySchema),
})

export type ValidatedAthenaProgram = z.infer<typeof programSchema>

export class AthenaTrainingOutputError extends Error {
  constructor(public readonly reasons: readonly string[]) {
    super('Programme généré non conforme au contrat Athena')
    this.name = 'AthenaTrainingOutputError'
  }
}

function issue(path: string, message: string): string {
  return `${path}: ${message}`
}

export function validateAthenaTrainingOutput(
  value: unknown,
  request: NormalizedAthenaTrainingRequest,
): ValidatedAthenaProgram {
  const parsed = programSchema.safeParse(value)
  if (!parsed.success) {
    throw new AthenaTrainingOutputError(parsed.error.issues.map(item => issue(item.path.join('.'), item.message)))
  }

  const reasons: string[] = []
  if (parsed.data.days.length !== request.daysPerWeek) {
    reasons.push(issue('days', `attendu ${request.daysPerWeek}, reçu ${parsed.data.days.length}`))
  }

  const dayNumbers = new Set<number>()
  for (const [dayIndex, day] of parsed.data.days.entries()) {
    if (dayNumbers.has(day.day_number)) reasons.push(issue(`days.${dayIndex}.day_number`, 'dupliqué'))
    dayNumbers.add(day.day_number)
    if (day.day_number !== dayIndex + 1) reasons.push(issue(`days.${dayIndex}.day_number`, `attendu ${dayIndex + 1}`))
    if (
      day.exercises.length < request.exercisesPerSession.min
      || day.exercises.length > request.exercisesPerSession.max
    ) {
      reasons.push(issue(
        `days.${dayIndex}.exercises`,
        `attendu ${request.exercisesPerSession.min}-${request.exercisesPerSession.max}, reçu ${day.exercises.length}`,
      ))
    }

    const names = new Set<string>()
    let advancedTechniques = 0
    for (const [exerciseIndex, exercise] of day.exercises.entries()) {
      if (exercise.order !== exerciseIndex + 1) {
        reasons.push(issue(`days.${dayIndex}.exercises.${exerciseIndex}.order`, `attendu ${exerciseIndex + 1}`))
      }
      const normalizedName = exercise.custom_name.toLocaleLowerCase('fr')
      if (names.has(normalizedName)) {
        reasons.push(issue(`days.${dayIndex}.exercises.${exerciseIndex}.custom_name`, 'exercice dupliqué dans la séance'))
      }
      names.add(normalizedName)
      if (exercise.technique) advancedTechniques++
      if (!exercise.technique && exercise.technique_details.trim()) {
        reasons.push(issue(`days.${dayIndex}.exercises.${exerciseIndex}.technique_details`, 'doit être vide sans technique'))
      }
    }

    const maximumTechniques = request.level === 'debutant' ? 0 : request.level === 'intermediaire' ? 1 : 2
    if (advancedTechniques > maximumTechniques) {
      reasons.push(issue(`days.${dayIndex}.exercises`, `maximum ${maximumTechniques} technique(s) avancée(s)`))
    }
  }

  if (reasons.length) throw new AthenaTrainingOutputError(reasons)
  return parsed.data
}
