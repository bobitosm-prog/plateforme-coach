export type AggregationIssueCode =
  | 'empty_input'
  | 'invalid_date'
  | 'invalid_number'
  | 'missing_value'
  | 'incompatible_unit'
  | 'unknown_record_type'

export interface AggregationIssue {
  readonly code: AggregationIssueCode
  readonly path: string
}

export type AggregationResult<T> =
  | { readonly status: 'complete'; readonly value: T; readonly issues: readonly AggregationIssue[] }
  | { readonly status: 'partial'; readonly value: T; readonly issues: readonly AggregationIssue[] }
  | { readonly status: 'unavailable'; readonly value: null; readonly issues: readonly AggregationIssue[] }
  | { readonly status: 'invalid'; readonly value: null; readonly issues: readonly AggregationIssue[] }

export interface ProgressionClock {
  now(): Date
}

export function propagateAggregationFailure<T>(
  result: Exclude<AggregationResult<unknown>, { readonly status: 'complete' }>,
): AggregationResult<T> {
  return result.status === 'invalid'
    ? { status: 'invalid', value: null, issues: result.issues }
    : { status: 'unavailable', value: null, issues: result.issues }
}
