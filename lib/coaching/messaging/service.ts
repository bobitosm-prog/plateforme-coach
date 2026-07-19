import { sendMessageSchema } from './schema'
import type { MessagingRepository } from './repository'
import type { MessagingResult, NotificationPort } from './types'

export function createMessagingService(repository: MessagingRepository, notify: NotificationPort) {
  return {
    async send(input: { receiverId: string; content: string; imageUrl: string | null; title: string; url: '/' | '/coach' }): Promise<MessagingResult<void>> {
      const valid = sendMessageSchema.safeParse({ receiverId: input.receiverId, content: input.content, imageUrl: input.imageUrl })
      if (!valid.success || (!valid.data.content.trim() && !valid.data.imageUrl)) return { ok: false, error: { kind: 'invalid', contextCode: 'MESSAGE_INVALID' } }
      const sent = await repository.send(valid.data.receiverId, valid.data.content.trim(), valid.data.imageUrl)
      if (!sent.ok) return sent
      await notify({ userId: valid.data.receiverId, title: input.title, body: valid.data.imageUrl ? '📷 Photo' : valid.data.content.trim().slice(0, 80), url: input.url }).catch(() => undefined)
      return { ok: true, data: undefined }
    },
  }
}
