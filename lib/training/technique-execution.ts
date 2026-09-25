import {
  normalizeWorkoutDraftExercises,
  type WorkoutDraftExercise,
} from "./active-workout-draft";
import { bisetFor } from "./guided-techniques";

const MAX_WORKOUT_SETS = 10;

function canAppendToExercise(exercise: WorkoutDraftExercise): boolean {
  // FST-7 is exactly seven sets. A finished drop/mini-set cannot be moved
  // behind a newly inserted main set without rewriting recorded history.
  return exercise.targetSets < MAX_WORKOUT_SETS
    && exercise.technique !== "fst7"
    && !exercise.sets.some(set => set.parentSetNumber && set.done);
}

export function canAddWorkoutSet(exercises: readonly WorkoutDraftExercise[], index: number): boolean {
  const exercise = exercises[index];
  if (!exercise || !canAppendToExercise(exercise)) return false;
  if (exercise.technique === "superset") {
    const pair = bisetFor(exercises, index);
    return Boolean(pair && canAppendToExercise(exercises[pair.a]) && canAppendToExercise(exercises[pair.b]));
  }
  return true;
}

function appendSet(exercise: WorkoutDraftExercise): WorkoutDraftExercise {
  const mainCount = exercise.sets.filter(set => !set.parentSetNumber).length;
  const fresh = normalizeWorkoutDraftExercises([{ sets: 1, loadMode: exercise.loadMode ?? 'legacy' }])[0].sets[0];
  const extra = {
    ...fresh,
    num: mainCount + 1,
    ...(exercise.targetDurationSeconds ? { durationSeconds: '' as const } : {}),
  };
  const stages = exercise.sets.filter(set => set.parentSetNumber).map(set => ({
    ...set,
    num: set.num + 1,
    parentSetNumber: set.parentSetNumber! + 1,
  }));
  return {
    ...exercise,
    targetSets: exercise.targetSets + 1,
    sets: [...exercise.sets.filter(set => !set.parentSetNumber), extra, ...stages],
  };
}

/** An extra round on a biset adds one set to both members, preserving A/B order. */
export function addWorkoutSet(exercises: readonly WorkoutDraftExercise[], index: number): WorkoutDraftExercise[] | null {
  if (!canAddWorkoutSet(exercises, index)) return null;
  const pair = bisetFor(exercises, index);
  return exercises.map((exercise, exerciseIndex) =>
    exerciseIndex === index || (pair && (exerciseIndex === pair.a || exerciseIndex === pair.b))
      ? appendSet(exercise)
      : exercise,
  );
}

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
  const stage = normalizeWorkoutDraftExercises([{ sets: 1, loadMode: exercise.loadMode ?? 'legacy' }])[0].sets[0];
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
  const fresh = normalizeWorkoutDraftExercises([{ sets: 7, loadMode: exercise.loadMode ?? 'legacy' }])[0].sets;
  return {
    ...exercise,
    technique: "fst7",
    targetSets: 7,
    targetReps: "8-12",
    rest: 45,
    sets: fresh.map((set, index) => exercise.sets[index] ?? set),
  };
}
