import type useClientDetail from '../../hooks/useClientDetail'

export type ClientDetailState = ReturnType<typeof useClientDetail>

export interface ClientProgramTemplate {
  id: string
  name: string
  program: unknown
}
