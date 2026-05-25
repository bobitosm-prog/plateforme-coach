// scripts/backfill-exercise-i18n.mjs
// Usage:
//   node scripts/backfill-exercise-i18n.mjs           # dry-run, writes translations-backfill.json
//   node scripts/backfill-exercise-i18n.mjs --apply   # UPDATE DB
//   node scripts/backfill-exercise-i18n.mjs --resume  # skip exos that already have name_en

import dotenv from 'dotenv'; dotenv.config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import fs from 'node:fs/promises'

const APPLY = process.argv.includes('--apply')
const RESUME = process.argv.includes('--resume')
const FROM_FILE = process.argv.includes('--from-file')
const BATCH_SIZE = 25
const OUTPUT_FILE = 'translations-backfill.json'
const MODEL = 'claude-opus-4-7'

// --- Init clients ---
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// --- Fetch exos to translate ---
async function fetchExercises() {
  let query = supabase.from('exercises_db')
    .select('id, name, description, tips, name_en, description_en, tips_en')
    .order('name')

  if (RESUME) {
    query = query.is('name_en', null)
  }

  const { data, error } = await query
  if (error) throw new Error(`Fetch exos: ${error.message}`)
  return data
}

// --- Translate batch via Claude ---
async function translateBatch(exos, batchIdx, totalBatches) {
  console.log(`[batch ${batchIdx + 1}/${totalBatches}] translating ${exos.length} exos...`)

  const prompt = `Tu es un traducteur expert specialise fitness/musculation. Traduis cet array d'exercices du francais vers l'anglais ET l'allemand.

EXIGENCES :
1. Preserve la precision technique (vocabulaire fitness : reps, sets, tempo, contraction, etc.)
2. Style : direct, premium, ton brand "Whoop/Strava" (pas familier, pas marketing)
3. Pas de litteralisme : traduis l'INTENTION technique
4. Si une partie est vide (null/empty), laisse vide

EXEMPLES BRAND :
- "Developpe couche" -> EN: "Bench press" / DE: "Bankdrucken"
- "Tractions" -> EN: "Pull-ups" / DE: "Klimmzuge"
- "Squat barre" -> EN: "Barbell squat" / DE: "Langhantel-Kniebeuge"
- "Allonge sur un banc" -> EN: "Lying on a bench" / DE: "Auf einer Bank liegend"

DONNEES A TRADUIRE (JSON array) :
${JSON.stringify(exos.map(e => ({ id: e.id, name: e.name, description: e.description, tips: e.tips })), null, 2)}

RETOURNE STRICTEMENT un JSON array de cette forme (1 entree par exo, meme ordre, memes IDs) :
[
  {
    "id": "uuid-exo-1",
    "name_en": "...", "name_de": "...",
    "description_en": "...", "description_de": "...",
    "tips_en": "...", "tips_de": "..."
  },
  ...
]

Si un champ source est null/vide, renvoie "" dans la traduction. Aucun texte en dehors du JSON.`

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 16000,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content[0].text.trim()

  // Strip markdown code fences if present
  const cleaned = text.replace(/^```json\n?|\n?```$/g, '').trim()

  let parsed
  try {
    parsed = JSON.parse(cleaned)
  } catch (e) {
    console.error(`[batch ${batchIdx + 1}] JSON parse error. Raw response:`)
    console.error(text.slice(0, 500))
    throw new Error(`Batch ${batchIdx + 1} parse failed: ${e.message}`)
  }

  if (!Array.isArray(parsed) || parsed.length !== exos.length) {
    throw new Error(`Batch ${batchIdx + 1} length mismatch: expected ${exos.length}, got ${parsed.length}`)
  }

  // Validate IDs match
  const inputIds = new Set(exos.map(e => e.id))
  for (const p of parsed) {
    if (!inputIds.has(p.id)) {
      throw new Error(`Batch ${batchIdx + 1} returned unknown ID: ${p.id}`)
    }
  }

  return parsed
}

// --- Apply translations to DB ---
async function applyTranslations(translations) {
  console.log(`Applying ${translations.length} translations to DB...`)
  let success = 0
  let failed = 0

  for (const t of translations) {
    const { error } = await supabase
      .from('exercises_db')
      .update({
        name_en: t.name_en || null,
        name_de: t.name_de || null,
        description_en: t.description_en || null,
        description_de: t.description_de || null,
        tips_en: t.tips_en || null,
        tips_de: t.tips_de || null,
      })
      .eq('id', t.id)

    if (error) {
      console.error(`UPDATE failed for ${t.id}: ${error.message}`)
      failed++
    } else {
      success++
    }
  }

  console.log(`Apply done: ${success} success, ${failed} failed`)
  if (failed > 0) throw new Error(`${failed} UPDATEs failed`)
}

// --- Main ---
async function main() {
  console.log(`Mode: ${APPLY ? 'APPLY (DB UPDATE)' : 'DRY-RUN (JSON only)'}`)
  console.log(`Resume: ${RESUME ? 'yes (skip translated)' : 'no (all exos)'}`)
  console.log()

  const exos = await fetchExercises()
  console.log(`Fetched ${exos.length} exercises to translate`)

  if (FROM_FILE) {
    console.log('Mode --from-file: skipping API calls, loading from JSON')
    const raw = await fs.readFile(OUTPUT_FILE, 'utf-8')
    const allTranslations = JSON.parse(raw)
    console.log(`Loaded ${allTranslations.length} translations from ${OUTPUT_FILE}`)

    if (APPLY) {
      await applyTranslations(allTranslations)
      console.log('\nBackfill complete')
    } else {
      console.log('\n--from-file without --apply: nothing to do. Add --apply to UPDATE DB.')
    }
    return
  }

  if (exos.length === 0) {
    console.log('Nothing to translate. Exit.')
    return
  }

  // Split into batches
  const batches = []
  for (let i = 0; i < exos.length; i += BATCH_SIZE) {
    batches.push(exos.slice(i, i + BATCH_SIZE))
  }
  console.log(`${batches.length} batches of max ${BATCH_SIZE} exos\n`)

  // Translate all batches
  const allTranslations = []
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i]
    try {
      const translated = await translateBatch(batch, i, batches.length)
      allTranslations.push(...translated)
      console.log(`[batch ${i + 1}/${batches.length}] OK (${translated.length} exos)`)
    } catch (e) {
      console.error(`[batch ${i + 1}] FAILED: ${e.message}`)
      // Save progress so far
      await fs.writeFile(OUTPUT_FILE, JSON.stringify(allTranslations, null, 2))
      console.error(`Saved partial progress to ${OUTPUT_FILE}`)
      throw e
    }
  }

  // Save full JSON
  await fs.writeFile(OUTPUT_FILE, JSON.stringify(allTranslations, null, 2))
  console.log(`\nTranslations saved to ${OUTPUT_FILE} (${allTranslations.length} exos)`)

  if (APPLY) {
    await applyTranslations(allTranslations)
    console.log('\nBackfill complete')
  } else {
    console.log('\nDry-run done. Review the file, then run with --apply to UPDATE DB.')
  }
}

main().catch(e => {
  console.error('FATAL:', e.message)
  process.exit(1)
})
