export function normalizeFoodItem(item: any) {
  return {
    id: item.id,
    nom: item.name || item.nom || 'Aliment inconnu',
    calories: Math.round(item.energy_kcal ?? item.calories ?? 0),
    proteines: Math.round((item.proteins ?? item.proteines ?? 0) * 10) / 10,
    glucides: Math.round((item.carbohydrates ?? item.glucides ?? 0) * 10) / 10,
    lipides: Math.round((item.fat ?? item.lipides ?? 0) * 10) / 10,
    source: item.source ?? 'ciqual',
  }
}
