import { immutableInvocation, type AiPromptInvocation } from './types'

export interface PromptImage { base64: string; mediaType: string }

export function buildBodyAnalysisInvocation(input: { front: PromptImage; back: PromptImage; side: PromptImage; weight?: unknown; height?: unknown }): AiPromptInvocation {
  return immutableInvocation({
    model: 'claude-opus-4-8', max_tokens: 1024,
    system: `Tu es un expert en analyse corporelle fitness. Tu analyses 3 photos (face, dos, profil) pour estimer la composition corporelle visuellement. Tes estimations sont visuelles et non médicales.`,
    tool_choice: { type: 'tool', name: 'body_analysis_output' },
    tools: [{ name: 'body_analysis_output', description: 'Structure l\'analyse corporelle en JSON exploitable', input_schema: {
      type: 'object', required: ['body_fat_estimate', 'lean_mass_estimate', 'strengths', 'improvements', 'symmetry_score', 'summary'],
      properties: {
        body_fat_estimate: { type: 'number', description: 'Taux de masse grasse estimé en pourcentage (ex: 18.5 pour 18.5%)' },
        lean_mass_estimate: { type: 'number', description: 'Masse maigre estimée en kg (ex: 65.2 pour 65.2 kg)' },
        strengths: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 3, description: 'Points forts visibles (musculature développée, posture, etc.)' },
        improvements: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 3, description: 'Axes d\'amélioration recommandés' },
        symmetry_score: { type: 'integer', minimum: 0, maximum: 100, description: 'Score de symétrie gauche/droite et haut/bas, 0=très asymétrique, 100=parfaitement symétrique' },
        summary: { type: 'string', description: 'Synthèse en 2-3 phrases du physique global et des recommandations principales' },
      },
    } }],
    messages: [{ role: 'user', content: [
      { type: 'image', source: { type: 'base64', media_type: input.front.mediaType, data: input.front.base64 } },
      { type: 'image', source: { type: 'base64', media_type: input.back.mediaType, data: input.back.base64 } },
      { type: 'image', source: { type: 'base64', media_type: input.side.mediaType, data: input.side.base64 } },
      { type: 'text', text: `Données utilisateur : poids ${input.weight || '?'} kg, taille ${input.height || '?'} cm. Analyse les 3 photos (face, dos, profil) et appelle le tool body_analysis_output avec ton analyse.` },
    ] }],
  })
}
