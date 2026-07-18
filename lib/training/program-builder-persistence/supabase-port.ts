import type { BuilderRecord, PortResult, ProgramBuilderPersistencePort } from './types'

interface SupabaseClientLike {
  from(table: string): FluentQuery
}

interface QueryResponse { data?: unknown; error?: unknown | null }
interface FluentQuery extends PromiseLike<QueryResponse> {
  select(columns?: string): FluentQuery
  order(column: string): FluentQuery
  limit(count: number): FluentQuery
  eq(column: string, value: unknown): FluentQuery
  gte(column: string, value: unknown): FluentQuery
  lte(column: string, value: unknown): FluentQuery
  ilike(column: string, value: string): FluentQuery
  neq(column: string, value: unknown): FluentQuery
  single(): FluentQuery
  maybeSingle(): FluentQuery
  insert(payload: object | object[]): FluentQuery
  update(payload: object): FluentQuery
  delete(): FluentQuery
}

const normalize = <T>(result: QueryResponse, fallback: T): PortResult<T> => ({
  data: (result.data ?? fallback) as T,
  error: result.error ?? null,
})

export function createProgramBuilderSupabasePort(client: SupabaseClientLike): ProgramBuilderPersistencePort {
  return {
    async listCatalogExercises() {
      return normalize(await client.from('exercises_db').select('id, name, muscle_group').order('name').limit(200), [])
    },
    async listCustomExercises(ownerUserId) {
      return normalize(await client.from('custom_exercises').select('*').eq('user_id', ownerUserId).order('name'), [])
    },
    async findProfileGender(ownerUserId) {
      return normalize(await client.from('profiles').select('gender').eq('id', ownerUserId).single(), null)
    },
    async createCustomExercise(payload) {
      return normalize(await client.from('custom_exercises').insert(payload).select().single(), null)
    },
    async updateProgram(programId, payload) {
      return normalize(await client.from('custom_programs').update(payload).eq('id', programId), null)
    },
    async createProgram(payload) {
      return normalize(await client.from('custom_programs').insert(payload), null)
    },
    async deletePendingSchedule(ownerUserId, from, to) {
      return normalize(await client.from('scheduled_sessions').delete().eq('user_id', ownerUserId).gte('scheduled_date', from).lte('scheduled_date', to).eq('completed', false), null)
    },
    async createScheduledSessions(payload) {
      return normalize(await client.from('scheduled_sessions').insert(payload), null)
    },
    async findVariantGroup(exerciseName) {
      return normalize(await client.from('exercises_db').select('variant_group').ilike('name', exerciseName).limit(1).maybeSingle(), null)
    },
    async listSimilarExercises(baseName, exerciseName) {
      return normalize(await client.from('exercises_db').select('name, equipment, muscle_group').ilike('name', `%${baseName}%`).neq('name', exerciseName).limit(8), [])
    },
    async listVariantExercises(group, exerciseName) {
      return normalize(await client.from('exercises_db').select('name, equipment, muscle_group').eq('variant_group', group).neq('name', exerciseName).order('equipment').limit(10), [])
    },
  }
}

export type { BuilderRecord }
