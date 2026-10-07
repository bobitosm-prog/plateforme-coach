import {
  normalizeWorkoutDraftExercises,
  type WorkoutDraftExercise,
} from "./active-workout-draft";
import { expandLegSets } from "./unilateral-legs";
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
  if (exercise.sets.some(set => set.side)) {
    const mains = exercise.sets.filter(set => !set.parentSetNumber);
    const fresh = normalizeWorkoutDraftExercises([{ sets: 1, loadMode: exercise.loadMode ?? 'legacy' }])[0].sets;
    const pair = expandLegSets(fresh).map(set => ({ ...set, roundNumber: exercise.targetSets + 1 }));
    const result = [...mains];
    for (const main of pair) {
      result.push({ ...main, num: result.length + 1 });
      for (const stage of exercise.sets.filter(set => set.parentSetNumber && set.side === main.side)) {
        result.push({ ...stage, roundNumber: main.roundNumber, num: result.length + 1, parentSetNumber: result.length });
      }
    }
    // Existing main rows retain their IDs/values, with contiguous storage numbers.
    return { ...exercise, targetSets: exercise.targetSets + 1, sets: result.map((set, i) => ({ ...set, num: i + 1 })) };
  }
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
  if (exercise.sets.some(set => set.side)) {
    // Apply the explicit extra stage to each leg; remap parents by stable ID.
    const halves = (['left', 'right'] as const).map(side => {
      const rows = exercise.sets.filter(set => set.side === side);
      const numbers = new Map(rows.map((set, i) => [set.num, i + 1]));
      return addDropStage({ ...exercise, sets: rows.map((set, i) => ({ ...set, side: undefined, num: i + 1, parentSetNumber: set.parentSetNumber ? numbers.get(set.parentSetNumber) : undefined })) });
    });
    if (halves.some(half => half.sets.length === exercise.sets.filter(set => set.side === 'left').length)) return exercise;
    const combined = halves.flatMap((half, i) => half.sets.map(set => ({ ...set, side: (i ? 'right' : 'left') as 'left' | 'right', roundNumber: set.roundNumber ?? exercise.targetSets, parentId: set.parentSetNumber ? half.sets.find(parent => parent.num === set.parentSetNumber)?.id : undefined })));
    combined.sort((a, b) => a.roundNumber - b.roundNumber || (a.side === b.side ? a.num - b.num : a.side === 'left' ? -1 : 1));
    const numbers = new Map(combined.map((set, i) => [set.id, i + 1]));
    return { ...exercise, technique: 'dropset', techniqueDetails: halves[0].techniqueDetails, sets: combined.map(({parentId, ...set}, i) => ({ ...set, num: i + 1, parentSetNumber: parentId ? numbers.get(parentId) : undefined })) };
  }
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
    exercise.targetSets > 7 ||
    exercise.sets.some((set) => set.done || set.parentSetNumber)
  )
    return exercise;
  // Explicit preset; keep any entered loads, never invent them.
  let fresh = normalizeWorkoutDraftExercises([{ sets: 7, loadMode: exercise.loadMode ?? 'legacy' }])[0].sets;
  if (exercise.sets.some(set => set.side)) fresh = expandLegSets(fresh);
  return {
    ...exercise,
    technique: "fst7",
    targetSets: 7,
    targetReps: "8-12",
    rest: 45,
    sets: fresh.map((set, index) => exercise.sets[index] ?? set),
  };
}
