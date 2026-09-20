import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { timingSafeEqual } from 'node:crypto'
import { runWeeklyGeneration } from '@/lib/weekly-diagnostic/worker'
import { checkRateLimit } from '@/lib/rate-limit'

export const maxDuration = 60
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ code: 'unavailable' }, { status: 503 })
  const expected = Buffer.from(`Bearer ${secret}`)
  const received = Buffer.from(req.headers.get('authorization') ?? '')
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return NextResponse.json({ code: 'unauthorized' }, { status: 401 })
  if (!checkRateLimit('weekly-worker', 2, 60000).allowed) return NextResponse.json({ code: 'rate_limit' }, { status: 429 })
  try {
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const result = await runWeeklyGeneration(db)
    return NextResponse.json(result, { status: result.errors ? 503 : 200 })
  } catch { return NextResponse.json({ code: 'generation_supervision_unavailable' }, { status: 503 }) }
}
