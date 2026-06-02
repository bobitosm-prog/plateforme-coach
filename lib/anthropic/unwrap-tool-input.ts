/**
 * Déballe le wrapper 'input' parasite que le modèle Anthropic ajoute par
 * intermittence aux sorties tool_use.
 *
 * Symptôme : au lieu de retourner directement l'objet conforme à l'input_schema
 * (ex: { program_name, description, days }), le modèle enveloppe parfois la sortie
 * dans { input: { program_name, ... } }. Résultat : toolUseBlock.input devient
 * { input: {...} } et les champs attendus sont undefined → bugs en aval
 * (programme vide, diagnostic null, etc.).
 *
 * Détection : un objet avec EXACTEMENT une clé 'input' qui contient un objet.
 * Aucun output légitime de nos tools n'a cette forme (ils ont tous plusieurs
 * champs racine), donc pas de faux positif.
 *
 * Usage :
 *   const data = unwrapToolInput(toolUseBlock.input)
 */
export function unwrapToolInput<T = any>(rawInput: any): T {
  if (rawInput && typeof rawInput === 'object' && !Array.isArray(rawInput)) {
    const keys = Object.keys(rawInput)
    if (keys.length === 1 && keys[0] === 'input' && rawInput.input && typeof rawInput.input === 'object') {
      return rawInput.input as T
    }
  }
  return rawInput as T
}
