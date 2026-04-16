import * as XLSX from 'xlsx'

/* ─── Types ─── */
interface ExerciseData {
  exercise_name?: string
  custom_name?: string
  name?: string
  exerciseName?: string
  sets?: number
  reps?: number
  rest_seconds?: number
  rest?: number
  tempo?: string
  technique?: string | null
  technique_details?: string
  muscle_group?: string
}

interface DayData {
  name?: string
  weekday?: string
  is_rest?: boolean
  focus?: string
  exercises?: ExerciseData[]
}

interface ProgramData {
  name: string
  description?: string
  source?: string
  created_at?: string
  days: DayData[]
}

const TECHNIQUE_LABELS: Record<string, string> = {
  dropset: 'Drop Set',
  restpause: 'Rest Pause',
  superset: 'Superset',
  mechanical: 'Mechanical Drop Set',
}

function getExName(ex: ExerciseData): string {
  return ex.exercise_name || ex.custom_name || ex.name || ex.exerciseName || 'Exercice'
}

function getRest(ex: ExerciseData): number {
  return ex.rest_seconds || ex.rest || 90
}

/* ─── EXPORT ─── */
export function exportProgramToXlsx(program: ProgramData) {
  const wb = XLSX.utils.book_new()

  // Sheet 1: Programme info
  const infoData = [
    ['Champ', 'Valeur'],
    ['Nom', program.name],
    ['Jours', String(program.days.length)],
    ['Source', program.source === 'ai' ? 'IA' : 'Manuel'],
    ['Date création', program.created_at ? new Date(program.created_at).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR')],
    ['Description', program.description || ''],
  ]
  const wsInfo = XLSX.utils.aoa_to_sheet(infoData)
  wsInfo['!cols'] = [{ wch: 16 }, { wch: 40 }]
  XLSX.utils.book_append_sheet(wb, wsInfo, 'Programme')

  // One sheet per day
  program.days.forEach((day, i) => {
    const dayName = day.is_rest
      ? `Jour ${i + 1} - Repos`
      : `Jour ${i + 1} - ${day.name || day.weekday || `Séance ${i + 1}`}`
    // Truncate sheet name to 31 chars (Excel limit)
    const sheetName = dayName.slice(0, 31)

    if (day.is_rest) {
      const restData = [['Repos', 'Récupération']]
      const wsRest = XLSX.utils.aoa_to_sheet(restData)
      XLSX.utils.book_append_sheet(wb, wsRest, sheetName)
      return
    }

    const header = ['Exercice', 'Sets', 'Reps', 'Repos', 'Tempo', 'Technique', 'Détails']
    const rows = (day.exercises || []).map(ex => [
      getExName(ex),
      ex.sets || 3,
      ex.reps || 10,
      `${getRest(ex)}s`,
      ex.tempo || '2-0-2',
      ex.technique ? (TECHNIQUE_LABELS[ex.technique] || ex.technique) : '-',
      ex.technique_details || '-',
    ])

    const wsDay = XLSX.utils.aoa_to_sheet([header, ...rows])
    wsDay['!cols'] = [{ wch: 30 }, { wch: 6 }, { wch: 6 }, { wch: 8 }, { wch: 8 }, { wch: 18 }, { wch: 30 }]
    XLSX.utils.book_append_sheet(wb, wsDay, sheetName)
  })

  const safeName = program.name.replace(/[^a-zA-Z0-9àâäéèêëïîôùûüçÀÂÄÉÈÊËÏÎÔÙÛÜÇ\s_-]/g, '').replace(/\s+/g, '_')
  const date = new Date().toISOString().split('T')[0]
  XLSX.writeFile(wb, `MoovX_${safeName}_${date}.xlsx`)
}

/* ─── TEMPLATE ─── */
export function downloadBlankTemplate() {
  const wb = XLSX.utils.book_new()

  const infoData = [
    ['Champ', 'Valeur'],
    ['Nom', ''],
    ['Jours', ''],
    ['Source', ''],
    ['Date création', ''],
    ['Description', ''],
  ]
  const wsInfo = XLSX.utils.aoa_to_sheet(infoData)
  wsInfo['!cols'] = [{ wch: 16 }, { wch: 40 }]
  XLSX.utils.book_append_sheet(wb, wsInfo, 'Programme')

  for (let i = 1; i <= 7; i++) {
    const header = ['Exercice', 'Sets', 'Reps', 'Repos', 'Tempo', 'Technique', 'Détails']
    const wsDay = XLSX.utils.aoa_to_sheet([header])
    wsDay['!cols'] = [{ wch: 30 }, { wch: 6 }, { wch: 6 }, { wch: 8 }, { wch: 8 }, { wch: 18 }, { wch: 30 }]
    XLSX.utils.book_append_sheet(wb, wsDay, `Jour ${i}`)
  }

  XLSX.writeFile(wb, `MoovX_Modele_Vierge.xlsx`)
}

/* ─── IMPORT ─── */

const TECHNIQUE_REVERSE: Record<string, string> = {
  'drop set': 'dropset',
  'dropset': 'dropset',
  'rest pause': 'restpause',
  'restpause': 'restpause',
  'rest-pause': 'restpause',
  'superset': 'superset',
  'mechanical drop set': 'mechanical',
  'mechanical': 'mechanical',
}

// Flexible column name matching
const COL_EXERCISE = ['exercice', 'exercise', 'nom', 'name', 'mouvement', 'exercise name']
const COL_SETS = ['sets', 'séries', 'series', 's', 'set order']
const COL_REPS = ['reps', 'répétitions', 'repetitions', 'r']
const COL_REST = ['repos', 'rest', 'pause', 'recovery']
const COL_TEMPO = ['tempo', 'cadence']
const COL_WEIGHT = ['poids', 'weight', 'charge', 'kg']
const COL_TECHNIQUE = ['technique']
const COL_DETAIL = ['détail', 'détails', 'detail', 'details']

function findCol(header: string[], aliases: string[]): number {
  return header.findIndex(h => aliases.some(a => h === a || h.includes(a)))
}

export interface ImportResult {
  success: boolean
  error?: string
  skippedSheets?: string[]
  program?: {
    name: string
    description: string
    days: DayData[]
    source: string
  }
}

// Detect Strong/Hevy format: has "Exercise Name" + "Set Order" columns (one row per set)
function isThirdPartyFormat(header: string[]): boolean {
  const hasExName = header.some(h => h === 'exercise name' || h === 'exercise_name')
  const hasSetOrder = header.some(h => h === 'set order' || h === 'set_order' || h === 'set #')
  return hasExName && hasSetOrder
}

function parseThirdPartySheet(rows: any[][], header: string[]): ExerciseData[] {
  const exCol = findCol(header, ['exercise name', 'exercise_name'])
  const weightCol = findCol(header, COL_WEIGHT)
  const repsCol = findCol(header, COL_REPS)
  if (exCol === -1) return []

  // Group rows by exercise name → count sets, avg reps/weight
  const grouped: Record<string, { sets: number; reps: number[]; weights: number[] }> = {}
  const order: string[] = []
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]
    if (!row?.[exCol]) continue
    const name = String(row[exCol]).trim()
    if (!grouped[name]) { grouped[name] = { sets: 0, reps: [], weights: [] }; order.push(name) }
    grouped[name].sets++
    if (repsCol >= 0) grouped[name].reps.push(parseInt(String(row[repsCol] || '0')) || 0)
    if (weightCol >= 0) grouped[name].weights.push(parseFloat(String(row[weightCol] || '0')) || 0)
  }

  return order.map(name => {
    const g = grouped[name]
    const avgReps = g.reps.length > 0 ? Math.round(g.reps.reduce((a, b) => a + b, 0) / g.reps.length) : 10
    return {
      name,
      exercise_name: name,
      sets: g.sets,
      reps: avgReps,
      rest_seconds: 90,
      tempo: '2-0-2',
      technique: null,
      technique_details: '',
    }
  })
}

interface SheetParseResult {
  type: 'day' | 'rest' | 'info' | 'skipped'
  day?: DayData
  sheetName: string
  programName?: string
  description?: string
}

function parseSheet(sheetName: string, ws: any): SheetParseResult {
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 })
  if (!rows.length) return { type: 'skipped', sheetName }

  // Check if info sheet (has "Champ"/"Valeur" or "Nom"/value pattern)
  const firstCell = String(rows[0]?.[0] || '').toLowerCase().trim()
  if (firstCell === 'champ' || firstCell === 'nom' || firstCell === 'name') {
    // Could be info sheet — check if it has key/value pairs
    let pName = ''
    let desc = ''
    let looksLikeInfo = false
    for (const row of rows) {
      const field = String(row[0] || '').toLowerCase().trim()
      const value = String(row[1] || '').trim()
      if (field === 'nom' || field === 'name') { pName = value; looksLikeInfo = true }
      if (field === 'description') { desc = value; looksLikeInfo = true }
      if (field === 'champ') looksLikeInfo = true
    }
    if (looksLikeInfo) return { type: 'info', sheetName, programName: pName, description: desc }
  }

  // Check if rest day
  if (rows.length <= 1) {
    if (firstCell.includes('repos') || firstCell.includes('rest') || firstCell.includes('off')) {
      return { type: 'rest', sheetName, day: { name: 'Repos', is_rest: true, exercises: [] } }
    }
  }

  // Parse header
  const header = (rows[0] || []).map((h: any) => String(h).toLowerCase().trim())

  // Try third-party format (Strong, Hevy)
  if (isThirdPartyFormat(header)) {
    const exercises = parseThirdPartySheet(rows, header)
    if (exercises.length > 0) {
      const dayName = sheetName.replace(/^Jour \d+ ?-? ?/, '').trim() || sheetName
      return { type: 'day', sheetName, day: { name: dayName, is_rest: false, exercises } }
    }
  }

  // Standard MoovX format — find columns flexibly
  const exCol = findCol(header, COL_EXERCISE)
  const setsCol = findCol(header, COL_SETS)
  const repsCol = findCol(header, COL_REPS)

  // Need at least exercise name + (sets OR reps) to be a valid day sheet
  if (exCol === -1 || (setsCol === -1 && repsCol === -1)) {
    return { type: 'skipped', sheetName }
  }

  const restCol = findCol(header, COL_REST)
  const tempoCol = findCol(header, COL_TEMPO)
  const weightCol = findCol(header, COL_WEIGHT)
  const techCol = findCol(header, COL_TECHNIQUE)
  const detailCol = findCol(header, COL_DETAIL)

  const exercises: ExerciseData[] = []
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]
    if (!row || !row[exCol]) continue

    const name = String(row[exCol]).trim()
    if (!name) continue

    const sets = setsCol >= 0 ? (parseInt(String(row[setsCol] || '3')) || 3) : 3
    const reps = repsCol >= 0 ? (parseInt(String(row[repsCol] || '10')) || 10) : 10
    const restRaw = restCol >= 0 ? String(row[restCol] || '90').replace(/s$/i, '') : '90'
    const rest_seconds = parseInt(restRaw) || 90
    const tempo = tempoCol >= 0 ? String(row[tempoCol] || '2-0-2').trim() : '2-0-2'
    const techRaw = techCol >= 0 ? String(row[techCol] || '').trim().toLowerCase() : ''
    const technique = (techRaw && techRaw !== '-' && techRaw !== '') ? (TECHNIQUE_REVERSE[techRaw] || null) : null
    const rawDetails = detailCol >= 0 ? String(row[detailCol] || '').trim() : ''
    const technique_details = rawDetails === '-' ? '' : rawDetails

    const ex: ExerciseData = {
      name,
      exercise_name: name,
      sets,
      reps,
      rest_seconds,
      tempo: /^\d-\d-\d$/.test(tempo) ? tempo : '2-0-2',
      technique,
      technique_details,
    }

    // Store weight if present (for reference, not used in program but useful)
    if (weightCol >= 0 && row[weightCol]) {
      (ex as any).weight = parseFloat(String(row[weightCol])) || undefined
    }

    exercises.push(ex)
  }

  if (exercises.length === 0) return { type: 'skipped', sheetName }

  const dayName = sheetName.replace(/^Jour \d+ ?-? ?/, '').trim() || sheetName
  return { type: 'day', sheetName, day: { name: dayName, is_rest: false, exercises } }
}

export function parseProgramFromXlsx(file: File): Promise<ImportResult> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })

        if (wb.SheetNames.length === 0) {
          resolve({ success: false, error: 'Le fichier est vide.' })
          return
        }

        let programName = ''
        let description = ''
        const days: DayData[] = []
        const skippedSheets: string[] = []

        for (const sheetName of wb.SheetNames) {
          const ws = wb.Sheets[sheetName]
          const result = parseSheet(sheetName, ws)

          switch (result.type) {
            case 'info':
              if (result.programName) programName = result.programName
              if (result.description) description = result.description
              break
            case 'day':
              if (result.day) days.push(result.day)
              break
            case 'rest':
              if (result.day) days.push(result.day)
              break
            case 'skipped':
              skippedSheets.push(sheetName)
              break
          }
        }

        if (days.length === 0) {
          resolve({
            success: false,
            error: 'Aucune feuille compatible trouvée. Les colonnes obligatoires sont : Exercice (nom du mouvement), Sets (nombre de séries), Reps (nombre de répétitions). Télécharge le modèle vierge pour voir le format attendu.',
          })
          return
        }

        if (!programName) {
          // Try to derive name from filename
          programName = file.name.replace(/\.(xlsx|xls)$/i, '').replace(/[_-]/g, ' ').trim() || 'Programme importé'
        }

        resolve({
          success: true,
          skippedSheets: skippedSheets.length > 0 ? skippedSheets : undefined,
          program: { name: programName, description, days, source: 'import' },
        })
      } catch {
        resolve({ success: false, error: 'Erreur de lecture du fichier. Vérifie que c\'est un fichier .xlsx valide.' })
      }
    }
    reader.onerror = () => resolve({ success: false, error: 'Erreur de lecture du fichier.' })
    reader.readAsArrayBuffer(file)
  })
}
