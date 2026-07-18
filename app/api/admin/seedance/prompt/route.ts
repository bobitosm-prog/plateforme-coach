import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { verifyAdmin, handleAdminAuthError } from '@/lib/admin/auth'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    await verifyAdmin(req)
  } catch (e) {
    return handleAdminAuthError(e)
  }

  const body = await req.json().catch(() => ({}))
  const exerciseName = typeof body.exerciseName === 'string' ? body.exerciseName.trim() : ''
  if (!exerciseName) {
    return NextResponse.json({ error: 'exerciseName requis' }, { status: 400 })
  }
  const muscleGroup = typeof body.muscleGroup === 'string' ? body.muscleGroup : ''
  const equipment = typeof body.equipment === 'string' ? body.equipment : ''

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'Missing ANTHROPIC_API_KEY' }, { status: 500 })
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const res = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    messages: [{
      role: 'user',
      content: `Tu écris un prompt en anglais pour un modèle de génération vidéo (Seedance) qui doit produire une démonstration d'un exercice de musculation.
Exercice : "${exerciseName}" (groupe musculaire : ${muscleGroup || 'non précisé'}, équipement : ${equipment || 'non précisé'}).
Le prompt doit décrire : un athlète réaliste exécutant UNE répétition lente et correcte du mouvement, salle de sport moderne épurée, éclairage neutre, plan qui montre bien la forme (angle de côté ou 3/4), fond simple, pas de texte à l'écran.
Réponds UNIQUEMENT avec le prompt en anglais, une seule ligne, sans guillemets ni préambule.`,
    }],
  })

  const text = res.content[0]?.type === 'text' ? res.content[0].text.trim() : ''
  if (!text) {
    return NextResponse.json({ error: 'Génération du prompt vide' }, { status: 502 })
  }
  return NextResponse.json({ prompt: text })
}
