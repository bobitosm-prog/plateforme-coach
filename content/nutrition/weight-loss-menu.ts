export type WeightLossMenuLink = {
  href: string
  label: string
  description: string
}

export type WeightLossMenuExample = {
  label: string
  foods: readonly string[]
  note: string
}

export type WeightLossMenuSection = {
  id: string
  title: string
  paragraphs: readonly string[]
  points?: readonly string[]
  examples?: readonly WeightLossMenuExample[]
}

export type WeightLossMenuContent = {
  title: string
  seoTitle: string
  description: string
  introduction: string
  sections: readonly WeightLossMenuSection[]
  links: readonly WeightLossMenuLink[]
  disclaimer: string
}

export const WEIGHT_LOSS_MENU_CONTENT: WeightLossMenuContent = {
  title: 'Menu perte de poids : organiser une journée rassasiante',
  seoTitle: 'Menu perte de poids : exemple de journée et repas | MoovX',
  description: 'Découvrez comment organiser un menu de perte de poids avec des repas rassasiants, des variantes pratiques et des portions à ajuster selon vos besoins.',
  introduction: 'Un menu de perte de poids utile ne se résume pas à retirer des aliments. Il organise la journée autour de repas rassasiants, d’options faciles à répéter et de portions qui restent à ajuster selon les besoins estimés et le suivi réel. Les exemples ci-dessous sont des repères pédagogiques, pas un menu universel.',
  sections: [
    {
      id: 'organiser-journee',
      title: 'Organiser une journée rassasiante et flexible',
      paragraphs: [
        'Des repères réguliers peuvent limiter les décisions improvisées sans imposer des horaires rigides. Petit-déjeuner, déjeuner, dîner et éventuelle collation se répartissent selon la faim, les contraintes professionnelles et l’entraînement.',
        'La satiété dépend aussi du volume alimentaire, de la présence de fibres, des protéines, de l’hydratation et du plaisir à manger. Une journée cohérente garde donc une place pour les préférences plutôt que de rechercher la restriction la plus stricte.',
      ],
      points: [
        'Prévoir des repas simples avant les journées chargées.',
        'Choisir des aliments rassasiants que l’on apprécie réellement.',
        'Garder assez de souplesse pour les repas sociaux et les imprévus.',
      ],
    },
    {
      id: 'petit-dejeuner',
      title: 'Petit-déjeuner : solide, léger ou rapide',
      paragraphs: [
        'Le premier repas peut être copieux, léger ou absent selon l’appétit. Lorsqu’un petit-déjeuner est prévu, associer une source protéique, un aliment riche en fibres et un fruit offre une trame facile à décliner.',
      ],
      examples: [
        {
          label: 'Option solide',
          foods: ['Œufs, tofu brouillé ou autre source protéique', 'Pain complet ou autre source glucidique', 'Fruit de saison', 'Boisson non sucrée selon la préférence'],
          note: 'Une base à moduler selon la faim et les autres repas de la journée.',
        },
        {
          label: 'Option plus légère',
          foods: ['Produit laitier ou alternative végétale adaptée', 'Fruit frais', 'Flocons ou céréales peu transformées', 'Quelques graines selon les besoins'],
          note: 'Une combinaison pratique lorsqu’un repas volumineux passe moins bien le matin.',
        },
        {
          label: 'Petit-déjeuner rapide',
          foods: ['Fruit facile à emporter', 'Yaourt ou alternative adaptée', 'Pain, flocons ou autre aliment glucidique simple'],
          note: 'Une solution assemblée rapidement, sans transformer la vitesse en règle nutritionnelle.',
        },
      ],
    },
    {
      id: 'dejeuner',
      title: 'Déjeuner : construire une assiette complète',
      paragraphs: [
        'Le déjeuner peut partir d’une source de protéines, d’une portion de féculent ajustable et d’un accompagnement riche en légumes ou autres aliments fibreux. Une source de lipides complète la structure selon le reste des apports.',
        'Les mêmes familles d’aliments peuvent convenir à des besoins différents : ce sont surtout les portions, la préparation et les ajouts qui font évoluer la densité énergétique du repas.',
      ],
      examples: [
        {
          label: 'Structure de déjeuner rassasiante',
          foods: ['Volaille, poisson, œufs, tofu ou légumineuses', 'Riz, pommes de terre, pâtes ou autre féculent', 'Légumes variés ou alternative riche en fibres', 'Assaisonnement adapté au contexte de la journée'],
          note: 'Cette structure décrit des rôles alimentaires ; elle ne fixe aucune quantité individuelle.',
        },
      ],
    },
    {
      id: 'collation',
      title: 'Collation facultative et option sans whey',
      paragraphs: [
        'Une collation peut être pertinente lorsqu’un intervalle entre deux repas est long ou que la faim gêne l’organisation. Elle reste facultative : l’ajouter automatiquement sans faim n’est pas une obligation.',
        'Elle n’a pas non plus à compenser un repas jugé imparfait. Son intérêt se mesure à sa capacité à faciliter la journée sans déplacer inutilement les apports.',
      ],
      examples: [
        {
          label: 'Collation sans whey',
          foods: ['Fruit', 'Yaourt, alternative végétale ou œufs selon le contexte', 'Oléagineux ou tartine selon les besoins'],
          note: 'Une option à choisir selon les préférences, la tolérance et la faim du moment.',
        },
      ],
    },
    {
      id: 'diner',
      title: 'Dîner : rester simple et rassasiant',
      paragraphs: [
        'Le dîner peut reprendre la trame du déjeuner avec des aliments différents. Sa taille dépend de la faim, de l’activité, du repas précédent et du repère énergétique quotidien, pas d’une interdiction générale de manger certains aliments le soir.',
      ],
      examples: [
        {
          label: 'Structure de dîner',
          foods: ['Source protéique appréciée', 'Légumes, soupe ou autre accompagnement rassasiant', 'Féculent adapté à la journée et à l’activité', 'Matière grasse choisie avec mesure'],
          note: 'Une trame souple pour varier les aliments sans changer toute l’organisation.',
        },
      ],
    },
    {
      id: 'journee-complete',
      title: 'Exemple pédagogique d’une journée complète',
      paragraphs: [
        'Une journée peut associer un petit-déjeuner choisi parmi les variantes, un déjeuner complet, une collation seulement si elle est utile et un dîner simple. Le fil conducteur est la cohérence entre les repas, non la reproduction exacte d’une liste.',
        'Les portions restent volontairement absentes : elles dépendent du profil, de l’activité, des repères calculés et de la réponse observée au fil du temps.',
      ],
      points: [
        'Matin : option solide, légère ou rapide selon l’appétit.',
        'Midi : assiette complète construite autour d’aliments accessibles.',
        'Après-midi : collation facultative si elle soutient l’organisation.',
        'Soir : repas modulé selon la faim et le déroulement de la journée.',
      ],
    },
    {
      id: 'variantes',
      title: 'Variantes pratiques selon les préférences',
      paragraphs: [
        'Sans whey, les protéines peuvent venir des repas habituels ou d’une collation composée d’aliments courants. Sans produits laitiers, des alternatives végétales compatibles avec les préférences peuvent être retenues après vérification de leur composition.',
        'Un matin pressé peut s’appuyer sur quelques éléments transportables. Un repas rapide peut réunir des aliments déjà cuits ou prêts à assembler. En cas de faim importante, augmenter le volume des accompagnements rassasiants et réexaminer la structure globale est plus informatif que supprimer encore un repas.',
      ],
      points: [
        'Petit-déjeuner rapide : préparer ou regrouper les éléments la veille.',
        'Repas express : assembler une protéine, un féculent et un accompagnement disponible.',
        'Collation optionnelle : la conserver seulement si elle répond à un besoin concret.',
      ],
    },
    {
      id: 'ajuster-suivi',
      title: 'Ajuster le menu à partir du suivi réel',
      paragraphs: [
        'La faim, l’énergie, la récupération, les performances et l’évolution moyenne du poids apportent des informations complémentaires. Une seule pesée ou un seul repas ne suffit pas pour juger l’ensemble du menu.',
        'Si une évolution est nécessaire, modifier un élément identifiable — une portion, un ajout ou une collation — permet d’observer plus clairement l’effet du changement avant d’aller plus loin.',
      ],
    },
    {
      id: 'moovx',
      title: 'Personnaliser ses repas avec MoovX',
      paragraphs: [
        'Après connexion, MoovX peut organiser des suggestions de repas sur plusieurs jours à partir de l’objectif et des réglages renseignés. Les préférences et restrictions déclarées orientent les propositions, tandis que le suivi aide l’utilisateur à examiner son organisation dans la durée.',
        'Ces plans restent des suggestions à contrôler et à adapter. Les informations saisies ne rendent pas automatiquement un repas approprié à une situation médicale et ne garantissent pas l’absence d’un allergène ; les étiquettes et ingrédients doivent toujours être vérifiés.',
      ],
    },
    {
      id: 'limites',
      title: 'Limites et accompagnement professionnel',
      paragraphs: [
        'Une journée d’exemple ne peut pas déterminer la quantité d’énergie adaptée à chaque personne ni anticiper toutes les réactions digestives. Elle sert à comprendre une organisation, puis doit être confrontée au contexte réel.',
        'Une grossesse, un traitement, une pathologie, un trouble du comportement alimentaire ou une restriction complexe justifie un avis professionnel. Dans ces situations, un modèle de menu en ligne ne remplace pas une évaluation individualisée.',
      ],
    },
  ],
  links: [
    { href: '/fr/nutrition/perte-de-poids', label: 'Comprendre la stratégie de perte de poids', description: 'Replacer ce menu dans les principes de déficit énergétique et de suivi.' },
    { href: '/fr/nutrition/repas-sportifs', label: 'Composer des repas sportifs', description: 'Approfondir la structure pratique des repas autour de l’entraînement.' },
    { href: '/fr/nutrition/macros', label: 'Comprendre les macronutriments', description: 'Relier les aliments aux rôles des protéines, glucides et lipides.' },
    { href: '/fr/nutrition/proteines-par-jour', label: 'Répartir ses protéines sur la journée', description: 'Explorer les repères protéiques et leurs sources alimentaires.' },
    { href: '/fr/outils/calculateur-calories-macros', label: 'Estimer ses calories et ses macros', description: 'Obtenir un point de départ à adapter selon le suivi.' },
    { href: '/fr/guides/nutrition', label: 'Consulter le guide de nutrition sportive', description: 'Retrouver les bases d’une organisation alimentaire cohérente.' },
  ],
  disclaimer: 'Ce menu est un exemple pédagogique et non une prescription alimentaire ou médicale. Les aliments et les portions doivent être adaptés aux besoins, à la tolérance, aux préférences et à la situation personnelle. En cas de besoin particulier, demandez conseil à un professionnel qualifié.',
}
