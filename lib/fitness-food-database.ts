/**
 * Base d'aliments fitness curée — valeurs nutritionnelles de référence (pour 100g).
 *
 * BUT : fournir à l'IA de generate-meal-plan une palette d'aliments avec des
 * valeurs VÉRIFIÉES, pour qu'elle cesse d'inventer les kcal/macros (bug #18).
 * L'IA reste libre de composer les repas, mais doit utiliser CES valeurs.
 *
 * Convention : valeurs pour 100g dans l'ÉTAT indiqué par `state` :
 *   - raw          : cru (viande/poisson à peser cru)
 *   - cooked       : cuit (féculents, viandes/poissons à peser cuits)
 *   - dry          : sec (flocons, poudres, pain)
 *   - ready_to_eat : prêt à consommer (laitiers, fruits, huiles, oléagineux)
 *
 * Valeurs alignées sur CIQUAL/USDA (moyennes, varient selon marque/cuisson).
 * NE PAS confondre avec food_items (table de scan/recherche user, 3669 lignes).
 */

export type FoodState = 'raw' | 'cooked' | 'dry' | 'ready_to_eat'

export type FitnessFood = {
  name: string
  kcal: number          // pour 100g
  prot: number
  carb: number
  fat: number
  category: FoodCategory
  state: FoodState
}

export type FoodCategory =
  | 'protein'
  | 'starch'
  | 'vegetable'
  | 'fruit'
  | 'fat'
  | 'dairy'
  | 'other'

export const FITNESS_FOODS: FitnessFood[] = [
  // ─── PROTÉINES ───
  { name: 'Blanc de poulet cuit', kcal: 165, prot: 31, carb: 0, fat: 3.6, category: 'protein', state: 'cooked' },
  { name: 'Cuisse de poulet cuite sans peau', kcal: 177, prot: 24, carb: 0, fat: 9, category: 'protein', state: 'cooked' },
  { name: 'Escalope de dinde cuite', kcal: 135, prot: 29, carb: 0, fat: 1.5, category: 'protein', state: 'cooked' },
  { name: 'Bœuf haché 5% cru', kcal: 137, prot: 21, carb: 0, fat: 5, category: 'protein', state: 'raw' },
  { name: 'Bœuf haché 15% cru', kcal: 215, prot: 19, carb: 0, fat: 15, category: 'protein', state: 'raw' },
  { name: 'Steak de bœuf grillé', kcal: 215, prot: 30, carb: 0, fat: 10, category: 'protein', state: 'cooked' },
  { name: 'Filet de porc cuit', kcal: 165, prot: 28, carb: 0, fat: 5, category: 'protein', state: 'cooked' },
  { name: 'Jambon blanc dégraissé', kcal: 110, prot: 20, carb: 1, fat: 3, category: 'protein', state: 'ready_to_eat' },
  { name: 'Saumon cuit', kcal: 208, prot: 22, carb: 0, fat: 13, category: 'protein', state: 'cooked' },
  { name: 'Thon frais cuit', kcal: 130, prot: 28, carb: 0, fat: 1, category: 'protein', state: 'cooked' },
  { name: 'Thon en boîte au naturel', kcal: 116, prot: 26, carb: 0, fat: 1, category: 'protein', state: 'ready_to_eat' },
  { name: 'Cabillaud cuit', kcal: 105, prot: 23, carb: 0, fat: 0.9, category: 'protein', state: 'cooked' },
  { name: 'Crevettes cuites', kcal: 99, prot: 24, carb: 0, fat: 0.3, category: 'protein', state: 'cooked' },
  { name: 'Œuf entier', kcal: 143, prot: 13, carb: 1, fat: 10, category: 'protein', state: 'ready_to_eat' },
  { name: "Blanc d'œuf", kcal: 52, prot: 11, carb: 0.7, fat: 0.2, category: 'protein', state: 'ready_to_eat' },
  { name: 'Tofu ferme', kcal: 144, prot: 17, carb: 3, fat: 9, category: 'protein', state: 'ready_to_eat' },
  { name: 'Tempeh', kcal: 192, prot: 20, carb: 8, fat: 11, category: 'protein', state: 'ready_to_eat' },
  { name: 'Seitan', kcal: 145, prot: 25, carb: 6, fat: 2, category: 'protein', state: 'cooked' },
  { name: 'Whey protéine (poudre)', kcal: 400, prot: 80, carb: 8, fat: 5, category: 'protein', state: 'dry' },
  { name: 'Caséine (poudre)', kcal: 370, prot: 78, carb: 6, fat: 2, category: 'protein', state: 'dry' },

  // ─── PRODUITS LAITIERS (riches en protéines) ───
  { name: 'Fromage blanc 0%', kcal: 47, prot: 8, carb: 4, fat: 0.2, category: 'dairy', state: 'ready_to_eat' },
  { name: 'Skyr nature', kcal: 60, prot: 11, carb: 4, fat: 0.2, category: 'dairy', state: 'ready_to_eat' },
  { name: 'Yaourt grec 0%', kcal: 58, prot: 10, carb: 4, fat: 0.4, category: 'dairy', state: 'ready_to_eat' },
  { name: 'Cottage cheese', kcal: 98, prot: 11, carb: 3, fat: 4, category: 'dairy', state: 'ready_to_eat' },
  { name: 'Lait demi-écrémé', kcal: 47, prot: 3.3, carb: 5, fat: 1.6, category: 'dairy', state: 'ready_to_eat' },
  { name: 'Mozzarella light', kcal: 180, prot: 22, carb: 2, fat: 10, category: 'dairy', state: 'ready_to_eat' },
  { name: 'Feta', kcal: 264, prot: 14, carb: 4, fat: 21, category: 'dairy', state: 'ready_to_eat' },
  { name: 'Parmesan', kcal: 392, prot: 36, carb: 3, fat: 26, category: 'dairy', state: 'ready_to_eat' },

  // ─── FÉCULENTS / GLUCIDES ───
  { name: 'Riz basmati cuit', kcal: 130, prot: 2.7, carb: 28, fat: 0.3, category: 'starch', state: 'cooked' },
  { name: 'Riz complet cuit', kcal: 123, prot: 2.7, carb: 26, fat: 1, category: 'starch', state: 'cooked' },
  { name: 'Pâtes cuites', kcal: 131, prot: 5, carb: 25, fat: 1, category: 'starch', state: 'cooked' },
  { name: 'Pâtes complètes cuites', kcal: 124, prot: 5, carb: 24, fat: 1, category: 'starch', state: 'cooked' },
  { name: 'Quinoa cuit', kcal: 120, prot: 4.4, carb: 21, fat: 1.9, category: 'starch', state: 'cooked' },
  { name: 'Patate douce cuite', kcal: 90, prot: 2, carb: 21, fat: 0.1, category: 'starch', state: 'cooked' },
  { name: 'Pomme de terre cuite', kcal: 87, prot: 2, carb: 20, fat: 0.1, category: 'starch', state: 'cooked' },
  { name: 'Semoule cuite', kcal: 112, prot: 4, carb: 23, fat: 0.2, category: 'starch', state: 'cooked' },
  { name: 'Lentilles cuites', kcal: 116, prot: 9, carb: 20, fat: 0.4, category: 'starch', state: 'cooked' },
  { name: 'Pois chiches cuits', kcal: 164, prot: 9, carb: 27, fat: 2.6, category: 'starch', state: 'cooked' },
  { name: 'Haricots rouges cuits', kcal: 127, prot: 9, carb: 22, fat: 0.5, category: 'starch', state: 'cooked' },
  { name: "Flocons d'avoine secs", kcal: 379, prot: 13, carb: 67, fat: 7, category: 'starch', state: 'dry' },
  { name: 'Pain complet', kcal: 247, prot: 9, carb: 41, fat: 3.5, category: 'starch', state: 'ready_to_eat' },
  { name: 'Pain blanc', kcal: 265, prot: 9, carb: 49, fat: 3, category: 'starch', state: 'ready_to_eat' },

  // ─── LÉGUMES ───
  { name: 'Brocolis', kcal: 34, prot: 2.8, carb: 7, fat: 0.4, category: 'vegetable', state: 'cooked' },
  { name: 'Haricots verts', kcal: 31, prot: 1.8, carb: 7, fat: 0.1, category: 'vegetable', state: 'cooked' },
  { name: 'Courgette', kcal: 17, prot: 1.2, carb: 3, fat: 0.3, category: 'vegetable', state: 'cooked' },
  { name: 'Épinards', kcal: 23, prot: 2.9, carb: 3.6, fat: 0.4, category: 'vegetable', state: 'cooked' },
  { name: 'Salade verte', kcal: 15, prot: 1.4, carb: 2.9, fat: 0.2, category: 'vegetable', state: 'ready_to_eat' },
  { name: 'Tomate', kcal: 18, prot: 0.9, carb: 3.9, fat: 0.2, category: 'vegetable', state: 'ready_to_eat' },
  { name: 'Poivron', kcal: 31, prot: 1, carb: 6, fat: 0.3, category: 'vegetable', state: 'ready_to_eat' },
  { name: 'Carotte', kcal: 41, prot: 0.9, carb: 10, fat: 0.2, category: 'vegetable', state: 'ready_to_eat' },
  { name: 'Chou-fleur', kcal: 25, prot: 1.9, carb: 5, fat: 0.3, category: 'vegetable', state: 'cooked' },
  { name: 'Champignons', kcal: 22, prot: 3.1, carb: 3.3, fat: 0.3, category: 'vegetable', state: 'cooked' },
  { name: 'Concombre', kcal: 15, prot: 0.7, carb: 3.6, fat: 0.1, category: 'vegetable', state: 'ready_to_eat' },
  { name: 'Asperges', kcal: 20, prot: 2.2, carb: 3.9, fat: 0.1, category: 'vegetable', state: 'cooked' },

  // ─── FRUITS ───
  { name: 'Banane', kcal: 89, prot: 1.1, carb: 23, fat: 0.3, category: 'fruit', state: 'ready_to_eat' },
  { name: 'Pomme', kcal: 52, prot: 0.3, carb: 14, fat: 0.2, category: 'fruit', state: 'ready_to_eat' },
  { name: 'Orange', kcal: 47, prot: 0.9, carb: 12, fat: 0.1, category: 'fruit', state: 'ready_to_eat' },
  { name: 'Fraises', kcal: 32, prot: 0.7, carb: 8, fat: 0.3, category: 'fruit', state: 'ready_to_eat' },
  { name: 'Myrtilles', kcal: 57, prot: 0.7, carb: 14, fat: 0.3, category: 'fruit', state: 'ready_to_eat' },
  { name: 'Kiwi', kcal: 61, prot: 1.1, carb: 15, fat: 0.5, category: 'fruit', state: 'ready_to_eat' },
  { name: 'Ananas', kcal: 50, prot: 0.5, carb: 13, fat: 0.1, category: 'fruit', state: 'ready_to_eat' },
  { name: 'Raisin', kcal: 69, prot: 0.7, carb: 18, fat: 0.2, category: 'fruit', state: 'ready_to_eat' },
  { name: 'Mangue', kcal: 60, prot: 0.8, carb: 15, fat: 0.4, category: 'fruit', state: 'ready_to_eat' },

  // ─── LIPIDES / OLÉAGINEUX ───
  { name: "Huile d'olive", kcal: 884, prot: 0, carb: 0, fat: 100, category: 'fat', state: 'ready_to_eat' },
  { name: 'Huile de colza', kcal: 884, prot: 0, carb: 0, fat: 100, category: 'fat', state: 'ready_to_eat' },
  { name: 'Beurre', kcal: 717, prot: 0.9, carb: 0.1, fat: 81, category: 'fat', state: 'ready_to_eat' },
  { name: 'Amandes', kcal: 579, prot: 21, carb: 22, fat: 50, category: 'fat', state: 'ready_to_eat' },
  { name: 'Noix', kcal: 654, prot: 15, carb: 14, fat: 65, category: 'fat', state: 'ready_to_eat' },
  { name: 'Noix de cajou', kcal: 553, prot: 18, carb: 30, fat: 44, category: 'fat', state: 'ready_to_eat' },
  { name: 'Beurre de cacahuète', kcal: 588, prot: 25, carb: 20, fat: 50, category: 'fat', state: 'ready_to_eat' },
  { name: 'Avocat', kcal: 160, prot: 2, carb: 9, fat: 15, category: 'fat', state: 'ready_to_eat' },
  { name: 'Graines de chia', kcal: 486, prot: 17, carb: 42, fat: 31, category: 'fat', state: 'dry' },
  { name: 'Graines de lin', kcal: 534, prot: 18, carb: 29, fat: 42, category: 'fat', state: 'dry' },

  // ─── DIVERS ───
  { name: 'Miel', kcal: 304, prot: 0.3, carb: 82, fat: 0, category: 'other', state: 'ready_to_eat' },
  { name: 'Chocolat noir 85%', kcal: 599, prot: 8, carb: 31, fat: 46, category: 'other', state: 'ready_to_eat' },
  { name: 'Confiture', kcal: 250, prot: 0.4, carb: 62, fat: 0.1, category: 'other', state: 'ready_to_eat' },
]

const STATE_LABEL: Record<FoodState, string> = {
  raw: 'cru', cooked: 'cuit', dry: 'sec', ready_to_eat: 'prêt à consommer',
}

/**
 * Formate la base pour injection dans un prompt IA.
 * "Nom (état): Xkcal Pg Gg Lg /100g" groupé par catégorie.
 */
export function formatFitnessFoodsForPrompt(): string {
  const byCat: Record<FoodCategory, FitnessFood[]> = {
    protein: [], dairy: [], starch: [], vegetable: [], fruit: [], fat: [], other: [],
  }
  for (const f of FITNESS_FOODS) byCat[f.category].push(f)

  const labels: Record<FoodCategory, string> = {
    protein: 'PROTÉINES', dairy: 'LAITIERS', starch: 'FÉCULENTS / GLUCIDES',
    vegetable: 'LÉGUMES', fruit: 'FRUITS', fat: 'LIPIDES / OLÉAGINEUX', other: 'DIVERS',
  }

  const order: FoodCategory[] = ['protein', 'dairy', 'starch', 'vegetable', 'fruit', 'fat', 'other']
  return order.map(cat => {
    const items = byCat[cat]
      .map(f => `${f.name} (${STATE_LABEL[f.state]}): ${f.kcal}kcal P${f.prot} G${f.carb} L${f.fat}`)
      .join(' | ')
    return `${labels[cat]}: ${items}`
  }).join('\n')
}
