// Exercise image mapping — French MoovX names → ExerciseDB GIF URLs
// Uses the free exercisedb.io CDN for animated exercise illustrations
// Fallback: returns null if no mapping found

const EXERCISEDB_CDN = 'https://v2.exercisedb.io/image'

// French exercise name → ExerciseDB exercise ID
// These IDs correspond to the exercisedb.io database
const EXERCISE_ID_MAP: Record<string, string> = {
  // ─── Poitrine (Push) ───
  'Développé couché barre': '0025',
  'Développé couché haltères': '0289',
  'Développé incliné barre': '0047',
  'Développé incliné haltères': '0291',
  'Développé décliné barre': '0033',
  'Développé décliné haltères': '0290',
  'Écarté couché haltères': '0293',
  'Écarté incliné haltères': '0295',
  'Écarté poulie vis-à-vis': '0160',
  'Pompes': '0662',
  'Pompes déclinées': '0663',
  'Dips pectoraux': '0236',
  'Pull-over haltère': '0296',
  'Pec deck (machine)': '0585',

  // ─── Dos (Pull) ───
  'Tractions pronation': '0651',
  'Tractions supination': '0652',
  'Tirage vertical poulie haute': '0198',
  'Tirage horizontal poulie basse': '0861',
  'Rowing barre': '0027',
  'Rowing haltère': '0294',
  'Rowing T-bar': '1341',
  'Tirage nuque': '0199',
  'Rowing machine': '0860',
  'Pullover poulie': '0572',
  'Soulevé de terre conventionnel': '0032',
  'Soulevé de terre roumain': '0085',
  'Good morning': '0044',
  'Shrug barre': '0095',
  'Shrug haltères': '0310',
  'Face pull poulie': '0576',

  // ─── Épaules ───
  'Développé militaire barre': '0079',
  'Développé militaire haltères': '0314',
  'Développé Arnold': '0274',
  'Élévations latérales haltères': '0313',
  'Élévations frontales haltères': '0307',
  'Élévations latérales poulie': '0573',
  'Oiseau haltères': '0303',
  'Oiseau poulie': '0574',
  'Upright row barre': '0100',
  'Face pull': '0576',

  // ─── Biceps ───
  'Curl barre droite': '0031',
  'Curl barre EZ': '0070',
  'Curl haltères': '0298',
  'Curl haltères alternés': '0285',
  'Curl marteau': '0306',
  'Curl pupitre barre EZ': '0071',
  'Curl concentré': '0287',
  'Curl poulie basse': '0561',
  'Curl incliné haltères': '0299',

  // ─── Triceps ───
  'Extension triceps poulie haute': '0860',
  'Extension triceps corde': '0862',
  'Barre au front (Skull crushers)': '0048',
  'Dips triceps': '0716',
  'Extension triceps haltère': '0308',
  'Kickback haltère': '0300',
  'Développé couché prise serrée': '0026',
  'Extension overhead corde': '0863',

  // ─── Quadriceps ───
  'Squat barre': '0025',
  'Squat avant (Front squat)': '0043',
  'Presse à cuisses': '0584',
  'Hack squat machine': '0583',
  'Fentes avant barre': '0050',
  'Fentes marchées haltères': '0305',
  'Leg extension machine': '0585',
  'Sissy squat': '3665',
  'Goblet squat haltère': '0291',
  'Bulgarian split squat': '1758',

  // ─── Ischio-Jambiers ───
  'Leg curl couché machine': '0586',
  'Leg curl assis machine': '0587',
  'Soulevé de terre jambes tendues': '0085',
  'Hip thrust barre': '1511',
  'Glute-ham raise': '3011',

  // ─── Fessiers ───
  'Hip thrust barre au sol': '1511',
  'Kickback poulie': '0575',
  'Abduction machine': '0596',
  'Pont fessier': '3297',

  // ─── Mollets ───
  'Mollets debout machine': '0588',
  'Mollets assis machine': '0589',
  'Mollets à la presse': '1382',

  // ─── Abdos ───
  'Crunch': '0274',
  'Crunch oblique': '2355',
  'Planche (Plank)': '0266',
  'Planche latérale': '0267',
  'Relevé de jambes suspendu': '0845',
  'Ab roller': '0001',
  'Russian twist': '2333',
  'Mountain climbers': '0658',
}

// Fuzzy match: normalize French text for matching
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9 ]/g, '') // Remove special chars
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Get ExerciseDB GIF URL for a given exercise name.
 * Returns the CDN URL or null if no mapping found.
 */
export function getExerciseGif(name: string): string | null {
  if (!name) return null

  // Direct match
  const directId = EXERCISE_ID_MAP[name]
  if (directId) return `${EXERCISEDB_CDN}/${directId}`

  // Fuzzy match
  const normalizedName = normalize(name)
  for (const [key, id] of Object.entries(EXERCISE_ID_MAP)) {
    const normalizedKey = normalize(key)
    if (normalizedName.includes(normalizedKey) || normalizedKey.includes(normalizedName)) {
      return `${EXERCISEDB_CDN}/${id}`
    }
    // Match first 2 significant words
    const nameWords = normalizedName.split(' ').filter(w => w.length > 2)
    const keyWords = normalizedKey.split(' ').filter(w => w.length > 2)
    if (nameWords.length >= 2 && keyWords.length >= 2) {
      if (nameWords[0] === keyWords[0] && nameWords[1] === keyWords[1]) {
        return `${EXERCISEDB_CDN}/${id}`
      }
    }
  }

  return null
}

/**
 * Placeholder SVG for exercises without images
 */
export const ExercisePlaceholder = () => (
  <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
    <rect width="56" height="56" fill="#141310" />
    <path d="M18 28H38M14 22H18V34H14V22ZM38 22H42V34H38V22Z" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
