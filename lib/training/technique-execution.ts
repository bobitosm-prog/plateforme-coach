import {
  normalizeWorkoutDraftExercises,
  type WorkoutDraftExercise,
} from "./active-workout-draft";

/** Explicit user action only. Never invent a working load or discard logged sets. */
export function addDropStage(
  exercise: WorkoutDraftExercise,
): WorkoutDraftExercise {
  if (
    exercise.targetDurationSeconds ||
    (exercise.technique && exercise.technique !== "dropset") ||
    !exercise.sets.length ||
    exercise.sets.filter((set) => set.parentSetNumber).length >= 3
  )
    return exercise;
  const parent = exercise.sets.at(-1)!;
  const stage = normalizeWorkoutDraftExercises([{ sets: 1 }])[0].sets[0];
  return {
    ...exercise,
    technique: "dropset",
    techniqueDetails: String(exercise.sets.filter(set => set.parentSetNumber).length + 1),
    sets: [
      ...exercise.sets,
      { ...stage, num: parent.num + 1, parentSetNumber: parent.num },
    ],
  };
}

export function configureFst7(
  exercise: WorkoutDraftExercise,
): WorkoutDraftExercise {
  if (
    exercise.targetDurationSeconds ||
    exercise.sets.length > 7 ||
    exercise.sets.some((set) => set.done || set.parentSetNumber)
  )
    return exercise;
  // Explicit preset; keep any entered loads, never invent them.
  const fresh = normalizeWorkoutDraftExercises([{ sets: 7 }])[0].sets;
  return {
    ...exercise,
    technique: "fst7",
    targetSets: 7,
    targetReps: "8-12",
    rest: 45,
    sets: fresh.map((set, index) => exercise.sets[index] ?? set),
  };
}
