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

export interface ImportResult {
  success: boolean
  error?: string
  program?: {
    name: string
    description: string
    days: DayData[]
    source: string
  }
}

export function parseProgramFromXlsx(file: File): Promise<ImportResult> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })

        if (wb.SheetNames.length < 2) {
          resolve({ success: false, error: 'Le fichier doit contenir au moins 2 feuilles (Programme + jours).' })
          return
        }

        // Parse info sheet
        let programName = ''
        let description = ''
        const infoSheet = wb.Sheets[wb.SheetNames[0]]
        if (infoSheet) {
          const infoRows: any[][] = XLSX.utils.sheet_to_json(infoSheet, { header: 1 })
          for (const row of infoRows) {
            const field = String(row[0] || '').toLowerCase().trim()
            const value = String(row[1] || '').trim()
            if (field === 'nom') programName = value
            if (field === 'description') description = value
          }
        }

        if (!programName) programName = 'Programme importé'

        // Parse day sheets
        const days: DayData[] = []
        for (let i = 1; i < wb.SheetNames.length; i++) {
          const sheetName = wb.SheetNames[i]
          const ws = wb.Sheets[sheetName]
          const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 })

          // Check if rest day
          if (rows.length <= 1) {
            const firstCell = String(rows[0]?.[0] || '').toLowerCase()
            if (firstCell.includes('repos') || rows.length === 0) {
              days.push({ name: 'Repos', is_rest: true, exercises: [] })
              continue
            }
          }

          // Parse header to find column indices
          const header = (rows[0] || []).map((h: any) => String(h).toLowerCase().trim())
          const exCol = header.findIndex((h: string) => h.includes('exercice') || h.includes('exercise'))
          const setsCol = header.findIndex((h: string) => h.includes('set') || h.includes('série'))
          const repsCol = header.findIndex((h: string) => h.includes('rep'))
          const restCol = header.findIndex((h: string) => h.includes('repos') || h.includes('rest'))
          const tempoCol = header.findIndex((h: string) => h.includes('tempo'))
          const techCol = header.findIndex((h: string) => h.includes('technique'))
          const detailCol = header.findIndex((h: string) => h.includes('détail') || h.includes('detail'))

          if (exCol === -1 || setsCol === -1 || repsCol === -1) {
            resolve({ success: false, error: `Feuille "${sheetName}" : colonnes obligatoires manquantes (Exercice, Sets, Reps).` })
            return
          }

          const exercises: ExerciseData[] = []
          for (let r = 1; r < rows.length; r++) {
            const row = rows[r]
            if (!row || !row[exCol]) continue

            const name = String(row[exCol]).trim()
            const sets = parseInt(String(row[setsCol] || '3'))
            const reps = parseInt(String(row[repsCol] || '10'))

            if (isNaN(sets) || isNaN(reps)) {
              resolve({ success: false, error: `Feuille "${sheetName}", ligne ${r + 1} : Sets et Reps doivent être des nombres.` })
              return
            }

            const restRaw = restCol >= 0 ? String(row[restCol] || '90').replace('s', '') : '90'
            const rest_seconds = parseInt(restRaw) || 90
            const tempo = tempoCol >= 0 ? String(row[tempoCol] || '2-0-2').trim() : '2-0-2'
            const techRaw = techCol >= 0 ? String(row[techCol] || '').trim().toLowerCase() : ''
            const technique = (techRaw && techRaw !== '-') ? (TECHNIQUE_REVERSE[techRaw] || null) : null
            const technique_details = detailCol >= 0 ? String(row[detailCol] || '').trim() : ''

            exercises.push({
              name,
              exercise_name: name,
              sets,
              reps,
              rest_seconds,
              tempo: /^\d-\d-\d$/.test(tempo) ? tempo : '2-0-2',
              technique,
              technique_details: technique_details === '-' ? '' : technique_details,
            })
          }

          // Extract day name from sheet name (remove "Jour X - " prefix)
          const dayName = sheetName.replace(/^Jour \d+ ?-? ?/, '').trim() || sheetName

          days.push({
            name: dayName,
            is_rest: false,
            exercises,
          })
        }

        if (days.length === 0) {
          resolve({ success: false, error: 'Aucun jour trouvé dans le fichier.' })
          return
        }

        resolve({
          success: true,
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
