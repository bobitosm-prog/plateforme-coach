import type { CoachAppointment } from '@/lib/coaching/calendar'
import type { CoachClientRow } from '@/lib/coaching/dashboard'

export type ClientRow = CoachClientRow
export type ScheduledSession = CoachAppointment
export const SESSION_TYPES = ['Force', 'Cardio', 'HIIT', 'Mobilité', 'Récupération']
export const SESSION_COLORS: Record<string, string> = { Force: '#D4A843', Cardio: '#E8C97A', HIIT: '#D4A843', Mobilité: '#8A8070', Récupération: '#F5EDD8' }
export const STATUS_META = {
  active: { label: 'Actif', cls: 'badge-active' }, warning: { label: 'À relancer', cls: 'badge-warning' }, inactive: { label: 'Inactif', cls: 'badge-inactive' },
}
export const WP_MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']
export const WP_YEARS = ['2025','2026','2027','2028']
export const WP_DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'))
export const WP_HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
export const WP_MINS = ['00','05','10','15','20','25','30','35','40','45','50','55']
export const WP_ITEM_H = 44
export function getWeekDays(offsetWeeks = 0): Date[] {
  const today = new Date(); const dow = today.getDay(); const monday = new Date(today)
  monday.setDate(today.getDate() + (dow === 0 ? -6 : 1 - dow) + offsetWeeks * 7); monday.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, i) => { const d = new Date(monday); d.setDate(monday.getDate() + i); return d })
}
export function initials(name: string | null | undefined) {
  if (!name) return '?'; const parts = name.trim().split(' ')
  return parts.length >= 2 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : name.slice(0, 2).toUpperCase()
}
export function statusFor(createdAt: string): 'active' | 'warning' | 'inactive' {
  const days = (Date.now() - new Date(createdAt).getTime()) / 86400000
  return days < 30 ? 'active' : days < 60 ? 'warning' : 'inactive'
}
