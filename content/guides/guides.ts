export const GUIDE_SLUGS = ['nutrition', 'musculation'] as const

export type GuideSlug = (typeof GUIDE_SLUGS)[number]

export type GuideTable = {
  caption: string
  headers: readonly string[]
  rows: readonly (readonly string[])[]
}

export type GuideSection = {
  id: string
  title: string
  paragraphs: readonly string[]
  points?: readonly string[]
  table?: GuideTable
}

export type Guide = {
  slug: GuideSlug
  title: string
  seoTitle: string
  description: string
  eyebrow: string
  introduction: string
  readingMinutes: number
  sections: readonly GuideSection[]
  disclaimer: string
}

const nutrition: Guide = {
  slug: 'nutrition',
  title: 'Guide de la nutrition sportive',
  seoTitle: 'Guide nutrition sportive : calories, protéines et macros | MoovX',
  description: 'Comprendre les calories, les protéines, les glucides, les lipides et l’organisation des repas pour adapter son alimentation à son entraînement.',
  eyebrow: 'Guide pratique · Nutrition',
  introduction: 'La nutrition sportive ne repose pas sur une règle universelle. Elle combine les besoins énergétiques, la récupération, les préférences et la progression observée. Ce guide présente les repères essentiels pour construire une démarche cohérente et ajustable.',
  readingMinutes: 18,
  sections: [
    {
      id: 'calories',
      title: 'Calories : comprendre l’équilibre énergétique',
      paragraphs: [
        'L’apport énergétique et la dépense évoluent avec le poids, l’activité quotidienne, l’entraînement et la récupération. Une estimation constitue donc un point de départ, pas une prescription définitive.',
        'Observer plusieurs semaines aide à distinguer une variation normale d’une tendance durable. Le poids, les sensations, la faim et les performances apportent des informations complémentaires.',
      ],
      points: [
        'La maintenance correspond à une zone d’équilibre estimée.',
        'Un objectif se construit par ajustements progressifs.',
        'La régularité de l’observation compte davantage qu’une journée isolée.',
      ],
    },
    {
      id: 'proteines',
      title: 'Protéines : soutenir l’entretien et la récupération',
      paragraphs: [
        'Les protéines fournissent les acides aminés utilisés dans le renouvellement des tissus. Les besoins dépendent notamment du gabarit, du niveau d’activité et de l’objectif.',
        'Répartir des sources protéiques variées au fil de la journée peut simplifier l’organisation des repas. Les aliments complets restent la base ; les compléments répondent surtout à une contrainte pratique.',
      ],
    },
    {
      id: 'macros',
      title: 'Glucides et lipides : répartir les macros',
      paragraphs: [
        'Les glucides participent à l’approvisionnement énergétique, particulièrement lorsque les séances sont fréquentes ou intenses. Les lipides contribuent notamment aux membranes cellulaires et au transport de certaines vitamines.',
        'La répartition pertinente dépend des habitudes, de la tolérance digestive et du contexte sportif. Une répartition peut évoluer sans remettre en cause l’objectif calorique global.',
      ],
      table: {
        caption: 'Rôle général des macronutriments',
        headers: ['Macronutriment', 'Rôle principal', 'Exemples alimentaires'],
        rows: [
          ['Protéines', 'Entretien et renouvellement des tissus', 'Œufs, produits laitiers, légumineuses, poisson, viande'],
          ['Glucides', 'Énergie disponible et réserves de glycogène', 'Fruits, céréales, pommes de terre, légumineuses'],
          ['Lipides', 'Énergie, membranes et vitamines liposolubles', 'Huiles, noix, graines, poissons gras'],
        ],
      },
    },
    {
      id: 'timing',
      title: 'Timing des repas : privilégier une organisation tenable',
      paragraphs: [
        'Le total quotidien et la régularité restent des repères plus robustes que la recherche d’une minute parfaite. Un repas avant ou après la séance peut toutefois améliorer le confort, la disponibilité énergétique ou la récupération.',
        'La bonne organisation est celle qui s’intègre au rythme de vie sans perturber le sommeil, la digestion ou l’entraînement.',
      ],
    },
    {
      id: 'distribution',
      title: 'Distribuer les repas sur la journée',
      paragraphs: [
        'Le nombre de repas peut varier selon les contraintes professionnelles, la faim et la quantité totale à consommer. Il n’est pas nécessaire de multiplier les prises si une organisation plus simple fonctionne.',
        'Une structure répétable facilite le suivi : quelques repas complets, des portions adaptées et, si nécessaire, une collation autour de l’entraînement.',
      ],
    },
    {
      id: 'prise-de-masse',
      title: 'Prise de masse : ajuster sans précipitation',
      paragraphs: [
        'Une prise de masse vise à soutenir l’entraînement tout en observant l’évolution du poids, des mensurations et des performances. L’apport nécessaire varie fortement d’une personne à l’autre.',
        'Des ajustements graduels permettent de tenir compte de la réponse réelle plutôt que d’appliquer un surplus identique à tous les profils.',
      ],
    },
    {
      id: 'perte-de-poids',
      title: 'Perte de poids : préserver la qualité du programme',
      paragraphs: [
        'Une phase de perte de poids demande un compromis entre l’objectif énergétique, la satiété, la récupération et la continuité de l’entraînement. Une évolution trop rapide peut rendre le programme difficile à maintenir.',
        'Le suivi doit inclure les performances, le sommeil et le bien-être, pas uniquement la balance.',
      ],
    },
    {
      id: 'supplements',
      title: 'Suppléments : distinguer nécessité et commodité',
      paragraphs: [
        'Un supplément ne compense pas une alimentation insuffisamment variée. Son intérêt dépend d’un besoin identifié, d’une contrainte pratique ou d’un avis professionnel.',
        'La composition, la traçabilité, les interactions et la situation personnelle doivent être vérifiées avant utilisation.',
      ],
    },
    {
      id: 'hydratation',
      title: 'Hydratation : adapter les apports au contexte',
      paragraphs: [
        'Les besoins en eau changent avec la température, la transpiration, la durée des séances et l’alimentation. La soif, la couleur des urines et les conditions d’entraînement fournissent des repères simples.',
        'Lors d’efforts prolongés ou dans des conditions particulières, un professionnel peut aider à préciser la stratégie hydrique.',
      ],
    },
  ],
  disclaimer: 'Ce contenu est informatif et ne remplace pas l’avis d’un médecin ou d’un professionnel de la nutrition. Les besoins doivent être adaptés à la santé, aux antécédents et au contexte individuel.',
}

const musculation: Guide = {
  slug: 'musculation',
  title: 'Guide de la musculation',
  seoTitle: 'Guide musculation : hypertrophie, volume et progression | MoovX',
  description: 'Comprendre l’hypertrophie, le volume, la fréquence, les répétitions, la récupération et la surcharge progressive pour structurer son entraînement.',
  eyebrow: 'Guide pratique · Entraînement',
  introduction: 'Un programme de musculation efficace organise le stimulus, la récupération et la progression. Les repères présentés ici doivent être adaptés à l’expérience, au matériel, au temps disponible et à la réponse individuelle.',
  readingMinutes: 20,
  sections: [
    {
      id: 'mecanismes',
      title: 'Comprendre le stimulus musculaire',
      paragraphs: [
        'La tension produite pendant un mouvement, l’amplitude maîtrisée et la proximité de l’effort contribuent au stimulus. Aucun indicateur isolé ne suffit à décrire une séance productive.',
        'La technique permet de répéter le mouvement de manière comparable et de suivre la progression avec davantage de fiabilité.',
      ],
      points: [
        'Choisir une amplitude compatible avec le contrôle du mouvement.',
        'Conserver des repères de charge, répétitions et difficulté perçue.',
        'Faire évoluer un paramètre à la fois lorsque cela est possible.',
      ],
    },
    {
      id: 'repos',
      title: 'Temps de repos : récupérer pour la série suivante',
      paragraphs: [
        'Le repos entre les séries dépend du mouvement, de la charge, de l’objectif et de la condition du jour. Les exercices complexes demandent souvent davantage de récupération que les mouvements d’isolation.',
        'Un repos est suffisant lorsque la série suivante peut être réalisée avec une technique et un niveau d’effort cohérents avec le programme.',
      ],
      table: {
        caption: 'Critères pour adapter le repos',
        headers: ['Contexte', 'Signal à observer', 'Adaptation possible'],
        rows: [
          ['Mouvement complexe', 'Souffle ou technique encore instable', 'Prolonger la récupération'],
          ['Mouvement d’isolation', 'Muscle prêt et technique stable', 'Reprendre selon le plan'],
          ['Baisse inhabituelle de performance', 'Répétitions ou contrôle en recul', 'Réévaluer repos, charge ou fatigue'],
        ],
      },
    },
    {
      id: 'volume',
      title: 'Volume : partir de ce qui est récupérable',
      paragraphs: [
        'Le nombre de séries utile dépend de l’historique d’entraînement et de la capacité de récupération. Ajouter du volume n’améliore pas automatiquement le résultat.',
        'Une progression graduelle, suivie par groupe musculaire, aide à identifier le niveau de travail qui reste compatible avec la qualité des séances.',
      ],
    },
    {
      id: 'frequence',
      title: 'Fréquence : répartir le travail dans la semaine',
      paragraphs: [
        'Répartir un même volume sur plusieurs séances peut améliorer la qualité des séries et faciliter l’organisation. La fréquence pertinente dépend surtout du planning et de la récupération entre deux sollicitations.',
        'Un programme court et régulier est souvent plus exploitable qu’un planning ambitieux difficile à tenir.',
      ],
    },
    {
      id: 'repetitions',
      title: 'Répétitions et charge : utiliser plusieurs zones de travail',
      paragraphs: [
        'Des charges et nombres de répétitions différents peuvent servir un programme lorsqu’ils sont associés à une technique stable et à un effort approprié.',
        'Le choix dépend aussi de l’exercice : certaines variantes sont plus confortables dans une zone de répétitions modérée, d’autres se prêtent à un travail plus lourd ou plus long.',
      ],
    },
    {
      id: 'progression',
      title: 'Surcharge progressive : mesurer avant d’ajuster',
      paragraphs: [
        'Progresser peut signifier ajouter une répétition, augmenter légèrement la charge, améliorer l’amplitude ou mieux contrôler le mouvement. La progression n’est pas obligatoirement linéaire chaque semaine.',
        'Un journal d’entraînement permet de comparer des séances équivalentes et d’éviter des changements fondés uniquement sur la mémoire.',
      ],
    },
    {
      id: 'prefatigue',
      title: 'Pré-fatigue : une méthode, pas une obligation',
      paragraphs: [
        'Placer un exercice d’isolation avant un mouvement composé modifie la fatigue et les sensations. Cette organisation peut répondre à une préférence ou à une contrainte, mais elle réduit parfois la performance sur le mouvement suivant.',
        'Son intérêt doit être évalué dans le contexte du programme complet.',
      ],
    },
    {
      id: 'split',
      title: 'Choisir un split adapté au calendrier',
      paragraphs: [
        'Full body, haut/bas et push-pull-legs sont des façons différentes de répartir le travail. Aucun découpage n’est universellement supérieur.',
        'Le meilleur choix permet de couvrir les mouvements prévus, de récupérer et de maintenir une fréquence réaliste sur plusieurs semaines.',
      ],
      table: {
        caption: 'Exemples d’organisation',
        headers: ['Organisation', 'Principe', 'Point de vigilance'],
        rows: [
          ['Full body', 'Plusieurs groupes musculaires par séance', 'Gérer la durée et la fatigue globale'],
          ['Haut / bas', 'Alterner le haut et le bas du corps', 'Répartir les mouvements prioritaires'],
          ['Push / pull / legs', 'Regrouper poussée, tirage et jambes', 'Adapter le cycle aux jours réellement disponibles'],
        ],
      },
    },
    {
      id: 'recuperation',
      title: 'Récupération : intégrer sommeil et fatigue',
      paragraphs: [
        'Le sommeil, le stress, l’alimentation et les activités quotidiennes influencent la capacité à répéter les séances. Une baisse ponctuelle ne nécessite pas toujours de modifier tout le programme.',
        'Lorsque plusieurs indicateurs se dégradent durablement, réduire temporairement le volume ou l’intensité peut aider à retrouver une exécution de qualité.',
      ],
    },
  ],
  disclaimer: 'Ce guide fournit des repères généraux. En cas de douleur, de pathologie, de reprise après blessure ou de doute sur un mouvement, demandez conseil à un professionnel de santé ou de l’activité physique.',
}

export const GUIDES: Readonly<Record<GuideSlug, Guide>> = {
  nutrition,
  musculation,
}

export function getGuide(slug: string): Guide | undefined {
  return GUIDES[slug as GuideSlug]
}
