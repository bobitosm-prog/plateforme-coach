import { handleAppleNotification } from '@/lib/apple/notification-handler'

export const runtime = 'nodejs'
export async function POST(request: Request, context: { params: Promise<{ environment: string }> }) {
  return handleAppleNotification(request, (await context.params).environment)
}
