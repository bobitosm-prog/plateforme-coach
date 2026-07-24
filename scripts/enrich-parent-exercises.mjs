/**
 * One-shot script to enrich parent exercises in exercises_db
 * with local video/image files from public/videos/exercises/.
 *
 * Usage:
 *   node scripts/enrich-parent-exercises.mjs            # dry-run
 *   node scripts/enrich-parent-exercises.mjs --execute  # real sync
 *   node scripts/enrich-parent-exercises.mjs --suggest  # suggest mapping lines for unmapped files
 */
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const LOCAL_DIR = './public/videos/exercises'
const BUCKET = 'exercise-videos'
const VERSION = Date.now()
const DRY_RUN = !process.argv.includes('--execute')
const SUGGEST = process.argv.includes('--suggest')

// Explicit mapping: DB parent name → local file slug (without extension)
const PARENT_MAPPING = {
  'Dips': { slug: 'dips', imgExt: 'png' },
  'Hip Thrust': { slug: 'hip-thrust', imgExt: 'jpg' },
  'Développé Militaire': { slug: 'developpe-militaire', imgExt: 'jpg' },
  'Rowing Barre': { slug: 'rowing-barre', imgExt: 'jpg' },
  // Variants accepted by Marco
  'Tractions': { slug: 'tractions-pronation', imgExt: 'jpg' },
  'Développé Couché': { slug: 'developpe-couche-halteres', imgExt: null },  // mp4 only, no image
  'Squat': { slug: 'squat-barre', imgExt: 'jpg' },
  'Élévations Latérales': { slug: 'elevations-laterales-halteres', imgExt: 'jpg' },
  'Élévations Frontales': { slug: 'elevations-frontales-halteres', imgExt: 'jpg' },
  // Batch vidéos IA — juillet 2026
  'Hack squat machine': { slug: 'hack-squat-machine', imgExt: 'jpg' },
  // Vidéos existantes retrouvées sur disque — juillet 2026
  'Développé militaire barre debout': { slug: 'developpe-militaire-barre-debout', imgExt: 'jpg' },
  'Kettlebell Swing': { slug: 'kettlebell-swing', imgExt: 'jpg' },
  'Leg extension': { slug: 'leg-extension', imgExt: 'jpg' },
  'Extension Jambes Machine': { slug: 'leg-extension', imgExt: 'jpg' },

  // Multi-mapping : 1 vidéo → 2 fiches (doublon sémantique)
  'Leg Press': { slug: 'leg-press', imgExt: 'jpg' },
  'Presse à cuisses': { slug: 'leg-press', imgExt: 'jpg' },

  'Pull-over poulie haute bras tendus': { slug: 'pull-over-poulie-haute', imgExt: 'jpg' },

  'Développé Couché Barre': { slug: 'developpe-couche-barre', imgExt: 'jpg' },
}

// Normalize a name to a slug: lowercase, no accents, hyphens
function slugify(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')       // non-alphanumeric → hyphen
    .replace(/^-+|-+$/g, '')           // trim hyphens
}

// Suggest mapping lines for .mp4 files not yet in PARENT_MAPPING
async function suggestMappings() {
  console.log('🔎 SUGGEST MODE — scanning for unmapped video files\n')

  const mappedSlugs = new Set(Object.values(PARENT_MAPPING).map(m => m.slug))
  const files = fs.readdirSync(LOCAL_DIR).filter(f => f.endsWith('.mp4'))
  const unmapped = files
    .map(f => f.replace(/\.mp4$/, ''))
    .filter(slug => !mappedSlugs.has(slug))

  if (unmapped.length === 0) {
    console.log('✅ All .mp4 files in the folder are already mapped.')
    return
  }

  // Fetch all exercise names once
  const { data: exercises, error } = await supabase
    .from('exercises_db')
    .select('name')
  if (error) {
    console.error('❌ Could not fetch exercises_db:', error.message)
    process.exit(1)
  }

  // Index DB names by their slugified form
  const bySlug = new Map()
  for (const { name } of exercises) {
    const s = slugify(name)
    if (!bySlug.has(s)) bySlug.set(s, [])
    bySlug.get(s).push(name)
  }

  for (const slug of unmapped) {
    // Detect available image extension on disk
    const imgExt = ['jpg', 'jpeg', 'png'].find(ext =>
      fs.existsSync(path.join(LOCAL_DIR, `${slug}.${ext}`))
    ) || null

    const matches = bySlug.get(slug) || []

    if (matches.length === 0) {
      console.log(`⚠️  ${slug}.mp4 → no exact DB match found (check the name manually):`)
      console.log(`   '???': { slug: '${slug}', imgExt: ${imgExt ? `'${imgExt}'` : 'null'} },\n`)
    } else {
      console.log(`🆕 ${slug}.mp4 → DB match${matches.length > 1 ? 'es' : ''}: ${matches.map(m => `"${m}"`).join(', ')}`)
      for (const name of matches) {
        console.log(`   '${name}': { slug: '${slug}', imgExt: ${imgExt ? `'${imgExt}'` : 'null'} },`)
      }
      console.log('')
    }
  }

  console.log('💡 Copy the relevant line(s) into PARENT_MAPPING, then run the dry-run.')
}

async function uploadFile(localPath, storagePath, contentType) {
  const file = fs.readFileSync(localPath)
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, { contentType, upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
  return data.publicUrl
}

async function main() {
  if (SUGGEST) {
    await suggestMappings()
    return
  }

  console.log(DRY_RUN ? '🔍 DRY RUN — no changes will be made\n' : '🚀 EXECUTING — uploading and updating DB\n')

  let synced = 0, skipped = 0

  for (const [parentName, { slug, imgExt }] of Object.entries(PARENT_MAPPING)) {
    const mp4Path = path.join(LOCAL_DIR, `${slug}.mp4`)
    const imgPath = imgExt ? path.join(LOCAL_DIR, `${slug}.${imgExt}`) : null

    // Check mp4 exists
    if (!fs.existsSync(mp4Path)) {
      console.log(`⏭️  Skip ${parentName}: ${slug}.mp4 not found`)
      skipped++
      continue
    }

    const mp4Size = (fs.statSync(mp4Path).size / 1024).toFixed(0)
    const imgSize = imgPath && fs.existsSync(imgPath) ? (fs.statSync(imgPath).size / 1024).toFixed(0) : null
    const hasImg = imgPath && fs.existsSync(imgPath)

    if (DRY_RUN) {
      console.log(`📋 Would sync: "${parentName}" ← ${slug}.mp4 (${mp4Size}KB)${hasImg ? ` + ${slug}.${imgExt} (${imgSize}KB)` : ' (no image)'}`)
      synced++
      continue
    }

    // Upload mp4
    console.log(`⬆️  Uploading ${parentName} ← ${slug}.mp4 (${mp4Size}KB)...`)
    const videoUrl = await uploadFile(mp4Path, `${slug}/${slug}.mp4`, 'video/mp4')

    // Upload image if exists
    let imageUrl = null
    if (hasImg) {
      const contentType = imgExt === 'png' ? 'image/png' : 'image/jpeg'
      imageUrl = await uploadFile(imgPath, `${slug}/${slug}.${imgExt}`, contentType)
    }

    // Update DB
    const update = {
      video_url: `${videoUrl}?v=${VERSION}`,
    }
    if (imageUrl) {
      update.gif_url = `${imageUrl}?v=${VERSION}`
    }

    const { error } = await supabase
      .from('exercises_db')
      .update(update)
      .eq('name', parentName)
      .select()

    if (error) {
      console.error(`❌ DB update failed for ${parentName}:`, error.message)
      continue
    }

    console.log(`✅ Synced: ${parentName}`)
    synced++
  }

  console.log(`\n🎉 Done: ${synced} synced, ${skipped} skipped`)
  if (DRY_RUN) console.log('\n💡 Run with --execute to apply changes')
}

main().catch(err => {
  console.error('❌ Error:', err.message)
  process.exit(1)
})