const columns = 'id,name,energy_kcal,proteins,carbohydrates,fat,source'

/** French keyboards may produce either oe or œ; singular also finds plural labels. */
export function foodSearchTerms(query: string): string[] {
  const term = query.trim().toLowerCase().replace(/[%_\\]/g, '').replace(/œ/g, 'oe').replace(/\boeufs\b/g, 'oeuf')
  return term.length < 2 ? [] : [...new Set([term, term.replace(/oe/g, 'œ')])]
}

/** Reserve fitness results before the general catalog limit can hide them. */
export async function searchFoodCatalog(db: any, query: string, signal?: AbortSignal) {
  const terms = foodSearchTerms(query)
  if (!terms.length) return []
  const responses = await Promise.all(terms.flatMap(term => [true, false].map(fitness => {
    let request = db.from('selectable_food_items').select(columns)
    if (fitness) request = request.eq('source', 'fitness')
    request = request.ilike('name', `%${term}%`).order('name').limit(fitness ? 12 : 30)
    return signal ? request.abortSignal(signal) : request
  })))
  if (responses.some(result => result.error)) throw new Error('FOOD_SEARCH_FAILED')
  const rows = [...new Map<string, any>(responses.flatMap(result => result.data ?? []).map((row: any) => [String(row.id), row])).values()]
  const relevance = (row: any) => {
    const name = String(row.name).toLowerCase().replace(/œ/g, 'oe')
    const term = terms[0]
    return name.startsWith(term) ? 0 : name.split(/[\s'’(),.-]+/).some(word => word.startsWith(term)) ? 1 : 2
  }
  return rows.sort((a, b) => Number(b.source === 'fitness') - Number(a.source === 'fitness') || relevance(a) - relevance(b) || a.name.localeCompare(b.name)).slice(0, 30)
}
