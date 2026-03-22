export function normalizeFoodItem(item: any) {
  return {
    id: item.id,
    nom: item.nom || item.name || '',
    calories: item.calories ?? item.energy_kcal ?? 0,
    proteines: item.proteines ?? item.proteins ?? 0,
    glucides: item.glucides ?? item.carbohydrates ?? 0,
    lipides: item.lipides ?? item.fat ?? 0,
    source: item.source ?? 'ciqual',
  }
}
