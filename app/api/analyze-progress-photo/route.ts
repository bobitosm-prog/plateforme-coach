import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const apiKey = (process.env.ANTHROPIC_API_KEY || '').trim()
    if (!apiKey) return NextResponse.json({ error: 'API key manquante' }, { status: 500 })

    const { photoUrl, profileData, previousPhotoUrl } = await req.json()
    if (!photoUrl) return NextResponse.json({ error: 'Photo URL manquante' }, { status: 400 })

    const p = profileData || {}

    // Fetch photo as base64 with detailed error handling
    const fetchImage = async (url: string): Promise<{ base64: string; mediaType: string }> => {
      let res: Response
      try {
        res = await fetch(url)
      } catch (fetchErr: any) {
        console.error('[analyze-progress-photo] Fetch image failed:', fetchErr.message, 'URL:', url.slice(0, 120))
        throw new Error(`Impossible de télécharger l'image: ${fetchErr.message}`)
      }

      if (!res.ok) {
        console.error('[analyze-progress-photo] Image fetch HTTP error:', res.status, res.statusText, 'URL:', url.slice(0, 120))
        throw new Error(`Erreur HTTP ${res.status} lors du téléchargement de l'image`)
      }

      const buffer = await res.arrayBuffer()
      if (buffer.byteLength === 0) {
        console.error('[analyze-progress-photo] Empty image buffer')
        throw new Error('Image vide reçue')
      }

      const base64 = Buffer.from(buffer).toString('base64')
      const contentType = res.headers.get('content-type') || 'image/jpeg'
      const mediaType = contentType.split(';')[0].trim()

      console.log(`[analyze-progress-photo] Image fetched: ${(buffer.byteLength / 1024).toFixed(0)}KB, type: ${mediaType}`)
      return { base64, mediaType }
    }

    let mainImage: { base64: string; mediaType: string }
    try {
      mainImage = await fetchImage(photoUrl)
    } catch (imgErr: any) {
      return NextResponse.json({ error: imgErr.message }, { status: 500 })
    }

    // ── System prompt ──
    const systemPrompt = `Tu es un coach fitness expert en analyse visuelle de composition corporelle,
avec 20 ans d'expérience en musculation, powerlifting et transformation physique.

Tu as la capacité d'estimer visuellement :
- Le taux de graisse corporelle approximatif (±3-5%)
- La masse musculaire visible et les groupes musculaires développés
- La morphologie (ectomorphe, mésomorphe, endomorphe)
- Les déséquilibres musculaires visibles

RÈGLES ABSOLUES :
1. La PHOTO est ta source de vérité principale — ce que tu vois prime sur tout
2. L'IMC est un indicateur secondaire BIAISÉ — un athlète musclé peut avoir un IMC de 30+ tout en ayant 12% de graisse. Tu DOIS croiser l'IMC avec ce que tu vois.
3. Si body_fat n'est pas fourni → ESTIME-LE visuellement depuis la photo
4. Ne jamais conclure à l'obésité sur la seule base de l'IMC
5. Sois direct et précis — une analyse vague est inutile
6. Toujours croiser : photo + IMC + objectif + bilan calorique + tendance poids
7. Si tu détectes une incohérence entre l'objectif et la réalité → dis-le clairement
8. Tu ne fais jamais de commentaires blessants mais tu es honnête
9. Réponds UNIQUEMENT en français`

    // ── Compute derived values ──
    const currentWeight = parseFloat(p.current_weight) || 0
    const height = parseFloat(p.height) || 0
    const bmi = height > 0 ? currentWeight / ((height / 100) ** 2) : 0
    const tdee = parseFloat(p.tdee) || 0
    const calorieGoal = parseFloat(p.calorie_goal) || 0
    const surplusDeficit = tdee > 0 && calorieGoal > 0 ? calorieGoal - tdee : null
    const proteinGoal = parseFloat(p.protein_goal) || 0

    // Coherence flags
    const coherenceFlags: string[] = []
    if (p.objective?.includes('masse') && surplusDeficit !== null && surplusDeficit < -100) {
      coherenceFlags.push(`⚠️ Objectif prise de masse MAIS déficit calorique de ${surplusDeficit} kcal — incohérent`)
    }
    if (p.objective?.includes('perte') && surplusDeficit !== null && surplusDeficit > 200) {
      coherenceFlags.push(`⚠️ Objectif perte de poids MAIS surplus calorique de +${surplusDeficit} kcal — incohérent`)
    }
    if (currentWeight > 0 && proteinGoal > 0 && proteinGoal / currentWeight < 1.4) {
      coherenceFlags.push(`⚠️ Protéines faibles : ${proteinGoal}g/jour = ${(proteinGoal / currentWeight).toFixed(1)}g/kg (recommandé : ≥1.6g/kg)`)
    }
    if (p.weight_trend === 'gaining' && p.objective?.includes('perte')) {
      coherenceFlags.push(`⚠️ Objectif perte de poids MAIS tendance +${p.weight_delta_30d}kg sur 30j`)
    }

    // Surplus/deficit label
    let surplusLabel = ''
    if (surplusDeficit !== null) {
      if (surplusDeficit > 200) surplusLabel = 'surplus — favorise la prise de masse/graisse'
      else if (surplusDeficit < -200) surplusLabel = 'déficit — favorise la perte de poids'
      else surplusLabel = 'maintenance — poids stable'
    }

    // Weight trend label
    let weightTrendLabel = 'Poids stable'
    if (p.weight_trend === 'gaining') weightTrendLabel = `Prise de poids (+${p.weight_delta_30d}kg)`
    else if (p.weight_trend === 'losing') weightTrendLabel = `Perte de poids (${p.weight_delta_30d}kg)`

    // ── Build user prompt ──
    const userPrompt = `Analyse cette photo de progression fitness pour ${p.full_name || 'le client'}.

=== CE QUE TU VOIS ===
Regarde attentivement la photo et estime :
- Taux de graisse approximatif (visuellement)
- Groupes musculaires les plus développés
- Zones à améliorer
- Morphologie dominante
${p.body_fat ? `(Taux de graisse mesuré déclaré : ${p.body_fat}% — à confirmer visuellement)` : '(Aucun taux de graisse déclaré — base-toi uniquement sur la photo)'}

=== DONNÉES BIOMÉTRIQUES ===
Genre: ${p.gender || '?'}
Poids: ${currentWeight || '?'}kg | Taille: ${height || '?'}cm
IMC: ${bmi > 0 ? bmi.toFixed(1) : '?'} — IMPORTANT: cet IMC peut être normal pour un athlète musclé, croise-le OBLIGATOIREMENT avec ce que tu vois dans la photo
${p.waist ? `Tour de taille: ${p.waist}cm` : ''}

=== PROGRAMME ACTUEL ===
Objectif déclaré: ${p.objective || 'non défini'}
Calories: ${calorieGoal || '?'} kcal/jour (TDEE estimé: ${tdee || '?'} kcal)
${surplusDeficit !== null ? `Bilan calorique: ${surplusDeficit > 0 ? '+' : ''}${surplusDeficit} kcal (${surplusLabel})` : ''}
Macros: P${proteinGoal || '?'}g / G${p.carbs_goal || '?'}g / L${p.fat_goal || '?'}g
Activité: ${p.activity_level || '?'}

=== PROGRESSION 30 JOURS ===
Tendance: ${weightTrendLabel}
Score de forme: ${p.fitness_score || '?'}/100 (niveau: ${p.fitness_level || '?'})

${coherenceFlags.length > 0 ? `=== ALERTES DÉTECTÉES ===\n${coherenceFlags.join('\n')}\n` : ''}
${p.last_analysis ? `=== ANALYSE PRÉCÉDENTE (pour cohérence) ===\n${p.last_analysis.substring(0, 300)}...\n` : ''}
Donne une analyse structurée en 5 parties :

1. 👁 ANALYSE VISUELLE
   - Estime le taux de graisse corporelle en % (ex: "environ 18-22%")
   - Décris la morphologie dominante
   - Identifie les 2-3 groupes musculaires les plus développés
   - Identifie les 1-2 zones les plus à développer
   Sois précis et concret — pas de généralités.

2. ⚖️ COHÉRENCE PROGRAMME
   Croise TOUT : ce que tu vois + IMC (${bmi > 0 ? bmi.toFixed(1) : '?'}) + objectif (${p.objective || '?'}) + bilan calorique + tendance poids.

   Exemples de raisonnement attendu :
   - "Tu vises la prise de masse mais je vois ~22% de graisse et tu es en déficit calorique de 300 kcal → impossible de prendre du muscle ainsi. Recommandation : passe en léger surplus de +200 kcal."
   - "Ton IMC de 28 n'est pas problématique — je vois une musculature dorsale et pectorale bien développée. Continue la prise de masse."
   - "Tu vises la perte de poids, ton poids baisse de 0.8kg/mois, et je vois une réduction visible au niveau abdominal. Programme cohérent !"

   Si tout est cohérent → dis-le et explique pourquoi.
   Si incohérence → sois direct et propose l'ajustement précis.

3. ✅ POINTS POSITIFS
   2-3 éléments encourageants observables dans la photo (pas de généralités — cite des zones musculaires ou des métriques réelles)

4. 🎯 AXES DE PROGRESSION
   2 conseils hyper-concrets basés sur l'analyse visuelle ET les données :
   - Ex: "Tes épaules sont peu développées par rapport à ta poitrine → ajoute 2 séries de raises latéraux 3x/semaine"
   - Ex: "Avec 20% de graisse estimé et objectif prise de masse → vise une recomposition corporelle : +150 kcal au-dessus du TDEE avec 2.2g de protéines/kg"

5. 🚀 RECOMMANDATION PRIORITAIRE
   1 action immédiate, chiffrée et spécifique.
   Pas "mange mieux" → "Augmente tes protéines de ${proteinGoal || '?'}g à ${currentWeight > 0 ? Math.round(currentWeight * 2.2) : '?'}g/jour (2.2g/kg)"
   Pas "fais plus de sport" → "Ajoute une séance de [groupe musculaire] par semaine en priorité"

Maximum 400 mots. Sois un vrai coach, pas un chatbot générique.`

    // ── Build content array ──
    let content: any[]

    if (previousPhotoUrl) {
      let prevImage: { base64: string; mediaType: string }
      try {
        prevImage = await fetchImage(previousPhotoUrl)
      } catch (imgErr: any) {
        console.error('[analyze-progress-photo] Previous photo fetch failed, continuing without comparison')
        prevImage = null as any
      }

      if (prevImage) {
        content = [
          { type: 'image', source: { type: 'base64', media_type: prevImage.mediaType, data: prevImage.base64 } },
          { type: 'image', source: { type: 'base64', media_type: mainImage.mediaType, data: mainImage.base64 } },
          { type: 'text', text: userPrompt.replace('Analyse cette photo', 'Compare ces deux photos de progression (avant → après)') },
        ]
      } else {
        content = [
          { type: 'image', source: { type: 'base64', media_type: mainImage.mediaType, data: mainImage.base64 } },
          { type: 'text', text: userPrompt },
        ]
      }
    } else {
      content = [
        { type: 'image', source: { type: 'base64', media_type: mainImage.mediaType, data: mainImage.base64 } },
        { type: 'text', text: userPrompt },
      ]
    }

    console.log('[analyze-progress-photo] Calling Claude API...')
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content }],
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('[analyze-progress-photo] Claude API error:', res.status, err.slice(0, 300))
      return NextResponse.json({ error: `Erreur IA (${res.status})` }, { status: res.status })
    }

    const data = await res.json()
    const analysis = data.content?.[0]?.text || 'Impossible de générer l\'analyse.'

    console.log('[analyze-progress-photo] Analysis complete')
    return NextResponse.json({ analysis })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erreur inattendue'
    console.error('[analyze-progress-photo] Unhandled error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
