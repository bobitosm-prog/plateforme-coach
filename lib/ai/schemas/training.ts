import { z } from 'zod'

const shortText = z.string().trim().min(1).max(500)
const nonNegative = z.number().finite().nonnegative()

export const exerciseSuggestionSchema = z.object({
  name: shortText,
  muscles: shortText,
  reason: z.string().trim().min(1).max(5_000),
  difficulty: shortText,
}).strict()
export const exerciseSuggestionsOutputSchema = z.array(exerciseSuggestionSchema).length(3)

export const exerciseInstructionsOutputSchema = z.object({
  instructions: z.string().trim().min(1).max(10_000),
  tips: z.string().trim().min(1).max(10_000),
}).strict()

export const adaptedWorkoutExerciseSchema = z.object({
  name: shortText,
  sets: z.number().int().positive(),
  reps: z.union([z.number().int().positive(), z.string().trim().min(1).max(100)]),
  rest_seconds: nonNegative,
  priority: z.enum(['haute', 'moyenne']),
  kept: z.boolean(),
}).strict()
export const adaptedWorkoutOutputSchema = z.array(adaptedWorkoutExerciseSchema).max(100)

export const overloadSuggestionOutputSchema = z.object({
  weight: z.number().finite().positive(),
  reps: z.number().int().positive(),
  reasoning: z.string().trim().min(1).max(5_000),
}).strict()

const legacyProgramExerciseSchema = z.object({
  name: shortText,
  sets: z.number().int().positive().optional(),
  reps: z.union([z.number().int().positive(), z.string().trim().min(1).max(100)]).optional(),
  rest: z.union([nonNegative, z.string().trim().min(1).max(100)]).optional(),
  rest_seconds: nonNegative.optional(),
  tempo: z.string().max(100).optional(),
}).passthrough()
const legacyProgramDaySchema = z.object({
  isRest: z.boolean(),
  day_name: z.string().max(300).optional(),
  exercises: z.array(legacyProgramExerciseSchema).max(100),
}).strict()
const legacyWeekdaySchema = z.enum(['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'])
export const legacyTrainingProgramOutputSchema = z.partialRecord(legacyWeekdaySchema, legacyProgramDaySchema)
  .refine(program => Object.keys(program).length > 0)

const modernProgramExerciseSchema = z.object({
  custom_name: shortText,
  muscle_primary: shortText,
  sets: z.number().int().positive(),
  reps: z.union([z.number().int().positive(), z.string().trim().min(1).max(100)]),
  rest_seconds: nonNegative,
  order: z.number().int().nonnegative(),
  tempo: z.string().max(100).nullable().optional(),
  technique: z.string().max(200).nullable().optional(),
  technique_details: z.string().max(2_000).nullable().optional(),
}).strict()
const modernProgramDaySchema = z.object({
  day_number: z.number().int().positive(),
  name: shortText,
  focus: shortText,
  muscle_groups: z.array(shortText).max(30),
  exercises: z.array(modernProgramExerciseSchema).max(100),
}).strict()
export const modernTrainingProgramOutputSchema = z.object({
  program_name: shortText,
  description: z.string().max(5_000),
  days: z.array(modernProgramDaySchema).min(1).max(31),
}).strict()

export type ExerciseSuggestionsOutput = z.infer<typeof exerciseSuggestionsOutputSchema>
export type ExerciseInstructionsOutput = z.infer<typeof exerciseInstructionsOutputSchema>
export type AdaptedWorkoutOutput = z.infer<typeof adaptedWorkoutOutputSchema>
export type OverloadSuggestionOutput = z.infer<typeof overloadSuggestionOutputSchema>
export type LegacyTrainingProgramOutput = z.infer<typeof legacyTrainingProgramOutputSchema>
export type ModernTrainingProgramOutput = z.infer<typeof modernTrainingProgramOutputSchema>
