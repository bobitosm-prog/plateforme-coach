export interface AiCoachLink {
  readonly href: string
  readonly label: string
  readonly description: string
}

export interface AiCoachSection {
  readonly id: string
  readonly title: string
  readonly paragraphs: readonly string[]
  readonly points?: readonly string[]
  readonly links?: readonly AiCoachLink[]
}

export const AI_COACH_PAGE = {
  title: 'Coach sportif IA : programme fitness personnalisé | MoovX',
  description:
    'Découvrez comment MoovX utilise l’IA pour créer un programme de fitness selon votre objectif, votre niveau, votre matériel et vos disponibilités.',
  headline: 'Coach sportif IA : un programme adapté à votre profil',
  lead:
    'MoovX utilise l’intelligence artificielle pour proposer une organisation d’entraînement contextualisée, puis relie cette proposition au suivi de vos séances et à vos objectifs nutritionnels.',
  datePublished: '2026-08-17',
  dateModified: '2026-08-17',
  sections: [
    {
      id: 'definition',
      title: 'Qu’est-ce qu’un coach sportif IA ?',
      paragraphs: [
        'Un coach sportif IA est un outil numérique qui utilise un modèle génératif pour produire une proposition d’entraînement à partir d’instructions et de données structurées. La réponse n’est pas une vérité universelle : elle constitue un point de départ à vérifier et à ajuster.',
        'Dans MoovX, la personnalisation repose sur les informations que vous fournissez. L’outil transforme ce contexte en une proposition organisée, sans prétendre connaître votre corps au-delà des données disponibles.',
      ],
    },
    {
      id: 'personnalisation',
      title: 'Comment MoovX personnalise votre programme',
      paragraphs: [
        'La création du programme tient compte de votre objectif, de votre niveau déclaré, du nombre de jours disponibles, de la durée prévue des séances et du matériel accessible. Des préférences ou priorités peuvent compléter ce contexte.',
        'Ces paramètres permettent de construire une proposition plus pertinente qu’un plan identique distribué à tous. Ils ne remplacent cependant ni votre ressenti pendant l’effort ni l’avis d’un professionnel lorsque votre situation le nécessite.',
      ],
      points: [
        'Objectif sportif et niveau d’expérience.',
        'Nombre de séances et durée disponible.',
        'Entraînement en salle, à domicile ou avec un matériel précis.',
        'Préférences et priorités communiquées lors de la création.',
      ],
    },
    {
      id: 'creation-entrainement',
      title: 'Création d’un entraînement adapté',
      paragraphs: [
        'MoovX organise la proposition en journées, exercices, séries, répétitions et temps de repos. Les exercices sont rapprochés d’un catalogue utilisé par l’application et la structure produite est contrôlée avant d’être présentée.',
        'Cette organisation facilite le passage d’une intention générale — progresser, reprendre une activité ou développer sa musculature — à un programme consultable pendant les séances.',
      ],
      links: [
        {
          href: '/fr/guides/musculation',
          label: 'Comprendre la construction d’un programme',
          description: 'Consultez les principes de volume, fréquence, progression et récupération.',
        },
      ],
    },
    {
      id: 'suivi-ajustements',
      title: 'Suivi et ajustements',
      paragraphs: [
        'Plusieurs mécanismes distincts accompagnent le programme. Une séance peut être adaptée ponctuellement à votre temps disponible. Un diagnostic hebdomadaire peut rapprocher séances réalisées, volume, nutrition et évolution du poids afin de proposer des ajustements.',
        'Lorsque vous décidez d’appliquer une recommandation, un programme peut être régénéré avec le nouvel objectif de volume. Un renouvellement périodique peut aussi faire varier la structure. Le programme ne se modifie pas seul après chaque séance.',
      ],
      points: [
        'Adaptation ponctuelle d’une séance selon le contexte indiqué.',
        'Diagnostic hebdomadaire fondé sur les données disponibles.',
        'Régénération après application explicite d’une recommandation.',
        'Renouvellement périodique pour faire évoluer la structure.',
      ],
    },
    {
      id: 'nutrition',
      title: 'Nutrition associée',
      paragraphs: [
        'L’entraînement et la nutrition répondent à des objectifs liés, mais ils restent deux dimensions distinctes. MoovX permet d’estimer des calories et des macros, puis de relier ces repères à des préférences alimentaires et à un suivi quotidien.',
        'Les estimations nutritionnelles ne constituent pas une prescription. Leur pertinence doit être réévaluée selon votre évolution et vos besoins particuliers.',
      ],
      links: [
        {
          href: '/fr/outils/calculateur-calories-macros',
          label: 'Estimer mes calories et mes macros',
          description: 'Obtenez un point de départ selon votre profil, votre activité et votre objectif.',
        },
        {
          href: '/fr/nutrition/prise-de-masse',
          label: 'Construire une prise de masse progressive',
          description: 'Reliez surplus estimé, macros, alimentation et suivi de la progression.',
        },
        {
          href: '/fr/guides/nutrition',
          label: 'Guide de nutrition sportive',
          description: 'Approfondissez les calories, macronutriments et choix alimentaires.',
        },
      ],
    },
    {
      id: 'programme-contextualise',
      title: 'IA ou programme générique : quelle différence ?',
      paragraphs: [
        'Un programme fixe décrit une même organisation pour un large public. Un programme contextualisé utilise vos informations pour sélectionner une structure compatible avec vos contraintes déclarées.',
        'La contextualisation améliore la pertinence du point de départ, mais elle ne rend pas chaque recommandation exacte par définition. Le suivi, le ressenti et la régularité restent indispensables pour décider des ajustements utiles.',
      ],
    },
    {
      id: 'limites',
      title: 'Les limites de l’IA',
      paragraphs: [
        'Une sortie générée peut être incomplète ou inadaptée à une situation individuelle. Vérifiez les exercices proposés, commencez avec une charge maîtrisée et interrompez une séance en cas de douleur inhabituelle.',
        'MoovX ne fournit pas de diagnostic médical. En cas de blessure, pathologie, grossesse, traitement, trouble alimentaire ou doute sur votre aptitude à pratiquer, demandez l’avis d’un médecin ou d’un professionnel qualifié.',
      ],
      points: [
        'Les informations manquantes limitent la personnalisation.',
        'Une recommandation doit rester compatible avec votre ressenti réel.',
        'Les situations médicales nécessitent un accompagnement approprié.',
        'Un professionnel peut apporter observation directe, jugement et responsabilité humaine.',
      ],
    },
    {
      id: 'pourquoi-moovx',
      title: 'Pourquoi utiliser MoovX ?',
      paragraphs: [
        'MoovX rassemble la création du programme, son utilisation pendant les séances, le suivi des performances et les objectifs nutritionnels dans un même parcours. Vous conservez ainsi le contexte nécessaire pour comparer la proposition initiale à votre pratique réelle.',
        'L’objectif n’est pas de déléguer toutes vos décisions, mais de réduire la friction entre planification, exécution et suivi grâce à une aide structurée.',
      ],
    },
  ] satisfies readonly AiCoachSection[],
} as const
