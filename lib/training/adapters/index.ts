export { adaptAiGeneratedProgram, adaptClientAssignment, adaptCoachTemplate, adaptCustomProgram, adaptImportedProgram } from './programs'
export { adaptCompletionMarker, adaptPersonalRecord, adaptScheduledSession, adaptWorkoutHistory } from './history'
export type {
  AdapterContext,
  AdapterResult,
  AdapterWarning,
  AssignedProgram,
  LegacyCompletionMarker,
  LegacyFormatId,
  PersonalRecord,
  ScheduledTrainingSession,
  SessionExecution,
  TrainingProgram,
} from '../model'
export { CORE_LEGACY_FORMATS } from '../model'
