/** Static holds only: dynamic plank variants still use repetitions. */
export function isTimedHold(name: string): boolean {
  const normalized = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
  return /^(planche|plank|side plank|gainage|wall sit|chaise)(\b|$)/.test(normalized)
    && !/dynamique|dynamic|tap|touche|up.down|montee|rotation|jacks/.test(normalized)
}

export function prescribedDuration(row: Record<string, unknown>): number | undefined {
  const explicit = Number(row.targetDurationSeconds ?? row.duration_seconds)
  if (Number.isInteger(explicit) && explicit > 0 && explicit <= 600) return explicit
  // Legacy holds never convert their erroneous repetition count into seconds.
  // A conservative default prescription is used only for future sets.
  const name = String(row.name ?? row.exercise_name ?? row.custom_name ?? '')
  return isTimedHold(name) ? 30 : undefined
}
