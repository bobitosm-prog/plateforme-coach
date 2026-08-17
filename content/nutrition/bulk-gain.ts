export interface BulkGainLink {
  readonly href: string
  readonly label: string
  readonly description: string
}

export interface BulkGainSection {
  readonly id: string
  readonly title: string
  readonly paragraphs: readonly string[]
  readonly points?: readonly string[]
  readonly links?: readonly BulkGainLink[]
}

export interface BulkGainSource {
  readonly authors: string
  readonly title: string
  readonly publication: string
  readonly year: number
  readonly url: string
}

export const BULK_GAIN_PAGE = {
  title: 'Prise de masse : alimentation, calories et macros | MoovX',
  description:
    'Comprenez le surplus calorique, les protéines et les repas pour une prise de masse progressive, puis estimez vos besoins avec le calculateur MoovX.',
  headline: 'Prise de masse : construire son programme alimentaire',
  lead:
    "Une démarche progressive pour relier alimentation, entraînement et suivi, sans transformer une estimation calorique en règle universelle.",
  datePublished: '2026-08-17',
  dateModified: '2026-08-17',
  sections: [
    {
      id: 'definition',
      title: "Qu'est-ce que la prise de masse ?",
      paragraphs: [
        "La prise de masse désigne une période pendant laquelle l'alimentation et l'entraînement sont organisés pour soutenir une progression musculaire. Une hausse du poids ne correspond toutefois pas automatiquement à une hausse équivalente de masse musculaire : l'eau, le glycogène, le contenu digestif et la masse grasse peuvent aussi évoluer.",
        "L'objectif utile n'est donc pas de manger le plus possible, mais de construire une stratégie compatible avec votre profil, votre expérience, votre récupération et votre progression à l'entraînement.",
      ],
    },
    {
      id: 'calories',
      title: 'Calories, maintien et surplus énergétique',
      paragraphs: [
        "Les calories de maintien représentent une estimation de l'apport associé à un poids globalement stable. Elles dépendent notamment du gabarit et du niveau d'activité, mais une équation ne mesure pas directement votre dépense réelle.",
        "Un surplus énergétique consiste à viser un apport supérieur à cette maintenance estimée. Son ampleur doit rester adaptable : la recherche ne permet pas de définir un surplus optimal identique pour tout le monde. La tendance du poids, les performances, la faim et la récupération servent ensuite à ajuster l'hypothèse initiale.",
      ],
      links: [
        {
          href: '/fr/outils/calculateur-calories-macros',
          label: 'Estimer mes calories et mes macros',
          description: "Utilisez le calculateur MoovX et sélectionnez l'objectif « Prise de muscle ».",
        },
      ],
    },
    {
      id: 'macros',
      title: 'Protéines, glucides et lipides',
      paragraphs: [
        "Les protéines fournissent les acides aminés nécessaires à l'entretien et à la réparation des tissus. Les glucides contribuent à l'énergie disponible pour les efforts intenses, tandis que les lipides participent à de nombreuses fonctions physiologiques.",
        "La répartition dépend de l'apport calorique estimé, du poids, de l'objectif et des préférences alimentaires. Une cible chiffrée reste un point de départ à adapter, pas un dosage obligatoire.",
      ],
      links: [
        {
          href: '/fr/guides/nutrition',
          label: 'Comprendre la nutrition sportive',
          description: 'Approfondissez les calories, les macronutriments et la répartition des repas.',
        },
        {
          href: '/fr/blog/combien-de-proteines-prise-de-muscle',
          label: 'Protéines et prise de muscle',
          description: "Consultez l'article dédié aux apports protéiques et à leurs sources scientifiques.",
        },
      ],
    },
    {
      id: 'journee-fictive',
      title: "Exemple fictif d'une journée alimentaire",
      paragraphs: [
        "Cet exemple est pédagogique uniquement. Les quantités, aliments et horaires doivent varier selon les besoins estimés, l'appétit, les préférences, les allergies et le quotidien.",
      ],
      points: [
        'Petit-déjeuner : céréales ou pain, source protéique, fruit et oléagineux selon les besoins.',
        'Déjeuner : féculent, source de protéines, légumes et matière grasse choisie.',
        "Collation : fruit, produit laitier ou alternative végétale, avec un complément énergétique si l'appétit le permet.",
        'Dîner : féculent ou légumineuse, source protéique, légumes et assaisonnement adapté.',
      ],
    },
    {
      id: 'entrainement',
      title: 'Associer nutrition et entraînement',
      paragraphs: [
        "Un apport énergétique supérieur ne remplace pas un entraînement structuré. La progression musculaire dépend aussi d'un stimulus répété, d'une charge de travail adaptée et d'une récupération suffisante.",
        "Le programme doit rester soutenable. Charges, répétitions, volume et qualité d'exécution donnent des repères plus utiles qu'une recherche permanente de fatigue maximale.",
      ],
      links: [
        {
          href: '/fr/guides/musculation',
          label: 'Guide de musculation',
          description: "Reliez votre alimentation aux principes d'hypertrophie, de volume et de progression.",
        },
        {
          href: '/fr/blog/creatine-musculation-dosage-science',
          label: 'Créatine : effets et niveau de preuve',
          description: 'Distinguez les données disponibles des promesses liées aux suppléments.',
        },
      ],
    },
    {
      id: 'suivi',
      title: 'Suivre sa progression',
      paragraphs: [
        "Les variations quotidiennes de poids sont bruitées. Une tendance observée sur plusieurs semaines, associée aux performances et au ressenti, apporte davantage d'information qu'une mesure isolée.",
        "Si la progression ne correspond pas à l'objectif, l'apport estimé peut être ajusté progressivement selon votre profil. Une fatigue durable, une digestion difficile ou une évolution trop rapide justifient également de réévaluer le plan.",
      ],
      points: [
        'Observer la tendance du poids dans des conditions comparables.',
        "Noter les performances et la qualité de l'entraînement.",
        'Surveiller récupération, sommeil, appétit et confort digestif.',
        'Modifier une variable à la fois avant de réévaluer.',
      ],
    },
    {
      id: 'erreurs',
      title: 'Erreurs fréquentes',
      paragraphs: [
        "Une stratégie devient difficile à interpréter lorsque l'apport change brutalement, que le suivi est irrégulier ou que l'entraînement ne progresse pas. La constance facilite les ajustements.",
      ],
      points: [
        'Confondre prise de poids rapide et progression musculaire.',
        "Augmenter fortement les calories avant d'avoir observé la maintenance estimée.",
        'Négliger les fruits, légumes, fibres et la variété alimentaire.',
        'Copier les quantités ou le menu d’une autre personne.',
        "Attendre d'un supplément qu'il remplace l'alimentation, l'entraînement ou le sommeil.",
      ],
    },
    {
      id: 'moovx',
      title: 'Comment MoovX personnalise un plan nutritionnel',
      paragraphs: [
        "MoovX relie les objectifs calories et macros à vos préférences alimentaires pour structurer un plan de repas consultable et ajustable. Le journal nutritionnel et le suivi du poids permettent ensuite de comparer l'estimation initiale à votre évolution réelle.",
        "La création d'un compte apporte la continuité entre calcul, planification et suivi. Elle ne transforme pas une estimation en diagnostic et ne remplace pas un accompagnement médical ou diététique lorsque celui-ci est nécessaire.",
      ],
    },
  ] satisfies readonly BulkGainSection[],
  sources: [
    {
      authors: 'Slater GJ, Dieter BP, Marsh DJ, et al.',
      title: 'Is an Energy Surplus Required to Maximize Skeletal Muscle Hypertrophy Associated With Resistance Training?',
      publication: 'Frontiers in Nutrition',
      year: 2019,
      url: 'https://pubmed.ncbi.nlm.nih.gov/31482093/',
    },
    {
      authors: 'Morton RW, Murphy KT, McKellar SR, et al.',
      title: 'Protein supplementation and resistance training-induced gains in muscle mass and strength',
      publication: 'British Journal of Sports Medicine',
      year: 2018,
      url: 'https://pubmed.ncbi.nlm.nih.gov/28698222/',
    },
    {
      authors: 'Jäger R, Kerksick CM, Campbell BI, et al.',
      title: 'International Society of Sports Nutrition Position Stand: protein and exercise',
      publication: 'Journal of the International Society of Sports Nutrition',
      year: 2017,
      url: 'https://jissn.biomedcentral.com/articles/10.1186/s12970-017-0177-8',
    },
  ] satisfies readonly BulkGainSource[],
  disclaimer:
    "Cette page est informative et ne constitue ni un diagnostic ni une prescription nutritionnelle. Demandez conseil à un professionnel de santé ou de la nutrition en cas de pathologie, grossesse, trouble alimentaire, traitement ou besoin particulier.",
} as const
