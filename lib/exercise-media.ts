// Exercise images from free-exercise-db (MIT license)
// Source: https://github.com/yuhonas/free-exercise-db
// Each folder has 0.jpg (start position) and 1.jpg (end position)

const BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises'

// French exercise name → GitHub folder name
const MAP: Record<string, string> = {
  // ─── POITRINE (Push) ───
  'Développé couché barre': 'Barbell_Bench_Press_-_Medium_Grip',
  'Développé couché haltères': 'Dumbbell_Bench_Press',
  'Développé incliné barre': 'Barbell_Incline_Bench_Press_-_Medium_Grip',
  'Développé incliné haltères': 'Incline_Dumbbell_Press',
  'Développé décliné barre': 'Decline_Barbell_Bench_Press',
  'Développé décliné haltères': 'Decline_Dumbbell_Bench_Press',
  'Écarté couché haltères': 'Dumbbell_Flyes',
  'Écarté incliné haltères': 'Incline_Dumbbell_Flyes',
  'Écarté poulie vis-à-vis': 'Cable_Crossover',
  'Écartés câble': 'Cable_Crossover',
  'Écartés haltères': 'Dumbbell_Flyes',
  'Écartés poulie prise neutre': 'Cable_Crossover',
  'Pompes': 'Pushups',
  'Dips': 'Chest_Dip',
  'Dips pectoraux': 'Chest_Dip',
  'Pull-over haltère': 'Bent-Arm_Dumbbell_Pullover',
  'Pec deck': 'Butterfly',
  'Développé couché prise serrée': 'Close-Grip_Barbell_Bench_Press',

  // ─── DOS (Pull) ───
  'Tractions': 'Pullups',
  'Tractions pronation': 'Pullups',
  'Tractions supination': 'Chin-Up',
  'Tirage vertical poulie haute': 'Wide-Grip_Lat_Pulldown',
  'Tirage vertical prise large': 'Wide-Grip_Lat_Pulldown',
  'Tirage vertical prise serrée': 'Close-Grip_Front_Lat_Pulldown',
  'Tirage horizontal câble': 'Seated_Cable_Rows',
  'Tirage horizontal poulie basse': 'Seated_Cable_Rows',
  'Rowing barre': 'Bent_Over_Barbell_Row',
  'Rowing haltère': 'One-Arm_Dumbbell_Row',
  'Rowing T-bar': 'Bent_Over_Two-Arm_Long_Bar_Row',
  'Tirage nuque': 'Wide-Grip_Lat_Pulldown',
  'Soulevé de terre conventionnel': 'Barbell_Deadlift',
  'Soulevé de terre': 'Barbell_Deadlift',
  'Soulevé de terre roumain': 'Romanian_Deadlift_With_Dumbbells',
  'Good morning': 'Good_Morning',
  'Shrugs': 'Barbell_Shrug',
  'Shrug barre': 'Barbell_Shrug',
  'Shrug haltères': 'Dumbbell_Shrug',
  'Face pulls': 'Face_Pull',
  'Face pull poulie': 'Face_Pull',
  'Pullover poulie': 'Straight-Arm_Pulldown',

  // ─── ÉPAULES ───
  'Développé militaire barre': 'Barbell_Shoulder_Press',
  'Développé militaire haltères': 'Dumbbell_Shoulder_Press',
  'Développé Arnold': 'Arnold_Dumbbell_Press',
  'Élévations latérales haltères': 'Side_Lateral_Raise',
  'Élévations latérales câble': 'Cable_Lateral_Raise',
  'Élévations frontales': 'Front_Dumbbell_Raise',
  'Élévations frontales haltères': 'Front_Dumbbell_Raise',
  'Oiseau haltères': 'Seated_Bent-Over_Rear_Delt_Raise',
  'Oiseau poulie': 'Bent_Over_Low-Pulley_Side_Lateral',
  'Upright row barre': 'Upright_Barbell_Row',
  'Upright row': 'Upright_Barbell_Row',
  'Face pull': 'Face_Pull',

  // ─── BICEPS ───
  'Curl barre droite': 'Barbell_Curl',
  'Curl barre EZ': 'EZ-Bar_Curl',
  'Curl biceps barre': 'Barbell_Curl',
  'Curl biceps haltères': 'Dumbbell_Bicep_Curl',
  'Curl haltères': 'Dumbbell_Bicep_Curl',
  'Curl haltères alternés': 'Dumbbell_Alternate_Bicep_Curl',
  'Curl marteau': 'Hammer_Curls',
  'Curl pupitre': 'Preacher_Curl',
  'Curl pupitre barre EZ': 'Preacher_Curl',
  'Curl concentré': 'Concentration_Curls',
  'Curl poulie basse': 'Cable_Hammer_Curls_-_Rope_Attachment',
  'Curl incliné haltères': 'Incline_Dumbbell_Curl',

  // ─── TRICEPS ───
  'Extensions triceps poulie': 'Triceps_Pushdown',
  'Extension triceps poulie haute': 'Triceps_Pushdown',
  'Extensions triceps corde': 'Reverse_Grip_Triceps_Pushdown',
  'Extension triceps corde': 'Reverse_Grip_Triceps_Pushdown',
  'Skull crushers': 'Lying_Triceps_Press',
  'Barre au front': 'Lying_Triceps_Press',
  'Dips triceps': 'Bench_Dips',
  'Extension triceps haltère': 'Dumbbell_One-Arm_Triceps_Extension',
  'Kickback haltère': 'Tricep_Dumbbell_Kickback',
  'Extension overhead corde': 'Standing_Overhead_Barbell_Triceps_Extension',

  // ─── QUADRICEPS ───
  'Squat barre': 'Barbell_Full_Squat',
  'Squat avant': 'Front_Barbell_Squat',
  'Front squat': 'Front_Barbell_Squat',
  'Presse à cuisses': 'Leg_Press',
  'Hack squat': 'Hack_Squat',
  'Hack squat machine': 'Hack_Squat',
  'Fentes avant barre': 'Barbell_Lunge',
  'Fentes': 'Dumbbell_Lunges',
  'Fentes marchées haltères': 'Barbell_Walking_Lunge',
  'Fentes bulgares': 'Single_Leg_Squat',
  'Bulgarian split squat': 'Single_Leg_Squat',
  'Leg extension': 'Leg_Extensions',
  'Leg extension machine': 'Leg_Extensions',
  'Goblet squat haltère': 'Goblet_Squat',
  'Goblet squat': 'Goblet_Squat',
  'Sissy squat': 'Bodyweight_Squat',

  // ─── ISCHIO-JAMBIERS ───
  'Leg curl couché machine': 'Lying_Leg_Curls',
  'Leg curl': 'Lying_Leg_Curls',
  'Leg curl assis machine': 'Seated_Leg_Curl',
  'Soulevé de terre jambes tendues': 'Stiff-Legged_Barbell_Deadlift',
  'Hip thrust barre': 'Barbell_Hip_Thrust',
  'Hip thrust': 'Barbell_Hip_Thrust',

  // ─── FESSIERS ───
  'Hip thrust barre au sol': 'Barbell_Hip_Thrust',
  'Kickback poulie': 'Glute_Kickback',
  'Abducteurs machine': 'Thigh_Abductor',
  'Adducteurs machine': 'Thigh_Adductor',
  'Pont fessier': 'Barbell_Glute_Bridge',

  // ─── MOLLETS ───
  'Mollets debout': 'Standing_Calf_Raises',
  'Mollets debout machine': 'Standing_Calf_Raises',
  'Mollets assis': 'Seated_Calf_Raise',
  'Mollets assis machine': 'Seated_Calf_Raise',
  'Mollets à la presse': 'Calf_Press_On_The_Leg_Press_Machine',

  // ─── ABDOS ───
  'Crunch': 'Crunches',
  'Crunch câble': 'Cable_Crunch',
  'Crunch oblique': 'Oblique_Crunches',
  'Planche': 'Plank',
  'Planche latérale': 'Side_Bridge',
  'Relevé de jambes suspendu': 'Hanging_Leg_Raise',
  'Relevé de jambes': 'Hanging_Leg_Raise',
  'Ab roller': 'Ab_Roller',
  'Russian twist': 'Russian_Twist',
  'Mountain climbers': 'Mountain_Climbers',

  // ─── CARDIO ───
  'Burpees': 'Burpee',
  'Jumping jacks': 'Jumping_Jacks',
}

// Normalize for fuzzy matching
function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, '').trim()
}

function findFolder(name: string): string | null {
  if (!name) return null
  // Direct match
  if (MAP[name]) return MAP[name]
  // Fuzzy match
  const n = norm(name)
  for (const [key, folder] of Object.entries(MAP)) {
    const k = norm(key)
    if (n.includes(k) || k.includes(n)) return folder
    // Match first 2 words
    const nw = n.split(' ').filter(w => w.length > 2)
    const kw = k.split(' ').filter(w => w.length > 2)
    if (nw.length >= 2 && kw.length >= 2 && nw[0] === kw[0] && nw[1] === kw[1]) return folder
  }
  return null
}

/** Get image URL for an exercise (0 = start position, 1 = end position) */
export function getExerciseImage(name: string, position: 0 | 1 = 0): string | null {
  const folder = findFolder(name)
  return folder ? `${BASE}/${folder}/${position}.jpg` : null
}

/** Get both start and end position images */
export function getExerciseImages(name: string): { start: string | null; end: string | null } {
  const folder = findFolder(name)
  if (!folder) return { start: null, end: null }
  return { start: `${BASE}/${folder}/0.jpg`, end: `${BASE}/${folder}/1.jpg` }
}
