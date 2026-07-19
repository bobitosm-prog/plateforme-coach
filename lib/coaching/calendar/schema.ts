import { z } from 'zod'

const datePattern = /^\d{4}-\d{2}-\d{2}$/
const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/

export const appointmentInputSchema = z.object({
  clientUserId: z.string().uuid(),
  localDate: z.string().regex(datePattern),
  startTime: z.string().regex(timePattern),
  endTime: z.string().regex(timePattern),
  timeZone: z.string().trim().min(1).max(100),
  sessionType: z.string().trim().min(1).max(80),
  location: z.string().trim().max(500).nullable(),
  notes: z.string().trim().max(2000).nullable(),
}).strict()

export type AppointmentInput = z.infer<typeof appointmentInputSchema>

export const calendarPeriodSchema = z.object({
  startInclusive: z.string().datetime({ offset: true }),
  endInclusive: z.string().datetime({ offset: true }),
}).strict()
