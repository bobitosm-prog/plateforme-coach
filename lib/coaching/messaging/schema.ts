import { z } from 'zod'

export const messageSchema = z.object({
  id: z.string().min(1), sender_id: z.string().uuid(), receiver_id: z.string().uuid(),
  content: z.string(), image_url: z.string().nullable(), read: z.boolean(),
  created_at: z.string().datetime({ offset: true }),
}).strict()

export const sendMessageSchema = z.object({ receiverId: z.string().uuid(), content: z.string(), imageUrl: z.string().nullable() }).strict()
