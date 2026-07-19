import type { Dispatch, SetStateAction } from 'react'
import type useCoachDashboard from '../../hooks/useCoachDashboard'

export type CoachDashboardState = ReturnType<typeof useCoachDashboard>
export type CoachSection = CoachDashboardState['section']
export type CoachTranslator = (key: string, values?: Record<string, string | number>) => string

export type CoachPageLayoutProps = {
  h: CoachDashboardState
  ct: CoachTranslator
  isMobile: boolean
  revMonth: number
  setRevMonth: Dispatch<SetStateAction<number>>
  revYear: number
  setRevYear: Dispatch<SetStateAction<number>>
  inviteEmail: string
  setInviteEmail: Dispatch<SetStateAction<string>>
  inviteSending: boolean
  inviteSent: boolean
  createdInvitationId: string | null
  sendInviteEmail(): Promise<void>
  revokeCreatedInvitation(): Promise<void>
  clientSearch: string
  setClientSearch: Dispatch<SetStateAction<string>>
  hoveredNav: string | null
  setHoveredNav: Dispatch<SetStateAction<string | null>>
}
