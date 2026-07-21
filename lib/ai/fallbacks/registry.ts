import type { AiFallbackFeature, AiFallbackPolicy } from './types'

const policy = (
  feature: AiFallbackFeature,
  currentBehavior: string,
  productRisk: string,
  partial?: { signal: 'explicit' | 'legacy_hidden'; persistence: 'valid_fragments_only' | 'aggregate_only' },
): AiFallbackPolicy => deepFreeze({
  feature,
  disposition: partial ? 'explicit_partial' : 'no_fallback',
  allowedKinds: partial ? ['partial'] : [],
  partialSignal: partial?.signal ?? 'not_applicable',
  persistence: partial?.persistence ?? 'none',
  currentBehavior,
  productRisk,
})

export const AI_FALLBACK_POLICIES: readonly AiFallbackPolicy[] = Object.freeze([
  policy('chat-ai', 'Erreur publique expurgée; aucun message assistant synthétique.', 'Une réponse fictive serait attribuée à Athena.'),
  policy('generate-recipe', 'Erreur publique; aucune recette vide présentée comme réussie.', 'Une recette inventée peut produire des conseils nutritionnels faux.'),
  policy('generate-meal-plan', 'Les journées valides sont conservées et une journée invalide devient vide dans le contrat legacy.', 'Le SSE public masque encore la liste précise des journées invalides.', { signal: 'legacy_hidden', persistence: 'valid_fragments_only' }),
  policy('analyze-meal-photo', 'Erreur; aucune analyse générique de l’image.', 'Des aliments ou macros fictifs seraient trompeurs.'),
  policy('suggest-exercise', 'Erreur; aucune alternative synthétique.', 'Une alternative inventée peut être inadaptée.'),
  policy('adapt-workout', 'Erreur; aucun programme adapté vide ou fabriqué.', 'Un entraînement altéré sans validation peut être dangereux.'),
  policy('generate-exercise-instructions', 'Le batch conserve les exercices valides et signale les erreurs par exercice.', 'Le caractère partiel reste porté par le résultat batch.', { signal: 'explicit', persistence: 'aggregate_only' }),
  policy('generate-program', 'Erreur; aucun programme vide ou ancien présenté comme nouveau.', 'Un programme fictif ou stale serait confondu avec une génération.'),
  policy('generate-custom-program', 'Événement SSE d’erreur; aucun événement done fictif.', 'Un done vide constituerait une fausse réussite.'),
  policy('training-regen', 'Le cron conserve les succès par client et compte chaque échec.', 'La persistance multi-étapes reste rejouable mais non transactionnelle.', { signal: 'explicit', persistence: 'aggregate_only' }),
  policy('suggest-overload', 'Erreur; aucune charge ou répétition par défaut.', 'Une surcharge inventée crée un risque sportif.'),
  policy('analyze-body', 'Erreur; aucune estimation générique.', 'Une estimation fictive pourrait être interprétée comme médicale.'),
  policy('analyze-progress-photo', 'Erreur; aucun texte générique attribué à l’image.', 'Une analyse non issue de la photo serait trompeuse.'),
  policy('weekly-diagnostic', 'Erreur; aucun score ni diagnostic artificiel.', 'Un score fictif contaminerait le suivi.'),
  policy('weekly-diagnostic-cron', 'Le cron conserve les diagnostics valides et compte les échecs.', 'L’agrégat ne doit jamais transformer un échec en diagnostic.', { signal: 'explicit', persistence: 'aggregate_only' }),
])

const byFeature = new Map(AI_FALLBACK_POLICIES.map(entry => [entry.feature, entry]))

export function getAiFallbackPolicy(feature: AiFallbackFeature): AiFallbackPolicy {
  const found = byFeature.get(feature)
  if (!found) throw new Error('Unknown AI fallback feature')
  return found
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    for (const nested of Object.values(value as Record<string, unknown>)) deepFreeze(nested)
    Object.freeze(value)
  }
  return value
}
