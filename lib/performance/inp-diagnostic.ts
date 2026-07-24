export const INP_DIAGNOSTIC_EXPERIMENTS = [
  'A1-canonical-cold',
  'A2-canonical-cold',
  'A3-canonical-cold',
  'B-preloaded-chunks',
  'C-cache-hot',
  'D-images-blocked',
  'E-tracing',
] as const

export type InpDiagnosticVerdict =
  | 'input_delay_regression'
  | 'processing_regression'
  | 'render_presentation_regression'
  | 'network_dependency_regression'
  | 'environment_variance'
  | 'inconclusive'

type Interaction = {
  eventType: string
  step: string
  duration: number
  inputDelay: number
  processingDuration: number
  presentationDelay: number
  associatedResources: Array<{ kind: string; resourceCode: string; transferSize: number }>
}

type Experiment = {
  journeys: {
    clientMobile: {
      runs: Array<{
        vitals: {
          inp: number | null
          interactions: Interaction[]
        }
      }>
    }
  }
}

export type InpDiagnosticMatrix = {
  schemaVersion: 1
  buildId: string
  experiments: Record<(typeof INP_DIAGNOSTIC_EXPERIMENTS)[number], Experiment>
}

export type InpDiagnosticAnalysis = {
  verdict: InpDiagnosticVerdict
  buildId: string
  canonicalInp: number[]
  training: Record<(typeof INP_DIAGNOSTIC_EXPERIMENTS)[number], {
    duration: number
    inputDelay: number
    processingDuration: number
    presentationDelay: number
    resources: string[]
  }>
  evidence: string[]
}

function finiteNonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function trainingClick(experiment: Experiment): Interaction {
  const run = experiment.journeys.clientMobile.runs[0]
  if (!run) throw new Error('DIAGNOSTIC_RUN_UNAVAILABLE')
  const interaction = run.vitals.interactions.find(
    candidate => candidate.step === 'client:training' && candidate.eventType === 'click',
  )
  if (!interaction) throw new Error('TRAINING_INTERACTION_UNAVAILABLE')
  for (const value of [
    interaction.duration,
    interaction.inputDelay,
    interaction.processingDuration,
    interaction.presentationDelay,
  ]) {
    if (!finiteNonNegative(value)) throw new Error('INVALID_DIAGNOSTIC_DURATION')
  }
  return interaction
}

export function analyzeInpDiagnosticMatrix(matrix: InpDiagnosticMatrix): InpDiagnosticAnalysis {
  if (matrix.schemaVersion !== 1 || !matrix.buildId) throw new Error('INVALID_DIAGNOSTIC_MATRIX')

  const training = Object.fromEntries(INP_DIAGNOSTIC_EXPERIMENTS.map(name => {
    const experiment = matrix.experiments[name]
    if (!experiment) throw new Error('MISSING_DIAGNOSTIC_EXPERIMENT')
    const interaction = trainingClick(experiment)
    return [name, {
      duration: interaction.duration,
      inputDelay: interaction.inputDelay,
      processingDuration: interaction.processingDuration,
      presentationDelay: interaction.presentationDelay,
      resources: interaction.associatedResources.map(resource => resource.resourceCode).sort(),
    }]
  })) as InpDiagnosticAnalysis['training']

  const canonicalInp = INP_DIAGNOSTIC_EXPERIMENTS.slice(0, 3).map(name => {
    const value = matrix.experiments[name].journeys.clientMobile.runs[0]?.vitals.inp
    if (!finiteNonNegative(value)) throw new Error('CANONICAL_INP_UNAVAILABLE')
    return value
  })
  const canonical = training['A1-canonical-cold']
  const preloaded = training['B-preloaded-chunks']
  const hot = training['C-cache-hot']
  const imagesBlocked = training['D-images-blocked']
  const presentationDominates = canonical.presentationDelay > canonical.inputDelay
    && canonical.presentationDelay > canonical.processingDuration
  const transportRemoved = preloaded.resources.every(resource => !resource.includes('/chunks/'))
  const chunksNotCausal = transportRemoved && preloaded.duration >= Math.min(...canonicalInp)
  const imagesNotCausal = imagesBlocked.duration >= Math.min(...canonicalInp)
  const hotImproves = hot.duration < Math.min(...canonicalInp)
  const canonicalSpread = Math.max(...canonicalInp) - Math.min(...canonicalInp)

  const verdict: InpDiagnosticVerdict = canonicalSpread >= 16
    ? 'environment_variance'
    : presentationDominates
    && chunksNotCausal
    && imagesNotCausal
    && hotImproves
    ? 'render_presentation_regression'
    : 'inconclusive'

  return {
    verdict,
    buildId: matrix.buildId,
    canonicalInp,
    training,
    evidence: [
      `canonical=${canonicalInp.join('/')}`,
      `preloaded=${preloaded.duration}`,
      `cache-hot=${hot.duration}`,
      `images-blocked=${imagesBlocked.duration}`,
      `presentation=${canonical.presentationDelay}`,
      `canonical-spread=${canonicalSpread}`,
    ],
  }
}
