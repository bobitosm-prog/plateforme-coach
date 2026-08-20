export type WeightLossLink = {
  href: string
  label: string
  description: string
}

export type WeightLossSection = {
  id: string
  title: string
  paragraphs: readonly string[]
  points?: readonly string[]
  contextualLink?: WeightLossLink
}

export type WeightLossContent = {
  title: string
  seoTitle: string
  description: string
  introduction: string
  sections: readonly WeightLossSection[]
  links: readonly WeightLossLink[]
  disclaimer: string
}

export const WEIGHT_LOSS_CONTENT: WeightLossContent = {
  title: 'Perte de poids : construire une stratégie adaptée',
  seoTitle: 'Perte de poids : calories, alimentation et suivi | MoovX',
  description: 'Comprenez le déficit énergétique, estimez vos calories et organisez votre alimentation pour suivre une perte de poids progressive avec MoovX.',
  introduction: 'Une démarche de perte de poids repose sur un équilibre énergétique adapté, une alimentation compatible avec le quotidien et un suivi régulier. Les estimations donnent un point de départ : l’évolution réelle du poids, de l’énergie et des habitudes permet ensuite d’ajuster progressivement l’organisation.',
  sections: [
    {
      id: 'deficit-energetique',
      title: 'Comprendre le déficit énergétique',
      paragraphs: [
        'Le poids tend à diminuer lorsque les apports énergétiques restent, sur la durée, inférieurs aux dépenses. Ce principe ne fournit toutefois pas une valeur universelle : les besoins varient selon le profil, l’activité et le contexte de vie.',
        'Une estimation de départ doit être confrontée à plusieurs semaines d’observation. Les fluctuations quotidiennes liées à l’hydratation, aux repas ou au transit ne décrivent pas à elles seules une tendance durable.',
      ],
      points: [
        'Observer une tendance plutôt qu’une pesée isolée.',
        'Conserver une organisation alimentaire praticable au quotidien.',
        'Réévaluer progressivement les repères selon les observations.',
      ],
    },
    {
      id: 'calories-macros',
      title: 'Estimer ses calories et ses macros',
      paragraphs: [
        'Le métabolisme de repos et les calories de maintien peuvent être estimés à partir de données comme l’âge, le poids, la taille et l’activité. Le calculateur MoovX centralise cette estimation et propose une répartition indicative des protéines, glucides et lipides.',
        'Ces résultats ne sont pas une mesure directe de la dépense énergétique. Ils servent de repère initial, à adapter selon la tendance observée et les sensations quotidiennes.',
      ],
    },
    {
      id: 'alimentation',
      title: 'Organiser une alimentation adaptée',
      paragraphs: [
        'Une alimentation adaptée ne se résume pas à réduire les portions. La régularité des repas, la variété des aliments, les fibres, l’hydratation et la compatibilité avec les préférences personnelles contribuent à rendre l’organisation plus durable.',
        'Le nombre de repas et leur composition peuvent varier. Une structure simple, reproductible et suffisamment flexible facilite généralement le suivi dans le temps.',
      ],
      points: [
        'Prévoir des aliments appréciés et accessibles.',
        'Conserver des sources variées de légumes, fruits et féculents.',
        'Adapter les portions sans exclure arbitrairement un groupe alimentaire.',
      ],
      contextualLink: {
        href: '/fr/nutrition/menu-perte-de-poids',
        label: 'organiser un menu de perte de poids sur une journée',
        description: 'Passer des principes généraux à un exemple alimentaire pédagogique.',
      },
    },
    {
      id: 'proteines-satiete',
      title: 'Protéines et satiété',
      paragraphs: [
        'Les protéines participent au renouvellement des tissus et peuvent contribuer à la satiété dans une alimentation équilibrée. Leur place doit rester cohérente avec les calories totales, les autres macronutriments et les préférences alimentaires.',
        'Les répartir entre plusieurs repas peut simplifier l’organisation, sans imposer le même aliment ni la même quantité à chaque personne.',
      ],
    },
    {
      id: 'suivi-progression',
      title: 'Suivre sa progression avec plusieurs indicateurs',
      paragraphs: [
        'Le suivi peut associer une moyenne de poids, les apports enregistrés, l’activité, les performances, la faim, l’énergie et la récupération. Cette vision évite de prendre une décision à partir d’une seule donnée.',
        'MoovX permet d’enregistrer le poids et les apports alimentaires afin de comparer les tendances. Les ajustements restent des décisions à prendre selon le contexte et les informations disponibles.',
      ],
    },
    {
      id: 'personnalisation-moovx',
      title: 'Personnaliser ses repères avec MoovX',
      paragraphs: [
        'MoovX aide à estimer des objectifs de calories et de macros à partir du profil renseigné, puis à suivre le poids et l’alimentation dans un même parcours. Le résultat reste une estimation et ne prédit pas une évolution individuelle.',
        'Commencez par le calculateur, appliquez un cadre compatible avec votre quotidien, puis utilisez les données enregistrées pour examiner la tendance avant tout ajustement.',
      ],
    },
  ],
  links: [
    {
      href: '/fr/outils/calculateur-calories-macros',
      label: 'Estimer mes calories et mes macros',
      description: 'Obtenir un point de départ selon votre profil, votre activité et votre objectif.',
    },
    {
      href: '/fr/guides/nutrition',
      label: 'Consulter le guide de nutrition',
      description: 'Approfondir les calories, les macronutriments et l’organisation des repas.',
    },
    {
      href: '/fr/nutrition/prise-de-masse',
      label: 'Comprendre la prise de masse',
      description: 'Comparer les principes d’un surplus énergétique avec ceux d’un déficit.',
    },
  ],
  disclaimer: 'Ce contenu fournit des informations générales et des estimations. Il ne se substitue pas à un accompagnement médical ou diététique. En cas de pathologie, de grossesse, de traitement, de trouble du comportement alimentaire ou de besoin particulier, consultez un professionnel qualifié.',
}
