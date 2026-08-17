export type BulkGainLink = {
  href: string
  label: string
  description: string
}

export type BulkGainMealExample = {
  meal: string
  composition: string
  purpose: string
}

export type BulkGainSection = {
  id: string
  title: string
  paragraphs: readonly string[]
  points?: readonly string[]
  exampleMeals?: readonly BulkGainMealExample[]
}

export type BulkGainSource = {
  label: string
  url: string
}

export type BulkGainContent = {
  title: string
  seoTitle: string
  description: string
  introduction: string
  sections: readonly BulkGainSection[]
  links: readonly BulkGainLink[]
  disclaimer: string
  sources: readonly BulkGainSource[]
}

export const BULK_GAIN_CONTENT: BulkGainContent = {
  title: 'Prise de masse : construire son programme alimentaire',
  seoTitle: 'Prise de masse : alimentation, calories et macros | MoovX',
  description: 'Comprenez le surplus calorique, les protéines et les repas pour une prise de masse progressive, puis estimez vos besoins avec le calculateur MoovX.',
  introduction: 'Une prise de masse combine un entraînement structuré, une alimentation suffisante et une observation régulière. L’objectif n’est pas d’appliquer un menu universel, mais de partir d’une estimation puis d’adapter progressivement les apports à la réponse réelle du corps.',
  sections: [
    {
      id: 'definition',
      title: 'Qu’est-ce qu’une prise de masse ?',
      paragraphs: [
        'La prise de masse est une période pendant laquelle l’alimentation accompagne un objectif de progression musculaire. Elle repose sur un apport énergétique suffisant, un entraînement de résistance cohérent et une récupération adaptée.',
        'L’évolution dépend du niveau, du programme, du sommeil, de la régularité et du profil individuel. Le poids seul ne permet donc pas d’évaluer la qualité de la démarche.',
      ],
    },
    {
      id: 'calories',
      title: 'Calories de maintien et surplus progressif',
      paragraphs: [
        'Les calories de maintien représentent une estimation de l’apport associé à un poids globalement stable. En prise de masse, ce repère peut être ajusté progressivement selon l’évolution observée.',
        'Le calculateur MoovX fournit un point de départ à partir du poids, de la taille, de l’âge et du niveau d’activité. Cette estimation ne remplace pas plusieurs semaines d’observation dans des conditions comparables.',
      ],
      points: [
        'Observer une tendance plutôt qu’une mesure isolée.',
        'Modifier les apports par étapes plutôt que multiplier les changements simultanés.',
        'Tenir compte de la faim, de la digestion, de la récupération et des performances.',
      ],
    },
    {
      id: 'macros',
      title: 'Protéines, glucides et lipides',
      paragraphs: [
        'Les protéines participent au renouvellement des tissus. Les glucides contribuent à l’énergie disponible pour les séances, tandis que les lipides remplissent plusieurs fonctions énergétiques et physiologiques.',
        'Une répartition utile doit rester compatible avec le total calorique, les préférences alimentaires et la tolérance digestive. Elle peut évoluer sans imposer les mêmes proportions à chaque personne.',
      ],
    },
    {
      id: 'journee-exemple',
      title: 'Exemple pédagogique d’une journée alimentaire',
      paragraphs: [
        'Cet exemple pédagogique uniquement illustre une organisation possible. Les aliments, les portions et le nombre de repas doivent être adaptés au profil, aux contraintes et aux besoins estimés.',
      ],
      exampleMeals: [
        { meal: 'Petit-déjeuner', composition: 'Source de protéines, céréales ou pain, fruit et matière grasse', purpose: 'Commencer la journée avec un repas complet et reproductible' },
        { meal: 'Déjeuner', composition: 'Protéines, féculent, légumes et assaisonnement', purpose: 'Réunir énergie, diversité alimentaire et satiété' },
        { meal: 'Collation', composition: 'Produit laitier ou alternative, fruit et oléagineux selon les besoins', purpose: 'Compléter la journée lorsque les repas principaux ne suffisent pas' },
        { meal: 'Dîner', composition: 'Protéines, source de glucides, légumes et matière grasse', purpose: 'Soutenir la récupération dans une organisation digeste' },
      ],
    },
    {
      id: 'entrainement',
      title: 'Associer alimentation et entraînement',
      paragraphs: [
        'Un apport alimentaire supérieur ne construit pas à lui seul un programme de progression. Les exercices, le volume, l’intensité et la surcharge progressive organisent le stimulus auquel l’alimentation contribue à répondre.',
        'Le programme doit également laisser une place suffisante à la récupération. Ajouter des séances sans tenir compte de la fatigue peut rendre le suivi plus difficile à interpréter.',
      ],
    },
    {
      id: 'suivi',
      title: 'Suivre poids, performances et récupération',
      paragraphs: [
        'Le suivi peut combiner une moyenne de poids, les charges ou répétitions réalisées, les mensurations, la qualité du sommeil et les sensations pendant les séances.',
        'Comparer ces indicateurs sur plusieurs semaines aide à décider s’il faut conserver l’organisation actuelle ou ajuster progressivement les apports et l’entraînement.',
      ],
    },
    {
      id: 'erreurs',
      title: 'Erreurs fréquentes',
      paragraphs: [
        'Les difficultés viennent souvent d’une organisation trop complexe, de changements trop fréquents ou d’un suivi limité à la balance. Une approche simple facilite l’identification de ce qui fonctionne réellement.',
      ],
      points: [
        'Augmenter fortement les portions sans observer la réponse individuelle.',
        'Négliger les glucides, les lipides, les fibres ou l’hydratation.',
        'Modifier simultanément l’alimentation, le volume et la fréquence d’entraînement.',
        'Confondre une fluctuation quotidienne avec une tendance durable.',
        'Utiliser des compléments pour remplacer une alimentation peu structurée.',
      ],
    },
    {
      id: 'personnalisation',
      title: 'Personnalisation avec MoovX',
      paragraphs: [
        'MoovX aide à transformer des informations de profil en repères de calories et de macros, puis à organiser le suivi dans un même parcours. Les résultats restent des estimations qui doivent être confrontées aux observations réelles.',
        'Commencez par le calculateur pour obtenir un point de départ, puis adaptez votre organisation alimentaire et sportive à votre contexte.',
      ],
    },
  ],
  links: [
    { href: '/fr/outils/calculateur-calories-macros', label: 'Estimer mes calories et mes macros', description: 'Obtenir un point de départ selon votre profil et votre objectif.' },
    { href: '/fr/guides/nutrition', label: 'Guide de la nutrition sportive', description: 'Approfondir calories, macros, repas et récupération.' },
    { href: '/fr/guides/musculation', label: 'Guide de la musculation', description: 'Structurer entraînement, volume et progression.' },
    { href: '/fr/blog/combien-de-proteines-prise-de-muscle', label: 'Combien de protéines pour prendre du muscle ?', description: 'Consulter les repères et les références scientifiques disponibles.' },
    { href: '/fr/blog/creatine-musculation-dosage-science', label: 'Créatine et musculation', description: 'Comprendre le rôle, les limites et les précautions liées à la créatine.' },
  ],
  disclaimer: 'Ce contenu et le calculateur associé sont informatifs. Ils ne remplacent ni un diagnostic ni une prescription médicale ou diététique. En cas de pathologie, de grossesse, de traitement ou de besoins particuliers, consultez un professionnel qualifié.',
  sources: [
    { label: 'Morton et al. — Protein supplementation and resistance training, British Journal of Sports Medicine (2018)', url: 'https://pubmed.ncbi.nlm.nih.gov/28698222/' },
    { label: 'Jäger et al. — ISSN Position Stand: protein and exercise (2017)', url: 'https://jissn.biomedcentral.com/articles/10.1186/s12970-017-0177-8' },
  ],
}
