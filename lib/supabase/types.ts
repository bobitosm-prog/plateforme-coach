export type {
  Database,
  Enums,
  Json,
  Tables,
  TablesInsert,
  TablesUpdate,
} from './database.types'

import type { Database } from './database.types'
import type { SupabaseClient } from '@supabase/supabase-js'

export type DatabaseClient = SupabaseClient<Database>
export type BrowserSupabaseClient = DatabaseClient
export type ServerSupabaseClient = DatabaseClient
export type AdminSupabaseClient = DatabaseClient

type PublicSchema = Database['public']

export type Views<Name extends keyof PublicSchema['Views']> = PublicSchema['Views'][Name]['Row']
export type FunctionArgs<Name extends keyof PublicSchema['Functions']> = PublicSchema['Functions'][Name]['Args']
export type FunctionReturns<Name extends keyof PublicSchema['Functions']> = PublicSchema['Functions'][Name]['Returns']

export type ProfileRow = PublicSchema['Tables']['profiles']['Row']
export type ActiveRelatedProfileRow = PublicSchema['Views']['active_related_profiles']['Row']
