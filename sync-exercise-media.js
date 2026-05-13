import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const LOCAL_DIR = "./exercise-media";
const BUCKET = "exercise-videos";
const VERSION = Date.now();
const SYNC_STATE_FILE = ".exercise-media-sync.json";

function slugify(str) {
  return str
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function getFileSignature(filePath) {
  const stats = fs.statSync(filePath);
  return `${stats.size}-${stats.mtimeMs}`;
}

function loadSyncState() {
  if (!fs.existsSync(SYNC_STATE_FILE)) return {};
  return JSON.parse(fs.readFileSync(SYNC_STATE_FILE, "utf8"));
}

function saveSyncState(state) {
  fs.writeFileSync(SYNC_STATE_FILE, JSON.stringify(state, null, 2));
}

async function uploadFile(localPath, storagePath, contentType) {
  const file = fs.readFileSync(localPath);

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, { contentType, upsert: true });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

async function sync() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant dans .env");
  }

  if (!fs.existsSync(LOCAL_DIR)) {
    throw new Error(`Dossier introuvable : ${LOCAL_DIR}`);
  }

  const syncState = loadSyncState();

  const { data: dbExercises, error: fetchError } = await supabase
    .from("exercises_db")
    .select("id, name");

  if (fetchError) throw fetchError;

  const dbBySlug = new Map();

  for (const exo of dbExercises) {
    dbBySlug.set(slugify(exo.name), exo);
  }

  const files = fs.readdirSync(LOCAL_DIR).filter((f) => !f.startsWith("."));
  const exerciseNames = [
    ...new Set(files.map((f) => path.parse(f).name.trim())),
  ];

  let synced = 0;
  let alreadySynced = 0;
  let skipped = 0;
  let unmatched = [];

  for (const exerciseName of exerciseNames) {
    const mp4Path = path.join(LOCAL_DIR, `${exerciseName}.mp4`);
    const pngPath = path.join(LOCAL_DIR, `${exerciseName}.png`);

    if (!fs.existsSync(mp4Path) || !fs.existsSync(pngPath)) {
      console.log(`⏭️  Skip ${exerciseName} : fichier .mp4 ou .png manquant`);
      skipped++;
      continue;
    }

    const slug = slugify(exerciseName);
    const dbExo = dbBySlug.get(slug);

    if (!dbExo) {
      console.log(`❌ Pas trouvé en DB : "${exerciseName}" (slug: ${slug})`);
      unmatched.push(exerciseName);
      continue;
    }

    const mp4Signature = getFileSignature(mp4Path);
    const pngSignature = getFileSignature(pngPath);

    if (
      syncState[slug]?.mp4 === mp4Signature &&
      syncState[slug]?.png === pngSignature
    ) {
      console.log(`✅ Déjà sync : ${exerciseName}`);
      alreadySynced++;
      continue;
    }

    console.log(`⬆️  Uploading ${exerciseName} → DB name "${dbExo.name}"...`);

    const videoUrl = await uploadFile(
      mp4Path,
      `${slug}/${slug}.mp4`,
      "video/mp4"
    );

    const imageUrl = await uploadFile(
      pngPath,
      `${slug}/${slug}.png`,
      "image/png"
    );

    const { error } = await supabase
      .from("exercises_db")
      .update({
        video_url: `${videoUrl}?v=${VERSION}`,
        gif_url: `${imageUrl}?v=${VERSION}`,
      })
      .eq("id", dbExo.id)
      .select();

    if (error) throw error;

    syncState[slug] = {
      id: dbExo.id,
      name: dbExo.name,
      mp4: mp4Signature,
      png: pngSignature,
      videoPath: `${slug}/${slug}.mp4`,
      imagePath: `${slug}/${slug}.png`,
      syncedAt: new Date().toISOString(),
    };

    saveSyncState(syncState);

    synced++;
    console.log(`✅ Synced ${exerciseName}`);
  }

  console.log(
    `\n🎉 Sync terminée : ${synced} synced, ${alreadySynced} déjà sync, ${skipped} skipped, ${unmatched.length} unmatched`
  );

  if (unmatched.length > 0) {
    console.log(`\n⚠️  Exercices sans match en DB :`);
    unmatched.forEach((n) => console.log(`   - ${n}`));
  }
}

sync().catch((error) => {
  console.error("❌ Erreur sync:", error.message);
  process.exit(1);
});