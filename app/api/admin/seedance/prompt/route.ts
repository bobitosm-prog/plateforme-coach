import { NextResponse } from 'next/server'
import { verifyAdmin, handleAdminAuthError } from '@/lib/admin/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { generateSeedanceText } from '@/lib/seedance/anthropic'
import { resolveCorrelationId } from '@/lib/security/audit-log'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    await verifyAdmin(req)
  } catch (e) {
    return handleAdminAuthError(e)
  }

  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  const rl = checkRateLimit(`seedance-prompt:${ip}`, 15, 60_000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Trop de requêtes, réessaie dans une minute' }, { status: 429 })
  }

  const body = await req.json().catch(() => ({}))
  const exerciseName = typeof body.exerciseName === 'string' ? body.exerciseName.trim().slice(0, 200) : ''
  if (!exerciseName) {
    return NextResponse.json({ error: 'exerciseName requis' }, { status: 400 })
  }
  const muscleGroup = typeof body.muscleGroup === 'string' ? body.muscleGroup.slice(0, 100) : ''
  const equipment = typeof body.equipment === 'string' ? body.equipment.slice(0, 100) : ''

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'Missing ANTHROPIC_API_KEY' }, { status: 500 })
  }

  const generated = await generateSeedanceText({
    apiKey: process.env.ANTHROPIC_API_KEY,
    correlationId: resolveCorrelationId(req),
    maxTokens: 400,
    prompt: `Tu écris un prompt en anglais pour un modèle de génération vidéo (Seedance) qui doit produire une démonstration d'un exercice de musculation.
Exercice : "${exerciseName}" (groupe musculaire : ${muscleGroup || 'non précisé'}, équipement : ${equipment || 'non précisé'}).
Le prompt doit décrire : un athlète réaliste exécutant UNE répétition lente et correcte du mouvement, salle de sport moderne épurée, éclairage neutre, plan qui montre bien la forme (angle de côté ou 3/4), fond simple, pas de texte à l'écran.
Réponds UNIQUEMENT avec le prompt en anglais, une seule ligne, sans guillemets ni préambule.`,
    signal: req.signal,
  })
  if (!generated.ok) throw new Error('SEEDANCE_PROMPT_PROVIDER_FAILED')

  const text = generated.value.trim()
  if (!text) {
    return NextResponse.json({ error: 'Génération du prompt vide' }, { status: 502 })
  }
  return NextResponse.json({ prompt: text })
}
