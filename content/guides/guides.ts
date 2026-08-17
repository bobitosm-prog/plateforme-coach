export type GuideSlug = 'musculation' | 'nutrition'

export interface GuideTable {
  caption: string
  headers: string[]
  rows: string[][]
}

export interface GuideLink {
  href: string
  label: string
}

export interface GuideSection {
  id: string
  title: string
  paragraphs: string[]
  table?: GuideTable
  links?: GuideLink[]
}

export interface GuideEditorialReviewItem {
  topic: string
  reason: string
}

export interface GuideContent {
  slug: GuideSlug
  title: string
  description: string
  headline: string
  lead: string
  readingMinutes: number
  datePublished: string
  dateModified: string
  sections: GuideSection[]
  disclaimer: string
  editorialReview: GuideEditorialReviewItem[]
}

const musculation: GuideContent = {
  slug: 'musculation',
  title: 'Guide de musculation : hypertrophie, volume et progression | MoovX',
  description:
    "Comprendre l'hypertrophie, le volume, la fréquence, les répétitions, la progression et la récupération pour structurer son entraînement.",
  headline: 'Le guide de la musculation',
  lead:
    "Un guide pilier pour comprendre les variables qui structurent un entraînement de musculation : tension mécanique, repos, volume, fréquence, répétitions, progression et récupération.",
  readingMinutes: 22,
  datePublished: '2026-04-01',
  dateModified: '2026-08-16',
  sections: [
    {
      id: 'mecanismes',
      title: "Les mécanismes de l'hypertrophie",
      paragraphs: [
        "La croissance musculaire dépend avant tout d'un stimulus d'entraînement suffisamment exigeant, répété dans le temps et accompagné d'une récupération adaptée. La tension mécanique produite par le muscle contre une résistance constitue le signal central de cette adaptation.",
        "Le stress métabolique et les dommages musculaires peuvent accompagner l'entraînement, mais ils ne doivent pas devenir des objectifs isolés. Une séance productive cherche un effort de qualité et une progression mesurable, pas la douleur maximale.",
      ],
    },
    {
      id: 'repos',
      title: 'Temps de repos entre les séries',
      paragraphs: [
        "Le repos doit permettre de maintenir la qualité des répétitions et la charge prévue. Les mouvements polyarticulaires lourds demandent généralement davantage de récupération que les exercices d'isolation.",
        "Un repos trop court peut réduire les répétitions réalisables et le volume utile. La durée pertinente dépend donc du mouvement, de l'objectif de la série et de l'expérience du pratiquant.",
      ],
      table: {
        caption: 'Repères pratiques de récupération',
        headers: ["Type d'exercice", 'Repos indicatif', 'Objectif'],
        rows: [
          ['Mouvement polyarticulaire lourd', '2 à 3 minutes', 'Préserver force et technique'],
          ['Mouvement polyarticulaire modéré', '90 secondes à 2 minutes', 'Maintenir le volume utile'],
          ["Exercice d'isolation", '60 à 90 secondes', 'Récupérer localement'],
        ],
      },
    },
    {
      id: 'volume',
      title: "Volume d'entraînement",
      paragraphs: [
        "Le volume correspond notamment au nombre de séries exigeantes réalisées pour un groupe musculaire. Il doit être suffisant pour provoquer une adaptation, sans dépasser la capacité de récupération individuelle.",
        "Une progression graduelle est préférable à un saut brutal. Le bon volume est celui qui permet encore de progresser, de récupérer et de conserver une exécution de qualité.",
      ],
      table: {
        caption: 'Repères de volume hebdomadaire à individualiser',
        headers: ['Expérience', 'Point de départ indicatif', 'Priorité'],
        rows: [
          ['Débutant', '6 à 10 séries par muscle', 'Technique et régularité'],
          ['Intermédiaire', '10 à 16 séries par muscle', 'Progression mesurée'],
          ['Avancé', 'Volume individualisé', 'Récupération et périodisation'],
        ],
      },
    },
    {
      id: 'frequence',
      title: "Fréquence d'entraînement",
      paragraphs: [
        "Répartir le volume d'un muscle sur plusieurs séances peut améliorer la qualité de travail et rendre la récupération plus prévisible. La fréquence reste toutefois un moyen d'organiser le volume, et non une garantie de résultat à elle seule.",
        "Deux expositions hebdomadaires constituent souvent un repère pratique, mais un programme doit rester compatible avec le niveau, l'emploi du temps et la récupération du pratiquant.",
      ],
    },
    {
      id: 'repetitions',
      title: 'Répétitions et charge',
      paragraphs: [
        "La prise de muscle peut être stimulée avec différentes charges lorsque les séries sont suffisamment exigeantes. Une fourchette modérée reste souvent pratique parce qu'elle équilibre tension, contrôle technique et fatigue.",
      ],
      table: {
        caption: "Repères selon l'objectif principal",
        headers: ['Orientation', 'Répétitions indicatives', 'Point de vigilance'],
        rows: [
          ['Force', '1 à 5', 'Technique et récupération nerveuse'],
          ['Hypertrophie', '6 à 15', "Proximité de l'échec et contrôle"],
          ['Endurance locale', '15 et plus', 'Fatigue et exécution'],
        ],
      },
    },
    {
      id: 'progression',
      title: 'Progressive overload',
      paragraphs: [
        "La surcharge progressive consiste à augmenter graduellement la difficulté utile : davantage de répétitions, une charge supérieure, une meilleure amplitude ou une exécution plus maîtrisée.",
        "La double progression est une méthode simple : progresser dans une fourchette de répétitions, puis augmenter légèrement la charge lorsque toutes les séries atteignent le haut de la fourchette.",
      ],
    },
    {
      id: 'prefatigue',
      title: 'Pré-fatigue et ordre des exercices',
      paragraphs: [
        "La pré-fatigue place un exercice d'isolation avant un mouvement composé afin d'accentuer le travail perçu d'un muscle. Elle peut être utilisée ponctuellement, mais elle réduit parfois la performance sur le mouvement principal.",
        "L'ordre des exercices doit suivre la priorité de la séance : les mouvements les plus importants ou techniques sont généralement réalisés lorsque la fatigue est encore basse.",
      ],
    },
    {
      id: 'split',
      title: "Choisir son split d'entraînement",
      paragraphs: [
        "Full body, haut/bas et Push/Pull/Legs sont des façons différentes de répartir les mêmes priorités. Aucun split n'est universellement supérieur : le meilleur est celui qui permet de couvrir les groupes musculaires, progresser et récupérer avec régularité.",
      ],
    },
    {
      id: 'recuperation',
      title: 'Sommeil, stress et récupération',
      paragraphs: [
        "L'adaptation se produit entre les séances. Sommeil, alimentation, stress et charge totale d'entraînement influencent la capacité à répéter un effort de qualité.",
        "Une baisse durable des performances, une fatigue inhabituelle ou des douleurs persistantes justifient une réduction temporaire de la charge et, si nécessaire, l'avis d'un professionnel.",
      ],
    },
    {
      id: 'suivi',
      title: 'Suivre et ajuster son programme',
      paragraphs: [
        "Un carnet d'entraînement permet de distinguer une impression ponctuelle d'une tendance réelle. Charges, répétitions, difficulté perçue et récupération donnent les informations nécessaires pour ajuster le programme.",
        "Les outils numériques peuvent faciliter ce suivi, mais ils ne remplacent ni la technique, ni la constance, ni le jugement d'un professionnel qualifié lorsque la situation l'exige.",
      ],
      links: [
        {
          href: '/fr/coach-sportif-ia',
          label: 'Découvrir un programme adapté à vos objectifs',
        },
      ],
    },
  ],
  disclaimer:
    "Ce guide est informatif. Il ne remplace pas l'évaluation d'un professionnel de santé ou de l'entraînement, notamment en cas de douleur, blessure ou pathologie.",
  editorialReview: [
    { topic: 'Études 2025-2026', reason: 'Références complètes et conclusions à vérifier avant réintégration.' },
    { topic: 'PPL et statistiques de compétiteurs', reason: 'Claims absolus et pourcentages retirés dans l’attente de sources.' },
    { topic: 'Marché et adoption de l’IA', reason: 'Chiffres commerciaux non nécessaires au contenu evergreen.' },
    { topic: 'Offre MoovX', reason: 'Prix, durée d’essai et fonctionnalités à valider avant affichage.' },
  ],
}

const nutrition: GuideContent = {
  slug: 'nutrition',
  title: 'Guide de nutrition sportive : protéines, macros et repas | MoovX',
  description:
    'Comprendre calories, protéines, macronutriments, répartition des repas, prise de masse, perte de gras et hydratation.',
  headline: 'Le guide de la nutrition sportive',
  lead:
    "Un guide pilier pour comprendre les bases de la nutrition sportive et construire une alimentation compatible avec son objectif, son entraînement et son quotidien.",
  readingMinutes: 20,
  datePublished: '2026-04-01',
  dateModified: '2026-08-16',
  sections: [
    {
      id: 'calories',
      title: 'Calories et balance énergétique',
      paragraphs: [
        "Le poids évolue principalement selon l'équilibre entre l'énergie consommée et l'énergie dépensée. Les besoins réels varient avec le gabarit, l'activité, l'entraînement et les adaptations individuelles.",
        "Une estimation calorique sert de point de départ. La tendance du poids, les performances, la faim et la récupération permettent ensuite de l'ajuster progressivement.",
      ],
      links: [
        {
          href: '/fr/outils/calculateur-calories-macros',
          label: 'Estimer vos besoins caloriques',
        },
      ],
    },
    {
      id: 'proteines',
      title: 'Protéines et récupération musculaire',
      paragraphs: [
        "Les protéines apportent les acides aminés nécessaires à l'entretien et à la réparation des tissus. Chez une personne active, les besoins sont généralement supérieurs au minimum prévu pour une population sédentaire.",
        "La quantité quotidienne compte davantage que le choix d'un aliment ou d'un supplément isolé. Une alimentation variée peut combiner produits animaux ou végétaux selon les préférences et contraintes individuelles.",
      ],
      table: {
        caption: 'Repères protéiques généraux à individualiser',
        headers: ['Situation', 'Repère quotidien', 'Remarque'],
        rows: [
          ['Sport loisir', '1,2 à 1,6 g/kg', 'Selon fréquence et intensité'],
          ['Musculation', '1,6 à 2,0 g/kg', 'Répartir sur la journée'],
          ['Déficit énergétique', 'Besoin potentiellement accru', 'À adapter au contexte individuel'],
        ],
      },
    },
    {
      id: 'macros',
      title: 'Répartir les macronutriments',
      paragraphs: [
        "Les protéines soutiennent les tissus, les glucides alimentent notamment les efforts intenses et les lipides participent à de nombreuses fonctions physiologiques. Leur répartition dépend de l'objectif et des préférences.",
        "Une répartition utile doit être soutenable. Les pourcentages théoriques sont moins importants que l'adéquation des apports, la qualité alimentaire et la régularité.",
      ],
    },
    {
      id: 'timing',
      title: 'Timing des repas',
      paragraphs: [
        "L'apport total de la journée reste prioritaire. Autour de l'entraînement, un repas contenant protéines et glucides peut néanmoins faciliter la récupération et la disponibilité énergétique.",
        "La prétendue fenêtre de quelques minutes après l'effort est trop restrictive. Une organisation régulière des repas est généralement plus utile qu'une contrainte horaire difficile à tenir.",
      ],
    },
    {
      id: 'distribution',
      title: 'Distribution des protéines',
      paragraphs: [
        "Répartir les protéines entre plusieurs repas permet d'éviter de concentrer l'essentiel de l'apport sur un seul moment. Le nombre exact de repas dépend ensuite de l'appétit et du rythme de vie.",
      ],
      table: {
        caption: 'Exemple de répartition quotidienne',
        headers: ['Moment', 'Composition possible', 'Objectif'],
        rows: [
          ['Petit-déjeuner', 'Source protéique et féculent ou fruit', 'Commencer la répartition'],
          ['Déjeuner', 'Protéines, légumes et glucides', 'Repas complet'],
          ['Collation', 'Option protéique selon les besoins', 'Compléter sans obligation'],
          ['Dîner', 'Protéines, légumes et énergie adaptée', 'Atteindre le total quotidien'],
        ],
      },
    },
    {
      id: 'prise-de-masse',
      title: 'Prise de masse progressive',
      paragraphs: [
        "Une prise de masse vise un surplus énergétique modéré et ajusté selon l'évolution du poids et des performances. Un surplus excessif n'accélère pas proportionnellement la construction musculaire.",
        "La progression doit être évaluée sur plusieurs semaines afin de limiter les ajustements impulsifs liés aux variations quotidiennes d'eau et de glycogène.",
      ],
      links: [
        {
          href: '/fr/nutrition/prise-de-masse',
          label: 'Construire un plan de prise de masse',
        },
      ],
    },
    {
      id: 'perte-de-gras',
      title: 'Perdre du gras en préservant le muscle',
      paragraphs: [
        "Un déficit énergétique progressif, un apport protéique adapté et le maintien d'un entraînement de résistance contribuent à préserver la masse musculaire.",
        "Les déficits très agressifs augmentent les contraintes de faim, de fatigue et de récupération. La vitesse de perte doit rester compatible avec la santé et le niveau d'activité.",
      ],
    },
    {
      id: 'supplements',
      title: 'Suppléments : hiérarchiser les priorités',
      paragraphs: [
        "Les suppléments ne compensent pas une alimentation insuffisante, un sommeil irrégulier ou un programme mal construit. Leur intérêt dépend du besoin, de la qualité des preuves et du contexte individuel.",
        "Une supplémentation peut présenter des contre-indications. En cas de doute, de traitement ou de pathologie, elle doit être discutée avec un professionnel de santé.",
      ],
    },
    {
      id: 'hydratation',
      title: 'Hydratation',
      paragraphs: [
        "Les besoins hydriques dépendent de la température, de la transpiration, de l'alimentation et de la durée de l'effort. Une recommandation fixe ne convient donc pas à toutes les situations.",
        "Boire régulièrement et observer la soif, les conditions d'entraînement et les pertes importantes constitue une base pratique. Les efforts longs ou très chauds peuvent aussi nécessiter une attention aux électrolytes.",
      ],
    },
    {
      id: 'suivi',
      title: 'Suivi nutritionnel et outils numériques',
      paragraphs: [
        "Le suivi peut aider à comprendre ses habitudes, mais sa précision reste limitée par les portions, les bases alimentaires et les estimations. Il doit servir la décision plutôt que devenir une contrainte permanente.",
        "Les outils numériques peuvent simplifier la planification et la saisie. Leurs recommandations doivent rester transparentes, ajustables et compatibles avec les besoins réels de la personne.",
      ],
    },
  ],
  disclaimer:
    "Ce guide est informatif et ne remplace pas un avis médical ou diététique personnalisé. Demandez conseil à un professionnel en cas de pathologie, grossesse, trouble alimentaire ou traitement.",
  editorialReview: [
    { topic: 'Dosages et recommandations', reason: 'Les valeurs précises doivent être reliées à des sources complètes et contextualisées.' },
    { topic: 'Statistiques de marché et concurrence', reason: 'Chiffres MyFitnessPal, IA et précision photo retirés avant vérification.' },
    { topic: 'Suppléments et hydratation', reason: 'Claims médicaux et dosages à faire relire avant réintégration.' },
    { topic: 'Offre MoovX', reason: 'Prix, durée d’essai, volumes d’aliments et fonctions à valider.' },
  ],
}

export const GUIDES: Record<GuideSlug, GuideContent> = {
  musculation,
  nutrition,
}

export function getGuide(slug: string): GuideContent | undefined {
  return GUIDES[slug as GuideSlug]
}

export function getAllGuides(): GuideContent[] {
  return Object.values(GUIDES)
}
