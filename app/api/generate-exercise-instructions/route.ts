import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST() {
  // Auth check
  const cookieStore = await cookies()
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  if (!process.env.ANTHROPIC_API_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Missing ANTHROPIC_API_KEY or SUPABASE_SERVICE_ROLE_KEY' }, { status: 500 })
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { data: exercises } = await supabase
    .from('exercises_db')
    .select('id, name, muscle_group, equipment')
    .is('instructions', null)
    .limit(20)

  if (!exercises?.length) return NextResponse.json({ done: true, count: 0 })

  let processed = 0
  for (const ex of exercises) {
    try {
      const res = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: `Tu es un coach musculation expert. Pour l'exercice "${ex.name}" (groupe: ${ex.muscle_group || '?'}, équipement: ${ex.equipment || '?'}), donne en français :
1. EXÉCUTION : 3-4 phrases décrivant comment faire le mouvement correctement (position de départ, mouvement, retour)
2. CONSEILS : 2-3 conseils clés pour une bonne exécution (erreurs à éviter, respiration, tempo)

Réponds UNIQUEMENT en JSON :
{"instructions": "...", "tips": "..."}`,
        }],
      })

      const text = res.content[0].type === 'text' ? res.content[0].text : ''
      const clean = text.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean)
      await supabase.from('exercises_db').update({
        instructions: parsed.instructions,
        tips: parsed.tips,
      }).eq('id', ex.id)
      processed++
    } catch (e: any) {
      console.error('[generate-instructions] Failed for', ex.name, e.message)
    }
  }

  return NextResponse.json({ done: false, processed, remaining: exercises.length - processed })
}
