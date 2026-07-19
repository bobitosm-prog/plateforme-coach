export type ProgressSectionId = 'poids' | 'records' | 'photos' | 'mensurations' | 'bienetre' | 'graphiques'

export interface ProgressRecordView {
  readonly name: string
  readonly maxWeight?: number | null
  readonly oneRm?: number | null
  readonly unit?: string
  readonly date?: string
}

export interface ProgressMeasurementView {
  readonly waist?: number | null
  readonly chest?: number | null
  readonly left_arm?: number | null
  readonly left_thigh?: number | null
}

export interface WellnessCheckinView {
  readonly date: string
  readonly mood?: string | null
  readonly sleep_hours?: number | null
  readonly note?: string | null
}
