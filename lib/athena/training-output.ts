import { z } from 'zod'
import type { NormalizedAthenaTrainingRequest } from './training-policy'
import { isTimedHold } from '../training/exercise-measurement'

const MUSCLE_GROUP_IDS = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps', 'quads',
  'hamstrings', 'glutes', 'calves', 'core', 'abs',
] as const

const techniqueSchema = z.enum(['dropset', 'restpause', 'superset', 'mechanical', 'fst7']).nullable()

const exerciseSchema = z.object({
  custom_name: z.string().trim().min(1).max(120),
  muscle_primary: z.string().trim().min(1).max(80),
  sets: z.number().int().min(1).max(7),
  reps: z.number().int().min(0).max(30),
  duration_seconds: z.number().int().min(5).max(180).nullable().optional(),
  rest_seconds: z.number().int().min(30).max(300),
  order: z.number().int().min(1).max(10),
  tempo: z.string().regex(/^\d-\d-\d$/),
  technique: techniqueSchema,
  technique_details: z.string().max(160),
}).superRefine((exercise, context) => {
  if(exercise.technique==='fst7' ? exercise.sets!==7 || exercise.reps<8 || exercise.reps>12 || exercise.rest_seconds>45 || exercise.duration_seconds!=null : exercise.sets>4) {
    context.addIssue({code:'custom',path:['sets'],message:'FST-7 : 7 séries, 8–12 répétitions, repos 30–45 s ; sinon 1–4 séries.'})
  }
  if (exercise.duration_seconds != null ? exercise.reps !== 0 : exercise.reps < 1 || isTimedHold(exercise.custom_name)) {
    context.addIssue({ code: 'custom', path: ['duration_seconds'], message: 'Maintien statique : durée obligatoire et reps=0 ; sinon répétitions positives.' })
  }
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
  options?: {allowAdvancedTechniques:boolean},
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
      if(exercise.technique && options?.allowAdvancedTechniques===false) reasons.push(issue(`days.${dayIndex}.exercises.${exerciseIndex}.technique`,'techniques désactivées'))
      if(exercise.technique==='fst7' && (options?.allowAdvancedTechniques!==true || request.level!=='avance' || exerciseIndex!==day.exercises.length-1)) reasons.push(issue(`days.${dayIndex}.exercises.${exerciseIndex}.technique`,'FST-7 réservé à une proposition avancée explicitement autorisée en fin de séance'))
      if(exercise.technique && !exercise.technique_details.trim()) reasons.push(issue(`days.${dayIndex}.exercises.${exerciseIndex}.technique_details`,'consignes explicites requises'))
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
