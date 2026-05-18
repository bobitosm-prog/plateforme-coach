/**
 * One-shot script to enrich parent exercises in exercises_db
 * with local video/image files from public/videos/exercises/.
 *
 * Usage:
 *   node scripts/enrich-parent-exercises.mjs           # dry-run
 *   node scripts/enrich-parent-exercises.mjs --execute  # real sync
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
