export type DailyProteinLink = {
  href: string
  label: string
  description: string
}

export type DailyProteinSection = {
  id: string
  title: string
  paragraphs: readonly string[]
  points?: readonly string[]
}

export type DailyProteinSource = {
  label: string
  url: string
}

export type DailyProteinContent = {
  title: string
  seoTitle: string
  description: string
  introduction: string
  sections: readonly DailyProteinSection[]
  links: readonly DailyProteinLink[]
  disclaimer: string
  sources: readonly DailyProteinSource[]
}

export const DAILY_PROTEIN_CONTENT: DailyProteinContent = {
  title: 'Combien de protéines par jour ?',
  seoTitle: 'Combien de protéines par jour ? Guide et calcul | MoovX',
  description: 'Découvrez combien de protéines consommer par jour selon votre objectif, comment les répartir et comment les intégrer à vos calories et macros.',
  introduction: 'La quantité de protéines utile au quotidien dépend du profil, de l’activité, de l’objectif et de l’alimentation dans son ensemble. Les repères scientifiques peuvent orienter une estimation, mais ils ne remplacent ni le contexte individuel ni l’observation dans le temps.',
  sections: [
    {
      id: 'combien-par-jour',
      title: 'Combien de protéines par jour ?',
      paragraphs: [
        'Pour un adulte en bonne santé, l’EFSA fixe un apport de référence de population à 0,83 gramme par kilogramme de poids corporel et par jour. Ce repère vise la population générale : il ne constitue pas un objectif sportif personnalisé.',
        'Pour les personnes physiquement actives, la position de l’ISSN situe généralement les apports dans une plage plus élevée, souvent entre 1,4 et 2,0 grammes par kilogramme et par jour. Le niveau pertinent varie notamment avec le type d’entraînement, le volume d’activité et l’apport énergétique total.',
      ],
    },
    {
      id: 'besoins-variables',
      title: 'Pourquoi les besoins varient',
      paragraphs: [
        'Le poids n’est qu’une donnée parmi d’autres. Le niveau d’activité, l’âge, l’objectif, la régularité des séances, les calories disponibles et certaines situations de santé peuvent modifier le repère à considérer.',
        'Deux personnes de même poids peuvent donc organiser différemment leurs apports. Une estimation doit aussi rester compatible avec les glucides, les lipides, les fibres, les préférences et la tolérance digestive.',
      ],
      points: [
        'Distinguer un repère de population d’un objectif sportif.',
        'Considérer l’alimentation complète plutôt qu’un nutriment isolé.',
        'Réévaluer l’organisation lorsque l’activité ou l’objectif change.',
      ],
    },
    {
      id: 'selon-objectif',
      title: 'Selon l’objectif : maintien, perte de poids ou prise de masse',
      paragraphs: [
        'En maintien, les protéines s’intègrent à une répartition équilibrée des calories et des macronutriments. En période de perte de poids, elles peuvent contribuer à la satiété et à la préservation de la masse maigre dans le cadre d’une alimentation adaptée et d’un entraînement cohérent.',
        'En prise de masse, augmenter les calories ne signifie pas augmenter les protéines sans limite. L’énergie totale, les glucides disponibles pour l’entraînement et la progression du programme restent également déterminants.',
        'MoovX distingue ces objectifs dans son calculateur canonique. Le résultat fourni est une estimation liée aux informations saisies, et non une recommandation universelle.',
      ],
    },
    {
      id: 'repartition',
      title: 'Comment répartir les protéines dans la journée',
      paragraphs: [
        'Répartir les sources de protéines entre plusieurs repas peut faciliter l’atteinte du total quotidien et rendre les portions plus simples à organiser. Il n’existe toutefois pas un nombre de repas obligatoire pour tout le monde.',
        'Une méthode pratique consiste à prévoir une source protéinée dans les repas principaux, puis à compléter si nécessaire selon les habitudes et le total estimé. La régularité de l’ensemble de la journée compte davantage qu’un horaire isolé.',
      ],
    },
    {
      id: 'aliments',
      title: 'Exemples d’aliments riches en protéines',
      paragraphs: [
        'Les protéines peuvent provenir de sources animales ou végétales. Alterner les aliments contribue à varier les autres nutriments et à construire une alimentation compatible avec les préférences personnelles.',
      ],
      points: [
        'Œufs, poissons, volailles, viandes et produits laitiers.',
        'Lentilles, pois chiches, haricots et autres légumineuses.',
        'Tofu, tempeh et alternatives végétales dont la composition est adaptée.',
        'Associations de céréales, légumineuses, graines et oléagineux selon le repas.',
      ],
    },
    {
      id: 'calories',
      title: 'Protéines et calories totales',
      paragraphs: [
        'Les protéines apportent de l’énergie et occupent donc une place dans le budget calorique quotidien. Fixer un apport sans tenir compte des calories totales peut déséquilibrer la place disponible pour les glucides et les lipides.',
        'Le calculateur MoovX estime conjointement les calories de maintien, les calories liées à l’objectif et la répartition des macronutriments. Cette approche évite de traiter les protéines comme une cible indépendante du reste de l’alimentation.',
      ],
    },
    {
      id: 'calculateur',
      title: 'Comment utiliser le calculateur MoovX',
      paragraphs: [
        'Renseignez votre profil, votre activité et votre objectif pour obtenir une estimation cohérente avec l’autorité nutritionnelle utilisée dans MoovX. Aucun calcul supplémentaire n’est réalisé sur cette page.',
        'Utilisez le résultat comme point de départ, puis confrontez-le à votre alimentation réelle, votre récupération et l’évolution de votre objectif.',
      ],
    },
    {
      id: 'limites',
      title: 'Limites et situations nécessitant un professionnel',
      paragraphs: [
        'Les repères généraux ne couvrent pas toutes les situations. Une pathologie rénale ou métabolique, une grossesse, l’allaitement, un trouble du comportement alimentaire, un traitement ou un besoin clinique nécessitent un avis individualisé.',
        'Dans ces situations, demandez conseil à un médecin ou à un professionnel de la nutrition qualifié avant de modifier significativement vos apports.',
      ],
    },
  ],
  links: [
    { href: '/fr/outils/calculateur-calories-macros', label: 'Calculer mes calories et mes macros', description: 'Obtenir une estimation selon votre profil, votre activité et votre objectif.' },
    { href: '/fr/guides/nutrition', label: 'Guide de la nutrition sportive', description: 'Replacer les protéines dans une organisation alimentaire complète.' },
    { href: '/fr/nutrition/prise-de-masse', label: 'Nutrition pour la prise de masse', description: 'Comprendre le rôle des calories et des macros en période de progression musculaire.' },
    { href: '/fr/nutrition/perte-de-poids', label: 'Nutrition pour la perte de poids', description: 'Organiser déficit énergétique, satiété et suivi de manière progressive.' },
    { href: '/fr/blog/combien-de-proteines-prise-de-muscle', label: 'Protéines et prise de muscle', description: 'Approfondir la littérature consacrée spécifiquement à l’hypertrophie.' },
  ],
  disclaimer: 'Ce contenu fournit des informations générales et des estimations. Il ne remplace pas un accompagnement médical ou diététique individualisé. En cas de pathologie, de grossesse, de traitement ou de besoin particulier, consultez un professionnel qualifié.',
  sources: [
    { label: 'EFSA — Apports de référence de la population pour les protéines', url: 'https://www.efsa.europa.eu/fr/press/news/120209' },
    { label: 'Jäger et al. — ISSN Position Stand: protein and exercise (2017)', url: 'https://jissn.biomedcentral.com/articles/10.1186/s12970-017-0177-8' },
  ],
}
