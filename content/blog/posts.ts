export type Locale = 'fr' | 'en' | 'de'

export interface BlogReference {
  authors: string
  title: string
  journal: string
  year: number
  url: string
}

export interface BlogSection {
  heading: string
  paragraphs: string[]
}

export interface BlogContent {
  title: string
  description: string
  intro: string
  sections: BlogSection[]
  tableTitle?: string
  table?: { headers: string[]; rows: string[][] }
  ctaText: string
  disclaimer: string
}

export interface BlogPost {
  slug: string
  date: string
  image?: string
  readingMinutes: number
  references: BlogReference[]
  content: Record<Locale, BlogContent>
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'combien-de-proteines-prise-de-muscle',
    date: '2026-06-05',
    readingMinutes: 6,
    references: [
      {
        authors: 'Morton RW, Murphy KT, McKellar SR, Schoenfeld BJ, et al.',
        title: 'A systematic review, meta-analysis and meta-regression of the effect of protein supplementation on resistance training-induced gains in muscle mass and strength in healthy adults',
        journal: 'British Journal of Sports Medicine',
        year: 2018,
        url: 'https://pubmed.ncbi.nlm.nih.gov/28698222/',
      },
      {
        authors: 'Jäger R, Kerksick CM, Campbell BI, et al.',
        title: 'International Society of Sports Nutrition Position Stand: protein and exercise',
        journal: 'Journal of the International Society of Sports Nutrition',
        year: 2017,
        url: 'https://jissn.biomedcentral.com/articles/10.1186/s12970-017-0177-8',
      },
    ],
    content: {
      fr: {
        title: 'Combien de protéines par jour pour prendre du muscle ? Ce que dit la science',
        description: "La science est claire sur l'apport en protéines pour la prise de muscle : environ 1,6 g/kg/jour. On vous explique les chiffres, les sources et comment les appliquer.",
        intro: "C'est probablement la question la plus posée en nutrition sportive : combien de grammes de protéines faut-il manger chaque jour pour construire du muscle efficacement ? Entre les conseils contradictoires des réseaux sociaux et les dosages parfois extrêmes prônés par certaines marques de compléments, il est facile de s'y perdre. Bonne nouvelle : la recherche scientifique a apporté des réponses claires grâce à des méta-analyses de grande envergure. Et c'est plus simple qu'il n'y paraît.",
        sections: [
          {
            heading: 'Le chiffre clé : 1,6 g par kilo',
            paragraphs: [
              "En 2018, une équipe de chercheurs menée par Morton et Schoenfeld a publié dans le British Journal of Sports Medicine la plus grande méta-analyse à ce jour sur le sujet : 49 études contrôlées, 1863 participants. Leur conclusion est nette : les gains de masse musculaire augmentent avec l'apport en protéines, mais plafonnent autour de 1,62 g par kilogramme de poids de corps par jour.",
              "Concrètement, au-delà de ce seuil, manger plus de protéines n'apporte pas de gain musculaire supplémentaire mesurable. C'est un résultat robuste, obtenu en agrégeant des données sur des populations variées (jeunes, seniors, hommes, femmes, débutants, entraînés).",
              "Pour une personne de 75 kg, cela représente environ 120 g de protéines par jour — l'équivalent de deux portions de poulet (200 g chacune) et un yaourt grec, ou une répartition sur 4 repas à ~30 g chacun.",
            ],
          },
          {
            heading: 'La fourchette officielle : 1,4 à 2,0 g/kg',
            paragraphs: [
              "La position officielle de l'International Society of Sports Nutrition (ISSN), publiée en 2017 par Jäger et collaborateurs, recommande un apport de 1,4 à 2,0 g de protéines par kg de poids de corps par jour pour la plupart des individus pratiquant la musculation ou un sport de résistance.",
              "Cette fourchette est volontairement large : elle tient compte des différences individuelles (niveau d'entraînement, masse musculaire, âge, objectifs). Un débutant peut tout à fait progresser avec 1,4 g/kg, tandis qu'un athlète expérimenté en phase de progression intensive pourra viser le haut de la fourchette.",
              "Le point essentiel : il n'est pas nécessaire de viser systématiquement le maximum. Se situer entre 1,4 et 1,8 g/kg suffit pour la grande majorité des sportifs, et la méta-analyse de Morton confirme que le bénéfice marginal au-delà de 1,6 g/kg est quasi nul.",
            ],
          },
          {
            heading: 'En période de sèche : monter les protéines',
            paragraphs: [
              "Quand on est en déficit calorique — c'est-à-dire qu'on mange moins que ce qu'on dépense pour perdre du gras — le corps a tendance à puiser dans ses réserves, y compris musculaires. Pour limiter cette perte de masse maigre, l'ISSN recommande de monter l'apport protéique entre 2,3 et 3,1 g/kg de masse maigre par jour.",
              "C'est nettement plus élevé que pour la prise de muscle, et c'est logique : les protéines jouent un rôle protecteur quand le corps est en restriction. Elles alimentent la synthèse protéique musculaire et augmentent la satiété, ce qui aide à respecter le déficit sans trop de faim.",
              "Pour notre personne de 75 kg en phase de sèche, cela monte à environ 170 à 230 g de protéines par jour. Un apport qui nécessite une planification nutritionnelle sérieuse — exactement le type de calcul que MoovX automatise pour vous.",
            ],
          },
          {
            heading: 'Comment répartir sur la journée',
            paragraphs: [
              "La quantité totale de protéines sur la journée est le facteur le plus important, mais la répartition joue aussi un rôle. La recherche montre que la synthèse protéique musculaire est optimisée quand les protéines sont distribuées de manière régulière sur la journée, plutôt que concentrées sur un ou deux gros repas.",
              "La recommandation pratique : viser environ 0,25 g/kg de poids de corps par prise (soit 20 à 40 g selon votre gabarit), répartis sur 3 à 5 repas espacés de 3 à 4 heures. Pour notre personne de 75 kg, cela revient à ~20 g de protéines 4 à 6 fois par jour.",
            ],
          },
        ],
        tableTitle: 'Vos besoins en protéines selon l\'objectif',
        table: {
          headers: ['Objectif', 'Apport recommandé', 'Exemple (75 kg)'],
          rows: [
            ['Entretien / prise de muscle', '1,6 g/kg/jour', '~120 g/jour'],
            ['Confort (fourchette ISSN)', '1,4 – 2,0 g/kg/jour', '105 – 150 g/jour'],
            ['Sèche / déficit calorique', '2,3 – 3,1 g/kg/jour', '170 – 230 g/jour'],
            ['Par repas', '0,25 g/kg (20–40 g)', '~20 g, 4x/jour'],
          ],
        },
        ctaText: "MoovX calcule automatiquement vos besoins en protéines selon votre poids, votre objectif et votre activité — et génère vos repas avec 170 aliments suisses. Essai 10 jours offert.",
        disclaimer: "Cet article est fourni à titre informatif et ne remplace pas l'avis d'un professionnel de santé. Adaptez votre alimentation à votre situation personnelle, surtout en cas de pathologie.",
      },
      en: {
        title: 'How much protein per day to build muscle? What science says',
        description: 'Science is clear on protein intake for muscle gain: about 1.6 g/kg/day. We break down the numbers, sources, and how to apply them.',
        intro: "It is probably the most common question in sports nutrition: how many grams of protein should you eat every day to build muscle effectively? Between contradictory social media advice and the sometimes extreme dosages promoted by supplement brands, it is easy to get lost. Good news: scientific research has provided clear answers through large-scale meta-analyses. And it is simpler than you might think.",
        sections: [
          {
            heading: 'The key number: 1.6 g per kilogram',
            paragraphs: [
              'In 2018, a research team led by Morton and Schoenfeld published the largest meta-analysis on this topic in the British Journal of Sports Medicine: 49 controlled studies, 1,863 participants. Their conclusion is clear: muscle mass gains increase with protein intake but plateau around 1.6 g per kilogram of body weight per day.',
              'Beyond this threshold, eating more protein does not produce additional measurable muscle gains. This is a robust result, obtained by aggregating data from varied populations (young, older, male, female, beginners, trained individuals).',
              'For a 75 kg person, that means roughly 120 g of protein per day — the equivalent of two portions of chicken (200 g each) and a Greek yogurt, or a distribution across 4 meals at approximately 30 g each.',
            ],
          },
          {
            heading: 'The official range: 1.4 to 2.0 g/kg',
            paragraphs: [
              'The official position of the International Society of Sports Nutrition (ISSN), published in 2017 by Jäger and colleagues, recommends an intake of 1.4 to 2.0 g of protein per kg of body weight per day for most individuals practicing resistance training.',
              'This range is deliberately broad: it accounts for individual differences (training level, muscle mass, age, goals). A beginner can progress perfectly well with 1.4 g/kg, while an experienced athlete in an intensive growth phase may aim for the upper end.',
              "The key point: there is no need to systematically aim for the maximum. Staying between 1.4 and 1.8 g/kg is sufficient for the vast majority of athletes, and Morton's meta-analysis confirms that the marginal benefit beyond 1.6 g/kg is virtually zero.",
            ],
          },
          {
            heading: 'During a cut: increase protein',
            paragraphs: [
              'When in a caloric deficit — eating less than you burn to lose fat — the body tends to draw from its reserves, including muscle. To minimize lean mass loss, the ISSN recommends increasing protein intake to 2.3 to 3.1 g/kg of lean body mass per day.',
              'This is significantly higher than for muscle building, and it makes sense: protein plays a protective role when the body is in restriction. It fuels muscle protein synthesis and increases satiety, helping maintain the deficit without excessive hunger.',
              'For our 75 kg person during a cut, that rises to roughly 170 to 230 g of protein per day. An intake that requires serious nutritional planning — exactly the kind of calculation MoovX automates for you.',
            ],
          },
          {
            heading: 'How to distribute throughout the day',
            paragraphs: [
              'Total daily protein intake is the most important factor, but distribution also plays a role. Research shows that muscle protein synthesis is optimized when protein is spread evenly across the day rather than concentrated in one or two large meals.',
              'The practical recommendation: aim for about 0.25 g/kg of body weight per serving (or 20 to 40 g depending on your build), spread across 3 to 5 meals spaced 3 to 4 hours apart. For our 75 kg person, that means approximately 20 g of protein 4 to 6 times per day.',
            ],
          },
        ],
        tableTitle: 'Your protein needs by goal',
        table: {
          headers: ['Goal', 'Recommended intake', 'Example (75 kg)'],
          rows: [
            ['Maintenance / muscle gain', '1.6 g/kg/day', '~120 g/day'],
            ['Comfort range (ISSN)', '1.4 – 2.0 g/kg/day', '105 – 150 g/day'],
            ['Cut / caloric deficit', '2.3 – 3.1 g/kg/day', '170 – 230 g/day'],
            ['Per meal', '0.25 g/kg (20–40 g)', '~20 g, 4x/day'],
          ],
        },
        ctaText: 'MoovX automatically calculates your protein needs based on your weight, goals, and activity — and generates your meals from 170 Swiss foods. 10-day free trial.',
        disclaimer: 'This article is for informational purposes only and does not replace professional medical advice. Adapt your diet to your personal situation, especially in case of medical conditions.',
      },
      de: {
        title: 'Wie viel Protein pro Tag für Muskelaufbau? Was die Wissenschaft sagt',
        description: 'Die Wissenschaft ist klar: Etwa 1,6 g/kg/Tag für optimalen Muskelaufbau. Wir erklären die Zahlen, Quellen und praktische Umsetzung.',
        intro: 'Es ist wohl die am häufigsten gestellte Frage in der Sporternährung: Wie viele Gramm Protein sollte man täglich essen, um effektiv Muskeln aufzubauen? Zwischen widersprüchlichen Tipps aus sozialen Medien und den teils extremen Dosierungen mancher Supplement-Marken kann man leicht den Überblick verlieren. Die gute Nachricht: Die Wissenschaft hat durch grosse Metaanalysen klare Antworten geliefert. Und es ist einfacher, als man denkt.',
        sections: [
          {
            heading: 'Die Schlüsselzahl: 1,6 g pro Kilogramm',
            paragraphs: [
              'Im Jahr 2018 veröffentlichte ein Forscherteam um Morton und Schoenfeld im British Journal of Sports Medicine die bisher grösste Metaanalyse zu diesem Thema: 49 kontrollierte Studien, 1.863 Teilnehmer. Ihr Ergebnis ist eindeutig: Der Zuwachs an Muskelmasse steigt mit der Proteinzufuhr, erreicht aber ein Plateau bei etwa 1,6 g pro Kilogramm Körpergewicht pro Tag.',
              'Über diese Schwelle hinaus bringt mehr Protein keinen messbaren zusätzlichen Muskelzuwachs. Dies ist ein robustes Ergebnis, das aus Daten verschiedenster Populationen gewonnen wurde (jung, älter, männlich, weiblich, Anfänger, Fortgeschrittene).',
              'Für eine 75 kg schwere Person bedeutet das rund 120 g Protein pro Tag — das entspricht etwa zwei Portionen Hähnchen (je 200 g) und einem griechischen Joghurt, oder verteilt auf 4 Mahlzeiten à ca. 30 g.',
            ],
          },
          {
            heading: 'Der offizielle Bereich: 1,4 bis 2,0 g/kg',
            paragraphs: [
              'Die offizielle Position der International Society of Sports Nutrition (ISSN), veröffentlicht 2017 von Jäger und Kollegen, empfiehlt eine Zufuhr von 1,4 bis 2,0 g Protein pro kg Körpergewicht pro Tag für die meisten Sportler im Krafttraining.',
              'Diese Spanne ist bewusst breit angelegt: Sie berücksichtigt individuelle Unterschiede (Trainingslevel, Muskelmasse, Alter, Ziele). Ein Anfänger kann mit 1,4 g/kg bestens Fortschritte machen, während ein erfahrener Athlet in einer intensiven Aufbauphase den oberen Bereich anpeilen kann.',
              'Der entscheidende Punkt: Man muss nicht systematisch das Maximum anstreben. Zwischen 1,4 und 1,8 g/kg zu liegen, reicht für die grosse Mehrheit der Sportler — und die Metaanalyse von Morton bestätigt, dass der Grenznutzen über 1,6 g/kg hinaus praktisch null ist.',
            ],
          },
          {
            heading: 'In der Diätphase: Protein erhöhen',
            paragraphs: [
              'Im Kaloriendefizit — also wenn man weniger isst, als man verbraucht, um Fett abzubauen — neigt der Körper dazu, auf seine Reserven zurückzugreifen, einschliesslich Muskelmasse. Um diesen Verlust zu begrenzen, empfiehlt die ISSN, die Proteinzufuhr auf 2,3 bis 3,1 g/kg fettfreie Körpermasse pro Tag zu erhöhen.',
              'Das ist deutlich mehr als beim Muskelaufbau, und es ist logisch: Protein spielt eine schützende Rolle, wenn der Körper in Restriktion ist. Es fördert die Muskelproteinsynthese und erhöht das Sättigungsgefühl, was hilft, das Defizit ohne übermässigen Hunger einzuhalten.',
              'Für unsere 75 kg schwere Person in der Diätphase steigt das auf etwa 170 bis 230 g Protein pro Tag. Eine Menge, die eine seriöse Ernährungsplanung erfordert — genau die Art von Berechnung, die MoovX für dich automatisiert.',
            ],
          },
          {
            heading: 'Wie über den Tag verteilen',
            paragraphs: [
              'Die Gesamtmenge an Protein über den Tag ist der wichtigste Faktor, aber die Verteilung spielt ebenfalls eine Rolle. Die Forschung zeigt, dass die Muskelproteinsynthese optimiert wird, wenn Protein gleichmässig über den Tag verteilt wird, statt auf ein oder zwei grosse Mahlzeiten konzentriert.',
              'Die praktische Empfehlung: Etwa 0,25 g/kg Körpergewicht pro Mahlzeit anpeilen (also 20 bis 40 g je nach Statur), verteilt auf 3 bis 5 Mahlzeiten im Abstand von 3 bis 4 Stunden. Für unsere 75 kg schwere Person bedeutet das ca. 20 g Protein 4 bis 6 Mal am Tag.',
            ],
          },
        ],
        tableTitle: 'Dein Proteinbedarf nach Ziel',
        table: {
          headers: ['Ziel', 'Empfohlene Zufuhr', 'Beispiel (75 kg)'],
          rows: [
            ['Erhalt / Muskelaufbau', '1,6 g/kg/Tag', '~120 g/Tag'],
            ['Komfortbereich (ISSN)', '1,4 – 2,0 g/kg/Tag', '105 – 150 g/Tag'],
            ['Diät / Kaloriendefizit', '2,3 – 3,1 g/kg/Tag', '170 – 230 g/Tag'],
            ['Pro Mahlzeit', '0,25 g/kg (20–40 g)', '~20 g, 4x/Tag'],
          ],
        },
        ctaText: 'MoovX berechnet automatisch deinen Proteinbedarf basierend auf Gewicht, Ziel und Aktivität — und erstellt deine Mahlzeiten aus 170 Schweizer Lebensmitteln. 10 Tage kostenlos testen.',
        disclaimer: 'Dieser Artikel dient nur zu Informationszwecken und ersetzt keine professionelle medizinische Beratung. Passe deine Ernährung an deine persönliche Situation an, besonders bei bestehenden Erkrankungen.',
      },
    },
  },
  {
    slug: 'combien-de-series-par-semaine-prise-de-muscle',
    date: '2026-06-05',
    readingMinutes: 6,
    references: [
      {
        authors: 'Schoenfeld BJ, Ogborn D, Krieger JW',
        title: 'Dose-response relationship between weekly resistance training volume and increases in muscle mass: a systematic review and meta-analysis',
        journal: 'Journal of Sports Sciences',
        year: 2017,
        url: 'https://pubmed.ncbi.nlm.nih.gov/27433992/',
      },
      {
        authors: 'Baz-Valle E, Balsalobre-Fernández C, Alix-Fages C, Santos-Concejero J',
        title: 'A Systematic Review of The Effects of Different Resistance Training Volumes on Muscle Hypertrophy',
        journal: 'Journal of Human Kinetics',
        year: 2022,
        url: 'https://pubmed.ncbi.nlm.nih.gov/35291645/',
      },
    ],
    content: {
      fr: {
        title: 'Combien de séries par semaine pour prendre du muscle ? Le volume optimal selon la science',
        description: "Le volume d'entraînement est le facteur clé de l'hypertrophie. La science recommande 10 à 20 séries par groupe musculaire par semaine. On vous explique.",
        intro: "Après la question des protéines, c'est sans doute la deuxième interrogation la plus fréquente en musculation : combien de séries faut-il faire par semaine pour chaque groupe musculaire ? Trop peu, on stagne. Trop, on se fatigue sans progresser. La recherche a beaucoup avancé ces dernières années sur cette question, et les réponses sont à la fois claires et nuancées.",
        sections: [
          {
            heading: "Le volume, facteur n°1 de l'hypertrophie",
            paragraphs: [
              "En 2017, Schoenfeld, Ogborn et Krieger ont publié dans le Journal of Sports Sciences une méta-analyse portant sur 15 études contrôlées. Leur objectif : quantifier la relation entre le volume d'entraînement hebdomadaire (nombre de séries par muscle) et la croissance musculaire. Le résultat est sans ambiguïté : il existe une relation dose-réponse significative. Plus on fait de séries pour un muscle donné, plus ce muscle grossit.",
              "Le seuil qui ressort de manière récurrente : 10 séries par muscle par semaine produisent des gains significativement supérieurs à moins de 5 séries. C'est le plancher à partir duquel la stimulation devient réellement productive pour la majorité des pratiquants.",
            ],
          },
          {
            heading: 'La fourchette pratique : 10 à 20 séries',
            paragraphs: [
              "Le consensus issu de l'ensemble de la littérature situe la zone efficace entre 10 et 20 séries par groupe musculaire par semaine. C'est la fourchette dans laquelle la plupart des individus obtiendront les meilleurs résultats, à condition que ces séries soient réparties sur au moins 2 séances (plutôt que concentrées en une seule).",
              "Pour un débutant, 10 séries par semaine et par muscle constituent un excellent point de départ. À mesure que le corps s'adapte et que la progression ralentit, augmenter progressivement vers 14, 16, voire 20 séries permet de relancer les gains. L'idée clé : le volume est un levier que l'on augmente graduellement, pas un maximum à atteindre dès le premier jour.",
            ],
          },
          {
            heading: 'Attention aux rendements décroissants',
            paragraphs: [
              "Plus n'est pas toujours mieux. Une revue systématique plus récente de Baz-Valle et collaborateurs, publiée en 2022 dans le Journal of Human Kinetics, a mis en évidence que les gains de masse musculaire plafonnent au-delà de 20 séries par semaine et par muscle. Pire : à très haut volume, la fatigue accumulée peut compromettre la qualité des séries suivantes et limiter la récupération.",
              "Le concept central est celui de volume PRODUCTIF : chaque série supplémentaire doit apporter un stimulus suffisant pour justifier le coût en fatigue. Une fois ce rapport renversé, ajouter du volume devient contre-productif. C'est pourquoi les programmes bien conçus modulent le volume par phases (périodisation), plutôt que de maintenir un volume maximal en permanence.",
            ],
          },
          {
            heading: 'Ce qui compte vraiment dans une série',
            paragraphs: [
              "Toutes les séries ne se valent pas. Pour qu'une série compte dans le total de volume productif, elle doit être menée suffisamment proche de l'échec musculaire — idéalement entre 0 et 4 répétitions en réserve (RIR). La charge utilisée doit permettre entre 6 et 30 répétitions : en dessous, c'est trop lourd pour cibler l'hypertrophie ; au-dessus, l'intensité est insuffisante.",
              "Les séries d'échauffement, les séries trop légères ou celles arrêtées bien avant l'effort ne comptent pas dans le volume hebdomadaire. C'est la qualité de l'effort, combinée à la quantité, qui détermine la croissance musculaire.",
            ],
          },
        ],
        tableTitle: 'Repères de volume hebdomadaire par muscle',
        table: {
          headers: ['Niveau', 'Séries / muscle / semaine', 'Répartition conseillée'],
          rows: [
            ['Débutant', '10 séries', '2 séances de 5 séries'],
            ['Intermédiaire', '12 – 16 séries', '2 à 3 séances'],
            ['Avancé', '16 – 20 séries', '3 séances ou plus'],
            ['Zone de plafonnement', '> 20 séries', 'Rendements décroissants'],
          ],
        },
        ctaText: "MoovX construit votre programme avec le bon volume par groupe musculaire selon votre niveau, et l'ajuste à mesure que vous progressez. Essai 10 jours offert.",
        disclaimer: "Cet article est fourni à titre informatif et ne remplace pas l'accompagnement d'un professionnel. Adaptez le volume à votre récupération et votre expérience.",
      },
      en: {
        title: 'How many sets per week to build muscle? The optimal volume according to science',
        description: 'Training volume is the key driver of hypertrophy. Science recommends 10 to 20 sets per muscle group per week. Here is the breakdown.',
        intro: "After protein, this is probably the second most common question in weight training: how many sets should you do per week for each muscle group? Too few, and you plateau. Too many, and you exhaust yourself without progressing. Research has made great strides on this question in recent years, and the answers are both clear and nuanced.",
        sections: [
          {
            heading: 'Volume: the #1 driver of hypertrophy',
            paragraphs: [
              'In 2017, Schoenfeld, Ogborn, and Krieger published a meta-analysis in the Journal of Sports Sciences covering 15 controlled studies. Their goal: to quantify the relationship between weekly training volume (number of sets per muscle) and muscle growth. The result is unambiguous: there is a significant dose-response relationship. The more sets you perform for a given muscle, the more that muscle grows.',
              'The threshold that consistently emerges: 10+ sets per muscle per week produce significantly greater muscle gains than fewer than 5 sets. This is the floor above which stimulation becomes truly productive for most trainees.',
            ],
          },
          {
            heading: 'The practical range: 10 to 20 sets',
            paragraphs: [
              'The consensus from the body of research places the effective zone between 10 and 20 sets per muscle group per week, spread across at least 2 sessions (rather than crammed into one).',
              "For a beginner, 10 sets per week per muscle is an excellent starting point. As the body adapts and progress slows, gradually increasing to 14, 16, or even 20 sets allows you to restart gains. The key idea: volume is a lever you increase gradually — not a maximum to hit from day one.",
            ],
          },
          {
            heading: 'Watch out for diminishing returns',
            paragraphs: [
              'More is not always better. A more recent systematic review by Baz-Valle and colleagues, published in 2022 in the Journal of Human Kinetics, showed that muscle mass gains plateau beyond 20 sets per week per muscle. Worse: at very high volumes, accumulated fatigue can compromise the quality of subsequent sets and limit recovery.',
              'The central concept is PRODUCTIVE volume: each additional set must provide enough stimulus to justify the fatigue cost. Once that balance tips, adding volume becomes counterproductive. This is why well-designed programs modulate volume in phases (periodization), rather than maintaining maximum volume permanently.',
            ],
          },
          {
            heading: 'What really counts in a set',
            paragraphs: [
              'Not all sets are created equal. For a set to count toward productive volume, it must be taken close enough to muscular failure — ideally between 0 and 4 reps in reserve (RIR). The load used should allow between 6 and 30 reps: below that is too heavy to target hypertrophy; above that, intensity is insufficient.',
              'Warm-up sets, sets that are too light, or those stopped well before effort do not count toward weekly volume. It is the quality of effort, combined with quantity, that determines muscle growth.',
            ],
          },
        ],
        tableTitle: 'Weekly volume benchmarks per muscle',
        table: {
          headers: ['Level', 'Sets / muscle / week', 'Suggested split'],
          rows: [
            ['Beginner', '10 sets', '2 sessions of 5 sets'],
            ['Intermediate', '12 – 16 sets', '2 to 3 sessions'],
            ['Advanced', '16 – 20 sets', '3 sessions or more'],
            ['Plateau zone', '> 20 sets', 'Diminishing returns'],
          ],
        },
        ctaText: 'MoovX builds your program with the right volume per muscle group based on your level, and adjusts as you progress. 10-day free trial.',
        disclaimer: 'This article is for informational purposes only and does not replace professional guidance. Adjust volume to your recovery and experience.',
      },
      de: {
        title: 'Wie viele Sätze pro Woche für Muskelaufbau? Das optimale Volumen laut Wissenschaft',
        description: 'Das Trainingsvolumen ist der Schlüsselfaktor für Hypertrophie. Die Wissenschaft empfiehlt 10 bis 20 Sätze pro Muskelgruppe pro Woche.',
        intro: 'Nach der Proteinfrage ist dies wohl die zweithäufigste Frage im Krafttraining: Wie viele Sätze sollte man pro Woche für jede Muskelgruppe machen? Zu wenig, und man stagniert. Zu viel, und man ermüdet sich, ohne Fortschritte zu machen. Die Forschung hat in den letzten Jahren grosse Fortschritte bei dieser Frage gemacht, und die Antworten sind sowohl klar als auch differenziert.',
        sections: [
          {
            heading: 'Volumen: Faktor Nr. 1 für Hypertrophie',
            paragraphs: [
              'Im Jahr 2017 veröffentlichten Schoenfeld, Ogborn und Krieger im Journal of Sports Sciences eine Metaanalyse über 15 kontrollierte Studien. Ihr Ziel: die Beziehung zwischen wöchentlichem Trainingsvolumen (Anzahl der Sätze pro Muskel) und Muskelwachstum zu quantifizieren. Das Ergebnis ist eindeutig: Es gibt eine signifikante Dosis-Wirkungs-Beziehung. Je mehr Sätze man für einen bestimmten Muskel macht, desto mehr wächst dieser Muskel.',
              'Die Schwelle, die sich konsistent herauskristallisiert: 10+ Sätze pro Muskel pro Woche erzeugen signifikant grössere Muskelzuwächse als weniger als 5 Sätze. Das ist der Mindestbereich, ab dem die Stimulation für die Mehrheit der Trainierenden wirklich produktiv wird.',
            ],
          },
          {
            heading: 'Der praktische Bereich: 10 bis 20 Sätze',
            paragraphs: [
              'Der Konsens aus der gesamten Literatur liegt bei 10 bis 20 Sätzen pro Muskelgruppe pro Woche, verteilt auf mindestens 2 Trainingseinheiten (statt in einer einzigen konzentriert).',
              'Für einen Anfänger sind 10 Sätze pro Woche und Muskel ein hervorragender Ausgangspunkt. Wenn sich der Körper anpasst und die Fortschritte langsamer werden, ermöglicht eine schrittweise Steigerung auf 14, 16 oder sogar 20 Sätze, die Zuwächse wieder anzukurbeln. Die Kernidee: Das Volumen ist ein Hebel, den man schrittweise erhöht — kein Maximum, das man vom ersten Tag an erreichen muss.',
            ],
          },
          {
            heading: 'Vorsicht vor abnehmenden Erträgen',
            paragraphs: [
              'Mehr ist nicht immer besser. Eine neuere systematische Übersicht von Baz-Valle und Kollegen, veröffentlicht 2022 im Journal of Human Kinetics, zeigte, dass die Muskelzuwächse jenseits von 20 Sätzen pro Woche und Muskel ein Plateau erreichen. Schlimmer noch: Bei sehr hohem Volumen kann die angesammelte Ermüdung die Qualität der folgenden Sätze beeinträchtigen und die Erholung einschränken.',
              'Das zentrale Konzept ist das PRODUKTIVE Volumen: Jeder zusätzliche Satz muss genug Stimulus liefern, um die Ermüdungskosten zu rechtfertigen. Sobald sich dieses Verhältnis umkehrt, wird zusätzliches Volumen kontraproduktiv. Deshalb modulieren gut konzipierte Programme das Volumen phasenweise (Periodisierung), anstatt dauerhaft maximales Volumen aufrechtzuerhalten.',
            ],
          },
          {
            heading: 'Was wirklich in einem Satz zählt',
            paragraphs: [
              'Nicht alle Sätze sind gleichwertig. Damit ein Satz zum produktiven Volumen zählt, muss er nah genug ans Muskelversagen geführt werden — idealerweise zwischen 0 und 4 Wiederholungen in Reserve (RIR). Das verwendete Gewicht sollte zwischen 6 und 30 Wiederholungen erlauben: darunter ist es zu schwer für Hypertrophie; darüber ist die Intensität unzureichend.',
              'Aufwärmsätze, zu leichte Sätze oder solche, die weit vor der Anstrengung abgebrochen werden, zählen nicht zum Wochenvolumen. Es ist die Qualität der Anstrengung, kombiniert mit der Menge, die das Muskelwachstum bestimmt.',
            ],
          },
        ],
        tableTitle: 'Wöchentliche Volumen-Richtwerte pro Muskel',
        table: {
          headers: ['Niveau', 'Sätze / Muskel / Woche', 'Empfohlene Aufteilung'],
          rows: [
            ['Anfänger', '10 Sätze', '2 Einheiten à 5 Sätze'],
            ['Fortgeschrittener', '12 – 16 Sätze', '2 bis 3 Einheiten'],
            ['Erfahrener', '16 – 20 Sätze', '3 Einheiten oder mehr'],
            ['Plateau-Zone', '> 20 Sätze', 'Abnehmende Erträge'],
          ],
        },
        ctaText: 'MoovX erstellt dein Programm mit dem richtigen Volumen pro Muskelgruppe basierend auf deinem Level und passt es laufend an. 10 Tage kostenlos testen.',
        disclaimer: 'Dieser Artikel dient nur zu Informationszwecken und ersetzt keine professionelle Beratung. Passe das Volumen an deine Erholung und Erfahrung an.',
      },
    },
  },
  {
    slug: 'frequence-entrainement-combien-de-fois-par-semaine',
    date: '2026-06-05',
    readingMinutes: 5,
    references: [
      {
        authors: 'Schoenfeld BJ, Ogborn D, Krieger JW',
        title: 'Effects of Resistance Training Frequency on Measures of Muscle Hypertrophy: A Systematic Review and Meta-Analysis',
        journal: 'Sports Medicine',
        year: 2016,
        url: 'https://pubmed.ncbi.nlm.nih.gov/27102172/',
      },
      {
        authors: 'Schoenfeld BJ, Grgic J, Krieger JW',
        title: 'How many times per week should a muscle be trained to maximize muscle hypertrophy? A systematic review and meta-analysis of studies examining the effects of resistance training frequency',
        journal: 'Journal of Sports Sciences',
        year: 2019,
        url: 'https://pubmed.ncbi.nlm.nih.gov/30558493/',
      },
    ],
    content: {
      fr: {
        title: "À quelle fréquence s'entraîner par semaine pour prendre du muscle ?",
        description: "1, 2 ou 3 fois par muscle par semaine ? La science est claire : à volume égal, c'est le volume total qui compte. On vous explique comment bien répartir.",
        intro: "Faut-il entraîner chaque muscle une, deux ou trois fois par semaine pour maximiser la croissance ? C'est l'un des débats les plus anciens de la musculation. Bonne nouvelle : la recherche a considérablement évolué ces dernières années, et la réponse est plus libératrice qu'on ne le pense. Vous avez plus de souplesse que vous ne croyez.",
        sections: [
          {
            heading: "2 fois par semaine bat 1 fois… au départ",
            paragraphs: [
              "En 2016, Schoenfeld, Ogborn et Krieger ont publié dans Sports Medicine une méta-analyse rassemblant les études comparant différentes fréquences d'entraînement. Leur conclusion a marqué les esprits : entraîner un muscle 2 fois par semaine produisait des gains de masse musculaire supérieurs à une seule fois par semaine.",
              "Ce résultat a largement contribué à populariser les programmes de type Upper/Lower ou PPL (Push/Pull/Legs), qui exposent chaque muscle à 2 stimulations hebdomadaires. Et pour cause : à l'époque, l'explication semblait logique — plus de fréquence, plus de synthèse protéique, plus de muscle.",
            ],
          },
          {
            heading: "La nuance clé : c'est le volume qui compte",
            paragraphs: [
              "Trois ans plus tard, Schoenfeld, Grgic et Krieger ont affiné leur analyse avec une étude plus large (25 études, publiée en 2019 dans le Journal of Sports Sciences). La conclusion cette fois est plus nuancée et plus importante : à VOLUME ÉGAL, la fréquence d'entraînement n'a pas d'impact significatif sur l'hypertrophie.",
              "Autrement dit, si vous faites 12 séries par semaine pour les pectoraux, les répartir en 1, 2 ou 3 séances donne des résultats comparables — à condition que chaque série soit effectuée avec une intensité suffisante. La fréquence n'est pas un facteur de croissance en soi ; c'est avant tout un outil d'organisation du volume.",
            ],
          },
          {
            heading: 'Pourquoi répartir reste utile en pratique',
            paragraphs: [
              "Si la fréquence n'est pas biologiquement supérieure, elle offre des avantages pratiques importants. Répartir 16 séries de pectoraux sur 2 séances (8 chacune) plutôt qu'une seule permet de mieux performer sur chaque série : moins de fatigue accumulée en cours de séance, meilleure qualité technique, charges plus lourdes maintenues.",
              "C'est aussi une question de récupération et de durée de séance. Une séance de 45 minutes bien ciblée est plus facile à caser dans un emploi du temps qu'une session marathon de 2 heures. La fréquence est donc un levier de régularité — et la régularité est le vrai moteur de la progression à long terme.",
            ],
          },
          {
            heading: 'Que retenir concrètement',
            paragraphs: [
              "Choisissez la fréquence qui vous permet de tenir votre volume hebdomadaire cible et de rester régulier. Si vous pouvez vous entraîner 6 jours par semaine, un PPL entraîne chaque muscle 2 fois — c'est un excellent compromis entre volume et récupération. Si vous n'avez que 3 jours, des séances Full Body bien construites peuvent donner des résultats tout aussi bons.",
              "Le message de la science est libérateur : il n'existe pas de fréquence magique. Ce qui compte, c'est de cumuler suffisamment de séries productives sur la semaine, et de le faire de manière soutenable. Le reste est une question de préférence et de planning.",
            ],
          },
        ],
        tableTitle: "Fréquence selon votre organisation",
        table: {
          headers: ['Fréquence / muscle', 'Pour qui', 'Remarque'],
          rows: [
            ['1x / semaine', 'Emploi du temps serré', 'OK si le volume total est atteint'],
            ['2x / semaine', 'La plupart des pratiquants', 'Bon compromis (ex : PPL 6 jours)'],
            ['3x / semaine', 'Avancés, volume élevé', 'Mieux répartir un gros volume'],
          ],
        },
        ctaText: "Le programme PPL de MoovX répartit automatiquement votre volume sur la semaine pour un équilibre optimal entraînement/récupération. Essai 10 jours offert.",
        disclaimer: "Cet article est fourni à titre informatif. Adaptez votre fréquence à votre récupération, votre sommeil et votre niveau de stress.",
      },
      en: {
        title: 'How often should you train per week to build muscle?',
        description: '1, 2 or 3 times per muscle per week? Science is clear: at equal volume, total volume is what matters. Here is how to split it.',
        intro: "Should you train each muscle once, twice, or three times a week to maximize growth? It is one of the oldest debates in weight training. Good news: research has evolved considerably in recent years, and the answer is more liberating than you might expect. You have more flexibility than you think.",
        sections: [
          {
            heading: 'Twice a week beats once… initially',
            paragraphs: [
              'In 2016, Schoenfeld, Ogborn, and Krieger published a meta-analysis in Sports Medicine pooling studies that compared different training frequencies. Their conclusion made waves: training a muscle twice per week produced greater muscle mass gains than just once a week.',
              'This result largely popularized programs like Upper/Lower or PPL (Push/Pull/Legs), which expose each muscle to 2 weekly stimulations. And for good reason: at the time, the explanation seemed logical — more frequency, more protein synthesis, more muscle.',
            ],
          },
          {
            heading: 'The key nuance: volume is what matters',
            paragraphs: [
              'Three years later, Schoenfeld, Grgic, and Krieger refined their analysis with a larger study (25 studies, published in 2019 in the Journal of Sports Sciences). The conclusion this time is more nuanced and more important: at EQUAL VOLUME, training frequency has no significant impact on hypertrophy.',
              'In other words, if you do 12 sets per week for your chest, splitting them into 1, 2, or 3 sessions produces comparable results — as long as each set is performed with sufficient intensity. Frequency is not a growth factor in itself; it is primarily a tool for organizing volume.',
            ],
          },
          {
            heading: 'Why splitting still helps in practice',
            paragraphs: [
              'If frequency is not biologically superior, it offers important practical advantages. Splitting 16 chest sets across 2 sessions (8 each) rather than one allows you to perform better on each set: less accumulated fatigue during the session, better technique, heavier loads maintained.',
              'It is also about recovery and session duration. A focused 45-minute session is easier to fit into a schedule than a 2-hour marathon. Frequency is therefore a lever for consistency — and consistency is the true engine of long-term progress.',
            ],
          },
          {
            heading: 'What to take away',
            paragraphs: [
              'Choose the frequency that allows you to hit your weekly volume target and stay consistent. If you can train 6 days a week, a PPL hits each muscle twice — an excellent compromise between volume and recovery. If you only have 3 days, well-built Full Body sessions can deliver equally good results.',
              'The message from science is liberating: there is no magic frequency. What matters is accumulating enough productive sets over the week and doing so sustainably. The rest is a matter of preference and scheduling.',
            ],
          },
        ],
        tableTitle: 'Frequency by your schedule',
        table: {
          headers: ['Frequency / muscle', 'Best for', 'Note'],
          rows: [
            ['1x / week', 'Tight schedule', 'OK if total volume is reached'],
            ['2x / week', 'Most trainees', 'Good balance (e.g. PPL 6 days)'],
            ['3x / week', 'Advanced, high volume', 'Better way to spread high volume'],
          ],
        },
        ctaText: "MoovX's PPL program automatically distributes your volume across the week for optimal training/recovery balance. 10-day free trial.",
        disclaimer: 'This article is for informational purposes only. Adjust frequency to your recovery, sleep, and stress level.',
      },
      de: {
        title: 'Wie oft pro Woche trainieren für Muskelaufbau?',
        description: '1, 2 oder 3 Mal pro Muskel pro Woche? Die Wissenschaft ist klar: Bei gleichem Volumen zählt das Gesamtvolumen. So teilst du es richtig auf.',
        intro: 'Sollte man jeden Muskel ein-, zwei- oder dreimal pro Woche trainieren, um das Wachstum zu maximieren? Es ist eine der ältesten Debatten im Krafttraining. Gute Nachricht: Die Forschung hat sich in den letzten Jahren erheblich weiterentwickelt, und die Antwort ist befreiender, als man denkt. Du hast mehr Flexibilität, als du glaubst.',
        sections: [
          {
            heading: 'Zweimal pro Woche schlägt einmal… anfänglich',
            paragraphs: [
              'Im Jahr 2016 veröffentlichten Schoenfeld, Ogborn und Krieger in Sports Medicine eine Metaanalyse, die Studien zum Vergleich verschiedener Trainingsfrequenzen zusammenfasste. Ihre Schlussfolgerung machte Schlagzeilen: Einen Muskel zweimal pro Woche zu trainieren brachte grössere Muskelzuwächse als nur einmal pro Woche.',
              'Dieses Ergebnis hat Programme wie Upper/Lower oder PPL (Push/Pull/Legs), die jeden Muskel 2 wöchentlichen Stimulationen aussetzen, stark populär gemacht. Und das zu Recht: Damals schien die Erklärung logisch — mehr Frequenz, mehr Proteinsynthese, mehr Muskel.',
            ],
          },
          {
            heading: 'Die entscheidende Nuance: Das Volumen zählt',
            paragraphs: [
              'Drei Jahre später verfeinerten Schoenfeld, Grgic und Krieger ihre Analyse mit einer grösseren Studie (25 Studien, veröffentlicht 2019 im Journal of Sports Sciences). Die Schlussfolgerung diesmal ist differenzierter und wichtiger: Bei GLEICHEM VOLUMEN hat die Trainingsfrequenz keinen signifikanten Einfluss auf die Hypertrophie.',
              'Anders gesagt: Wenn du 12 Sätze pro Woche für die Brust machst, bringt es vergleichbare Ergebnisse, ob du sie auf 1, 2 oder 3 Einheiten aufteilst — solange jeder Satz mit ausreichender Intensität ausgeführt wird. Die Frequenz ist kein Wachstumsfaktor an sich; sie ist in erster Linie ein Werkzeug zur Organisation des Volumens.',
            ],
          },
          {
            heading: 'Warum Aufteilen in der Praxis trotzdem sinnvoll ist',
            paragraphs: [
              'Wenn die Frequenz biologisch nicht überlegen ist, bietet sie dennoch wichtige praktische Vorteile. 16 Brustsätze auf 2 Einheiten (je 8) aufzuteilen statt auf eine ermöglicht es, bei jedem Satz besser zu performen: weniger angesammelte Ermüdung während der Einheit, bessere Technik, schwerere Gewichte, die gehalten werden können.',
              'Es geht auch um Erholung und Trainingsdauer. Eine fokussierte 45-Minuten-Einheit lässt sich leichter in den Alltag integrieren als ein 2-Stunden-Marathon. Die Frequenz ist daher ein Hebel für Regelmässigkeit — und Regelmässigkeit ist der wahre Motor für langfristigen Fortschritt.',
            ],
          },
          {
            heading: 'Was du konkret mitnehmen solltest',
            paragraphs: [
              'Wähle die Frequenz, die es dir ermöglicht, dein wöchentliches Volumenziel zu erreichen und konstant zu bleiben. Wenn du 6 Tage pro Woche trainieren kannst, trifft ein PPL jeden Muskel zweimal — ein hervorragender Kompromiss zwischen Volumen und Erholung. Wenn du nur 3 Tage hast, können gut aufgebaute Ganzkörper-Einheiten genauso gute Ergebnisse liefern.',
              'Die Botschaft der Wissenschaft ist befreiend: Es gibt keine magische Frequenz. Was zählt, ist, genügend produktive Sätze über die Woche zu sammeln und dies nachhaltig zu tun. Der Rest ist eine Frage der Präferenz und der Planung.',
            ],
          },
        ],
        tableTitle: 'Frequenz nach deiner Organisation',
        table: {
          headers: ['Frequenz / Muskel', 'Für wen', 'Hinweis'],
          rows: [
            ['1x / Woche', 'Enger Zeitplan', 'OK wenn das Gesamtvolumen erreicht wird'],
            ['2x / Woche', 'Die meisten Trainierenden', 'Guter Kompromiss (z.B. PPL 6 Tage)'],
            ['3x / Woche', 'Fortgeschrittene, hohes Volumen', 'Hohes Volumen besser aufteilen'],
          ],
        },
        ctaText: 'Das PPL-Programm von MoovX verteilt dein Volumen automatisch über die Woche für ein optimales Training-/Erholungsgleichgewicht. 10 Tage kostenlos testen.',
        disclaimer: 'Dieser Artikel dient nur zu Informationszwecken. Passe die Frequenz an deine Erholung, deinen Schlaf und dein Stressniveau an.',
      },
    },
  },
  {
    slug: 'creatine-musculation-dosage-science',
    date: '2026-06-05',
    readingMinutes: 6,
    references: [
      {
        authors: 'Kreider RB, Kalman DS, Antonio J, et al.',
        title: 'International Society of Sports Nutrition position stand: safety and efficacy of creatine supplementation in exercise, sport, and medicine',
        journal: 'Journal of the International Society of Sports Nutrition',
        year: 2017,
        url: 'https://jissn.biomedcentral.com/articles/10.1186/s12970-017-0173-z',
      },
      {
        authors: 'Antonio J, Candow DG, Forbes SC, et al.',
        title: 'Common questions and misconceptions about creatine supplementation: what does the scientific evidence really show?',
        journal: 'Journal of the International Society of Sports Nutrition',
        year: 2021,
        url: 'https://jissn.biomedcentral.com/articles/10.1186/s12970-021-00412-w',
      },
    ],
    content: {
      fr: {
        title: 'La créatine en musculation : dosage, effets et sécurité selon la science',
        description: "La créatine monohydrate est le supplément le plus étudié et le plus efficace. 3 à 5 g par jour, sûre, sans phase de charge obligatoire. On fait le point.",
        intro: "La créatine fait partie des sujets les plus chargés en idées reçues dans le monde du fitness. Rétention d'eau, danger pour les reins, nécessité d'une phase de charge... les mythes ont la vie dure. Pourtant, c'est de loin le supplément sportif le mieux documenté par la recherche scientifique, avec des centaines d'études sur plusieurs décennies. On s'appuie ici sur la position officielle de l'International Society of Sports Nutrition pour faire le tri.",
        sections: [
          {
            heading: 'Le supplément le plus étudié et le plus efficace',
            paragraphs: [
              "La position officielle de l'ISSN, publiée par Kreider et collaborateurs en 2017, est sans équivoque : la créatine monohydrate est la forme de créatine la plus étudiée et la plus efficace pour augmenter la capacité d'effort à haute intensité et la masse maigre. C'est le supplément nutritionnel le plus efficace actuellement disponible pour les sportifs, en termes d'augmentation de la capacité d'exercice à haute intensité et de la masse musculaire.",
              "Ce n'est pas une affirmation marketing — c'est le résumé de centaines d'études évaluées par des chercheurs indépendants. La créatine augmente les réserves de phosphocréatine dans les muscles, ce qui permet de produire plus d'énergie lors d'efforts courts et intenses (séries de musculation, sprints). Le résultat : plus de répétitions, plus de charge, et donc plus de stimulus pour la croissance musculaire.",
            ],
          },
          {
            heading: 'Combien en prendre : 3 à 5 g par jour',
            paragraphs: [
              "Deux protocoles existent. Le premier, avec phase de charge : environ 0,3 g par kg de poids de corps par jour pendant 3 jours (soit ~20 g/jour pour une personne de 70 kg), suivi de 3 à 5 g par jour en entretien. Ce protocole sature rapidement les stocks de créatine dans les muscles (en environ 1 semaine).",
              "Le second, sans phase de charge : 3 à 5 g par jour directement, dès le début. Les stocks musculaires se remplissent en 3 à 4 semaines au lieu d'une seule. Le résultat final est strictement identique — seul le délai change. La phase de charge n'est donc PAS obligatoire ; elle est simplement plus rapide.",
              "La plupart des pratiquants préfèrent la méthode sans charge, plus simple et sans inconfort digestif (que la dose élevée peut parfois provoquer).",
            ],
          },
          {
            heading: 'Est-ce dangereux ? Ce que dit la science',
            paragraphs: [
              "L'ISSN est catégorique : il n'existe aucune preuve scientifique d'effet néfaste de la créatine monohydrate à court ou long terme chez les individus en bonne santé, aux doses recommandées. Cette conclusion est renforcée par la revue de 2021 (Antonio et al.) qui passe en revue les questions et idées reçues les plus courantes.",
              "Les craintes les plus répandues — dommages aux reins, perte de cheveux, déshydratation, crampes — ne sont pas soutenues par les données scientifiques. La créatine peut augmenter légèrement la créatinine sanguine (un marqueur indirect de la fonction rénale), ce qui peut alarmer un médecin non informé, mais cela ne reflète pas un dommage rénal réel.",
            ],
          },
          {
            heading: 'Comment bien la prendre',
            paragraphs: [
              "La forme monohydrate est la référence. Les autres formes (HCL, éthyl ester, buffered) n'ont pas démontré de supériorité et coûtent plus cher. Inutile de surpayer.",
              "Le moment de la prise dans la journée importe peu — matin, midi, soir, avant ou après l'entraînement, la différence est négligeable. Ce qui compte, c'est la régularité : prendre ses 3 à 5 g chaque jour, sans interruption. La prendre avec des glucides ou des protéines peut légèrement améliorer l'absorption, mais ce n'est pas indispensable.",
            ],
          },
        ],
        tableTitle: 'Comment prendre la créatine',
        table: {
          headers: ['Protocole', 'Dosage', "Délai d'effet"],
          rows: [
            ['Avec charge', '0,3 g/kg/j (3 j) puis 3-5 g/j', 'Stocks pleins en ~1 semaine'],
            ['Sans charge', '3-5 g/j directement', 'Stocks pleins en 3-4 semaines'],
            ['Entretien', '3-5 g/j', 'À maintenir dans la durée'],
          ],
        },
        ctaText: "MoovX intègre vos compléments dans votre suivi nutritionnel et vous rappelle vos prises. Essai 10 jours offert.",
        disclaimer: "Cet article est fourni à titre informatif et ne remplace pas l'avis d'un professionnel de santé. En cas de pathologie rénale ou de doute, consultez un médecin avant toute supplémentation.",
      },
      en: {
        title: 'Creatine for muscle building: dosage, effects and safety according to science',
        description: 'Creatine monohydrate is the most studied and effective supplement. 3 to 5 g per day, safe, no loading phase required. Here is the full picture.',
        intro: "Creatine is one of the most myth-laden topics in the fitness world. Water retention, kidney danger, mandatory loading phase... misconceptions die hard. Yet it is by far the most scientifically documented sports supplement, backed by hundreds of studies over several decades. We rely here on the official position of the International Society of Sports Nutrition to separate fact from fiction.",
        sections: [
          {
            heading: 'The most studied and effective supplement',
            paragraphs: [
              "The official ISSN position, published by Kreider and colleagues in 2017, is unequivocal: creatine monohydrate is the most studied and most effective form of creatine for increasing high-intensity exercise capacity and lean body mass. It is the most effective nutritional supplement currently available for athletes in terms of increasing high-intensity exercise capacity and muscle mass.",
              "This is not a marketing claim — it is the summary of hundreds of studies evaluated by independent researchers. Creatine increases phosphocreatine stores in muscles, allowing more energy production during short, intense efforts (weight training sets, sprints). The result: more reps, heavier loads, and therefore more stimulus for muscle growth.",
            ],
          },
          {
            heading: 'How much to take: 3 to 5 g per day',
            paragraphs: [
              "Two protocols exist. The first, with a loading phase: approximately 0.3 g per kg of body weight per day for 3 days (roughly 20 g/day for a 70 kg person), followed by 3 to 5 g per day for maintenance. This protocol rapidly saturates muscle creatine stores (in about 1 week).",
              "The second, without loading: 3 to 5 g per day right from the start. Muscle stores fill up in 3 to 4 weeks instead of one. The end result is strictly identical — only the timeline differs. The loading phase is therefore NOT mandatory; it is simply faster.",
              "Most practitioners prefer the no-loading method, which is simpler and avoids the digestive discomfort that the high dose can sometimes cause.",
            ],
          },
          {
            heading: 'Is it dangerous? What science says',
            paragraphs: [
              "The ISSN is categorical: there is no scientific evidence of harmful effects from creatine monohydrate in the short or long term in healthy individuals at recommended doses. This conclusion is reinforced by the 2021 review (Antonio et al.) which addresses the most common questions and misconceptions.",
              "The most widespread fears — kidney damage, hair loss, dehydration, cramps — are not supported by scientific data. Creatine may slightly increase blood creatinine (an indirect marker of kidney function), which can alarm an uninformed physician, but this does not reflect actual kidney damage.",
            ],
          },
          {
            heading: 'How to take it properly',
            paragraphs: [
              "Monohydrate is the gold standard. Other forms (HCL, ethyl ester, buffered) have not demonstrated superiority and cost more. No need to overpay.",
              "The timing of intake during the day matters little — morning, noon, evening, before or after training, the difference is negligible. What matters is consistency: taking your 3 to 5 g every day, without interruption. Taking it with carbohydrates or protein may slightly improve absorption, but it is not essential.",
            ],
          },
        ],
        tableTitle: 'How to take creatine',
        table: {
          headers: ['Protocol', 'Dosage', 'Time to effect'],
          rows: [
            ['With loading', '0.3 g/kg/d (3 d) then 3-5 g/d', 'Full stores in ~1 week'],
            ['Without loading', '3-5 g/d directly', 'Full stores in 3-4 weeks'],
            ['Maintenance', '3-5 g/d', 'Maintain long-term'],
          ],
        },
        ctaText: 'MoovX integrates your supplements into your nutritional tracking and reminds you of your doses. 10-day free trial.',
        disclaimer: 'This article is for informational purposes only and does not replace professional medical advice. If you have kidney disease or any doubts, consult a physician before supplementing.',
      },
      de: {
        title: 'Kreatin im Krafttraining: Dosierung, Wirkung und Sicherheit laut Wissenschaft',
        description: 'Kreatin-Monohydrat ist das am besten erforschte und wirksamste Supplement. 3 bis 5 g pro Tag, sicher, keine Ladephase erforderlich. Hier der Überblick.',
        intro: 'Kreatin gehört zu den Themen mit den meisten Mythen in der Fitnesswelt. Wassereinlagerungen, Nierenschäden, obligatorische Ladephase... Fehlinformationen halten sich hartnäckig. Dabei ist es mit Abstand das wissenschaftlich am besten dokumentierte Sportnahrungsergänzungsmittel, gestützt auf Hunderte von Studien über mehrere Jahrzehnte. Wir stützen uns hier auf die offizielle Position der International Society of Sports Nutrition, um Fakten von Mythen zu trennen.',
        sections: [
          {
            heading: 'Das am besten erforschte und wirksamste Supplement',
            paragraphs: [
              'Die offizielle ISSN-Position, veröffentlicht von Kreider und Kollegen 2017, ist eindeutig: Kreatin-Monohydrat ist die am besten erforschte und wirksamste Form von Kreatin zur Steigerung der hochintensiven Leistungsfähigkeit und der fettfreien Körpermasse. Es ist das effektivste derzeit verfügbare Nahrungsergänzungsmittel für Sportler.',
              'Das ist keine Marketingaussage — es ist die Zusammenfassung Hunderter von Studien, bewertet von unabhängigen Forschern. Kreatin erhöht die Phosphokreatinspeicher in den Muskeln, was mehr Energieproduktion bei kurzen, intensiven Belastungen ermöglicht (Krafttrainings-Sätze, Sprints). Das Ergebnis: mehr Wiederholungen, schwerere Gewichte und damit mehr Stimulus für Muskelwachstum.',
            ],
          },
          {
            heading: 'Wie viel einnehmen: 3 bis 5 g pro Tag',
            paragraphs: [
              'Zwei Protokolle existieren. Das erste, mit Ladephase: Etwa 0,3 g pro kg Körpergewicht pro Tag über 3 Tage (ca. 20 g/Tag für eine 70 kg schwere Person), gefolgt von 3 bis 5 g pro Tag zur Erhaltung. Dieses Protokoll füllt die Kreatinspeicher in den Muskeln schnell auf (in etwa 1 Woche).',
              'Das zweite, ohne Ladephase: 3 bis 5 g pro Tag von Anfang an. Die Muskelspeicher füllen sich in 3 bis 4 Wochen statt in einer. Das Endergebnis ist strikt identisch — nur der Zeitrahmen unterscheidet sich. Die Ladephase ist daher NICHT obligatorisch; sie ist einfach schneller.',
              'Die meisten Sportler bevorzugen die Methode ohne Laden — einfacher und ohne das Verdauungsunbehagen, das die hohe Dosis manchmal verursachen kann.',
            ],
          },
          {
            heading: 'Ist es gefährlich? Was die Wissenschaft sagt',
            paragraphs: [
              'Die ISSN ist kategorisch: Es gibt keine wissenschaftlichen Belege für schädliche Auswirkungen von Kreatin-Monohydrat kurz- oder langfristig bei gesunden Personen in empfohlenen Dosen. Diese Schlussfolgerung wird durch die Übersichtsarbeit von 2021 (Antonio et al.) verstärkt, die die häufigsten Fragen und Missverständnisse behandelt.',
              'Die am weitesten verbreiteten Befürchtungen — Nierenschäden, Haarausfall, Dehydration, Krämpfe — werden durch die wissenschaftlichen Daten nicht gestützt. Kreatin kann das Blutkreatinin leicht erhöhen (ein indirekter Marker der Nierenfunktion), was einen nicht informierten Arzt alarmieren kann, aber dies spiegelt keinen tatsächlichen Nierenschaden wider.',
            ],
          },
          {
            heading: 'Wie man es richtig einnimmt',
            paragraphs: [
              'Monohydrat ist der Goldstandard. Andere Formen (HCL, Ethylester, gepuffert) haben keine Überlegenheit gezeigt und kosten mehr. Kein Grund, mehr zu bezahlen.',
              'Der Zeitpunkt der Einnahme am Tag spielt kaum eine Rolle — morgens, mittags, abends, vor oder nach dem Training, der Unterschied ist vernachlässigbar. Was zählt, ist Regelmässigkeit: Täglich 3 bis 5 g einnehmen, ohne Unterbrechung. Die Einnahme mit Kohlenhydraten oder Protein kann die Aufnahme leicht verbessern, ist aber nicht unbedingt nötig.',
            ],
          },
        ],
        tableTitle: 'Wie man Kreatin einnimmt',
        table: {
          headers: ['Protokoll', 'Dosierung', 'Wirkungszeitraum'],
          rows: [
            ['Mit Ladephase', '0,3 g/kg/T (3 T) dann 3-5 g/T', 'Volle Speicher in ~1 Woche'],
            ['Ohne Ladephase', '3-5 g/T direkt', 'Volle Speicher in 3-4 Wochen'],
            ['Erhaltung', '3-5 g/T', 'Langfristig beibehalten'],
          ],
        },
        ctaText: 'MoovX integriert deine Supplements in dein Ernährungs-Tracking und erinnert dich an die Einnahme. 10 Tage kostenlos testen.',
        disclaimer: 'Dieser Artikel dient nur zu Informationszwecken und ersetzt keine professionelle medizinische Beratung. Bei Nierenerkrankungen oder Zweifeln einen Arzt konsultieren.',
      },
    },
  },
  {
    slug: 'sommeil-recuperation-musculaire-performance',
    date: '2026-06-05',
    readingMinutes: 5,
    references: [
      {
        authors: 'Craven J, McCartney D, Desbrow B, et al.',
        title: 'Effects of Acute Sleep Loss on Physical Performance: A Systematic and Meta-Analytical Review',
        journal: 'Sports Medicine',
        year: 2022,
        url: 'https://link.springer.com/article/10.1007/s40279-022-01706-y',
      },
      {
        authors: 'Watson AM',
        title: 'Sleep and Athletic Performance',
        journal: 'Current Sports Medicine Reports',
        year: 2017,
        url: 'https://pubmed.ncbi.nlm.nih.gov/29135639/',
      },
    ],
    content: {
      fr: {
        title: 'Sommeil et récupération musculaire : pourquoi dormir fait grandir vos muscles',
        description: "Le sommeil est un pilier sous-estimé de la performance et de la prise de muscle. 7 à 9h par nuit, davantage pour les sportifs. La science l'explique.",
        intro: "On optimise ses entraînements, on calcule ses macros, on chronomètre ses temps de repos. Mais il y a un facteur de progression que la majorité des sportifs négligent : le sommeil. C'est pourtant pendant le sommeil profond que le corps répare les fibres musculaires, libère les hormones de croissance et consolide les apprentissages moteurs. La science est formelle : mal dormir, c'est freiner sa progression.",
        sections: [
          {
            heading: "Combien d'heures dormir",
            paragraphs: [
              "Les recommandations de l'American Academy of Sleep Medicine situent le besoin de l'adulte entre 7 et 9 heures par nuit. C'est la fourchette dans laquelle la majorité des fonctions cognitives et physiques sont optimisées.",
              "Pour les sportifs soumis à de fortes charges d'entraînement, les données suggèrent que 9 à 10 heures de sommeil sont bénéfiques pour une récupération optimale. Ce n'est pas un luxe : c'est le prix de la réparation tissulaire intensive que demande l'entraînement en force.",
            ],
          },
          {
            heading: 'Le manque de sommeil dégrade la performance',
            paragraphs: [
              "La méta-analyse de Craven et collaborateurs, publiée en 2022 dans Sports Medicine et portant sur 69 études, est la plus complète sur le sujet. Elle montre que le manque de sommeil aigu (6 heures ou moins) altère la performance dans presque toutes les catégories d'effort physique testées.",
              "En moyenne, la performance décline d'environ 0,4% par heure d'éveil supplémentaire avant l'entraînement. Dit autrement : plus vous restez éveillé longtemps avant votre séance, moins vous performez. C'est un effet mesurable, reproductible, et qui touche autant la force que l'endurance.",
            ],
          },
          {
            heading: 'Pourquoi le sommeil construit le muscle',
            paragraphs: [
              "Le lien entre sommeil et croissance musculaire n'est pas seulement statistique — il est physiologique. Pendant le sommeil profond (stades N3 et REM), le corps libère l'hormone de croissance (GH), essentielle à la réparation et à la synthèse des fibres musculaires sollicitées à l'entraînement.",
              "Mal dormir réduit la sécrétion de GH, augmente le cortisol (hormone catabolique), et compromet la synthèse protéique musculaire. En pratique, cela signifie que deux athlètes suivant le même programme et la même alimentation progresseront différemment si l'un dort 8 heures et l'autre 5.",
            ],
          },
          {
            heading: 'Améliorer son sommeil concrètement',
            paragraphs: [
              "Les leviers les plus efficaces sont simples : maintenir des horaires réguliers de coucher et de lever (y compris le week-end), garder la chambre sombre et fraîche (18-20°C), et limiter les écrans et la caféine en soirée (idéalement 6 heures avant le coucher pour la caféine).",
              "La régularité prime sur la perfection ponctuelle. Une nuit de 6 heures dans une semaine de 8 heures régulières a un impact bien moindre qu'une alternance chaotique entre 5 et 10 heures. Le corps s'adapte aux routines — donnez-lui un rythme stable.",
            ],
          },
        ],
        tableTitle: 'Vos besoins de sommeil',
        table: {
          headers: ['Profil', 'Durée recommandée', 'Pourquoi'],
          rows: [
            ['Adulte', '7 – 9 h / nuit', 'Santé et récupération de base'],
            ['Sportif (charge élevée)', '9 – 10 h / nuit', 'Récupération optimale'],
            ['En dette de sommeil', '≤ 6 h', "Performance dégradée (~0,4%/h d'éveil)"],
          ],
        },
        ctaText: "MoovX suit votre sommeil et votre récupération aux côtés de vos entraînements pour une progression durable. Essai 10 jours offert.",
        disclaimer: "Cet article est fourni à titre informatif. En cas de troubles du sommeil persistants, consultez un professionnel de santé.",
      },
      en: {
        title: 'Sleep and muscle recovery: why sleeping grows your muscles',
        description: 'Sleep is an underestimated pillar of performance and muscle building. 7 to 9 hours per night, more for athletes. Science explains why.',
        intro: "We optimize our workouts, calculate our macros, time our rest periods. But there is one progression factor that most athletes neglect: sleep. It is during deep sleep that the body repairs muscle fibers, releases growth hormones, and consolidates motor learning. The science is clear: poor sleep means slower progress.",
        sections: [
          {
            heading: 'How many hours to sleep',
            paragraphs: [
              'The American Academy of Sleep Medicine recommends that adults sleep between 7 and 9 hours per night. This is the range in which most cognitive and physical functions are optimized.',
              'For athletes under heavy training loads, the data suggest that 9 to 10 hours of sleep are beneficial for optimal recovery. This is not a luxury: it is the cost of the intensive tissue repair that strength training demands.',
            ],
          },
          {
            heading: 'Sleep deprivation degrades performance',
            paragraphs: [
              'The meta-analysis by Craven and colleagues, published in 2022 in Sports Medicine and covering 69 studies, is the most comprehensive on the topic. It shows that acute sleep deprivation (6 hours or less) impairs performance across nearly all categories of physical effort tested.',
              'On average, performance declines by approximately 0.4% per additional hour of wakefulness before training. Put differently: the longer you stay awake before your session, the worse you perform. This is a measurable, reproducible effect that impacts both strength and endurance.',
            ],
          },
          {
            heading: 'Why sleep builds muscle',
            paragraphs: [
              'The link between sleep and muscle growth is not just statistical — it is physiological. During deep sleep (stages N3 and REM), the body releases growth hormone (GH), essential for the repair and synthesis of muscle fibers stressed during training.',
              'Poor sleep reduces GH secretion, increases cortisol (a catabolic hormone), and compromises muscle protein synthesis. In practice, this means two athletes following the same program and diet will progress differently if one sleeps 8 hours and the other 5.',
            ],
          },
          {
            heading: 'How to improve your sleep',
            paragraphs: [
              'The most effective levers are simple: maintain regular bedtime and wake times (including weekends), keep the bedroom dark and cool (18-20°C), and limit screens and caffeine in the evening (ideally 6 hours before bed for caffeine).',
              'Consistency matters more than occasional perfection. One 6-hour night in a week of regular 8-hour nights has far less impact than chaotic alternation between 5 and 10 hours. The body adapts to routines — give it a stable rhythm.',
            ],
          },
        ],
        tableTitle: 'Your sleep needs',
        table: {
          headers: ['Profile', 'Recommended duration', 'Why'],
          rows: [
            ['Adult', '7 – 9 h / night', 'Basic health and recovery'],
            ['Athlete (high load)', '9 – 10 h / night', 'Optimal recovery'],
            ['Sleep deprived', '≤ 6 h', 'Degraded performance (~0.4%/h of wakefulness)'],
          ],
        },
        ctaText: 'MoovX tracks your sleep and recovery alongside your workouts for sustainable progress. 10-day free trial.',
        disclaimer: 'This article is for informational purposes only. If you have persistent sleep issues, consult a healthcare professional.',
      },
      de: {
        title: 'Schlaf und Muskelregeneration: Warum Schlafen deine Muskeln wachsen lässt',
        description: 'Schlaf ist eine unterschätzte Säule der Leistung und des Muskelaufbaus. 7 bis 9 Stunden pro Nacht, mehr für Sportler. Die Wissenschaft erklärt warum.',
        intro: 'Wir optimieren unser Training, berechnen unsere Makros, stoppen unsere Ruhezeiten. Aber es gibt einen Progressionsfaktor, den die meisten Sportler vernachlässigen: den Schlaf. Während des Tiefschlafs repariert der Körper Muskelfasern, schüttet Wachstumshormone aus und festigt motorische Lernprozesse. Die Wissenschaft ist eindeutig: Schlechter Schlaf bremst den Fortschritt.',
        sections: [
          {
            heading: 'Wie viele Stunden schlafen',
            paragraphs: [
              'Die American Academy of Sleep Medicine empfiehlt für Erwachsene 7 bis 9 Stunden Schlaf pro Nacht. In diesem Bereich sind die meisten kognitiven und körperlichen Funktionen optimal.',
              'Für Sportler unter hoher Trainingsbelastung deuten die Daten darauf hin, dass 9 bis 10 Stunden Schlaf für eine optimale Erholung vorteilhaft sind. Das ist kein Luxus: Es ist der Preis für die intensive Gewebereparatur, die Krafttraining erfordert.',
            ],
          },
          {
            heading: 'Schlafmangel verschlechtert die Leistung',
            paragraphs: [
              'Die Metaanalyse von Craven und Kollegen, veröffentlicht 2022 in Sports Medicine und umfassend 69 Studien, ist die umfangreichste zu diesem Thema. Sie zeigt, dass akuter Schlafmangel (6 Stunden oder weniger) die Leistung in nahezu allen getesteten Kategorien körperlicher Anstrengung beeinträchtigt.',
              'Im Durchschnitt sinkt die Leistung um etwa 0,4% pro zusätzliche Stunde Wachheit vor dem Training. Anders gesagt: Je länger du vor deiner Einheit wach bist, desto schlechter performst du. Das ist ein messbarer, reproduzierbarer Effekt, der sowohl Kraft als auch Ausdauer betrifft.',
            ],
          },
          {
            heading: 'Warum Schlaf Muskeln aufbaut',
            paragraphs: [
              'Die Verbindung zwischen Schlaf und Muskelwachstum ist nicht nur statistisch — sie ist physiologisch. Während des Tiefschlafs (Stadien N3 und REM) schüttet der Körper Wachstumshormon (GH) aus, das für die Reparatur und Synthese der beim Training beanspruchten Muskelfasern essentiell ist.',
              'Schlechter Schlaf reduziert die GH-Ausschüttung, erhöht Cortisol (ein kataboles Hormon) und beeinträchtigt die Muskelproteinsynthese. In der Praxis bedeutet das: Zwei Athleten mit demselben Programm und derselben Ernährung werden unterschiedlich Fortschritte machen, wenn einer 8 Stunden und der andere 5 schläft.',
            ],
          },
          {
            heading: 'Schlaf konkret verbessern',
            paragraphs: [
              'Die wirksamsten Hebel sind einfach: Regelmässige Schlaf- und Aufstehzeiten einhalten (auch am Wochenende), das Schlafzimmer dunkel und kühl halten (18-20°C) und Bildschirme sowie Koffein am Abend einschränken (idealerweise 6 Stunden vor dem Schlafengehen für Koffein).',
              'Regelmässigkeit zählt mehr als gelegentliche Perfektion. Eine 6-Stunden-Nacht in einer Woche mit regelmässigen 8-Stunden-Nächten hat weit weniger Auswirkungen als chaotischer Wechsel zwischen 5 und 10 Stunden. Der Körper passt sich an Routinen an — gib ihm einen stabilen Rhythmus.',
            ],
          },
        ],
        tableTitle: 'Dein Schlafbedarf',
        table: {
          headers: ['Profil', 'Empfohlene Dauer', 'Warum'],
          rows: [
            ['Erwachsener', '7 – 9 h / Nacht', 'Grundlegende Gesundheit und Erholung'],
            ['Sportler (hohe Belastung)', '9 – 10 h / Nacht', 'Optimale Erholung'],
            ['Schlafdefizit', '≤ 6 h', 'Leistungseinbusse (~0,4%/h Wachheit)'],
          ],
        },
        ctaText: 'MoovX verfolgt deinen Schlaf und deine Erholung neben deinem Training für nachhaltige Fortschritte. 10 Tage kostenlos testen.',
        disclaimer: 'Dieser Artikel dient nur zu Informationszwecken. Bei anhaltenden Schlafproblemen einen Gesundheitsfachmann konsultieren.',
      },
    },
  },
]

export function getPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug)
}

export function getAllPosts(): BlogPost[] {
  return [...BLOG_POSTS].sort((a, b) => b.date.localeCompare(a.date))
}
