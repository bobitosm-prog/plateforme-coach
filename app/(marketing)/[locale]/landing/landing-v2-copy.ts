export type LandingV2Locale = 'fr' | 'en' | 'de'

export type LandingV2Copy = {
  a11y: { home: string; navigation: string }
  nav: { product: string; method: string; pricing: string; login: string; start: string }
  hero: {
    eyebrow: string
    titleA: string
    titleB: string
    body: string
    primary: string
    secondary: string
    note: string
  }
  preview: {
    label: string
    greeting: string
    day: string
    training: string
    trainingValue: string
    nutrition: string
    nutritionValue: string
    recovery: string
    recoveryValue: string
    next: string
    nextValue: string
    cta: string
  }
  proof: readonly string[]
  system: { eyebrow: string; title: string; body: string }
  screens: {
    eyebrow: string
    title: string
    body: string
    items: readonly { title: string; detail: string; alt: string }[]
  }
  tabs: Record<'training' | 'nutrition' | 'recovery' | 'athena', { label: string; kicker: string; title: string; body: string }>
  training: { exercise: string; set: string; target: string; weight: string; reps: string; effort: string; progress: string }
  nutrition: { consumed: string; target: string; proteins: string; carbs: string; fats: string; meals: string }
  recovery: { chest: string; legs: string; ready: string; recovering: string; note: string }
  athena: { question: string; answer: string; source: string; note: string; active: string }
  method: {
    eyebrow: string
    title: string
    body: string
    steps: readonly { index: string; title: string; body: string }[]
  }
  science: { eyebrow: string; title: string; body: string; link: string; items: readonly { title: string; body: string }[] }
  progress: { eyebrow: string; title: string; body: string; metrics: readonly { value: string; label: string; detail: string }[] }
  pricing: {
    eyebrow: string
    title: string
    body: string
    monthly: string
    yearly: string
    lifetime: string
    product: string
    included: readonly string[]
    cta: string
    note: string
    coach: string
  }
  faq: { title: string; items: readonly { question: string; answer: string }[] }
  final: { eyebrow: string; title: string; body: string; cta: string }
  footer: { product: string; resources: string; legal: string; privacy: string; terms: string; login: string; coach: string; note: string }
}

export const LANDING_V2_COPY: Record<LandingV2Locale, LandingV2Copy> = {
  fr: {
    a11y: { home: 'MoovX — accueil', navigation: 'Navigation principale' },
    nav: { product: 'Le produit', method: 'La méthode', pricing: 'Tarifs', login: 'Connexion', start: 'Essayer MoovX' },
    hero: {
      eyebrow: 'Coaching adaptatif · Conçu à Genève',
      titleA: 'Ton plan s’adapte.',
      titleB: 'Tes progrès aussi.',
      body: 'Ton application de musculation et de nutrition personnalisées : organise tes séances, suis ta récupération et ta progression avec Athena, ton assistant de coaching.',
      primary: 'Créer mon programme',
      secondary: 'Voir MoovX en action',
      note: '14 jours gratuits · Sans carte · Sans engagement',
    },
    preview: {
      label: 'Aperçu de l’app', greeting: 'Aujourd’hui', day: 'Mardi 13 septembre',
      training: 'Entraînement', trainingValue: 'Haut du corps · 48 min', nutrition: 'Nutrition', nutritionValue: '1 620 / 2 250 kcal',
      recovery: 'Récupération', recoveryValue: 'Pectoraux en cours', next: 'Prochaine action', nextValue: 'Ta séance est prête', cta: 'Commencer la séance',
    },
    proof: ['Programme adapté à ton rythme', 'Décisions fondées sur tes données', 'Suivi FR · EN · DE'],
    system: { eyebrow: 'Une seule app. Quatre moteurs.', title: 'Chaque donnée devient une décision utile.', body: 'MoovX relie ce que tu planifies, ce que tu réalises et ce que tu ressens pour te montrer clairement quoi faire ensuite.' },
    screens: {
      eyebrow: 'L’application aujourd’hui',
      title: 'MoovX, tel que tu l’utilises.',
      body: 'De vraies vues de l’interface actuelle, capturées directement depuis les composants de l’application avec un profil de démonstration anonyme.',
      items: [
        { title: 'Accueil', detail: 'Ta séance et ton statut du jour', alt: 'Interface actuelle de l’accueil MoovX' },
        { title: 'Séance active', detail: 'Charge, répétitions et RIR', alt: 'Interface actuelle d’une séance active MoovX' },
        { title: 'Nutrition', detail: 'Calories, macros et outils', alt: 'Interface actuelle du suivi nutritionnel MoovX' },
        { title: 'Récupération', detail: 'Lecture musculaire interactive', alt: 'Interface actuelle de la récupération musculaire MoovX' },
      ],
    },
    tabs: {
      training: { label: 'Entraînement', kicker: 'Exécuter', title: 'Une séance claire, série après série.', body: 'Charges, répétitions, RIR, temps de repos et progression restent au même endroit.' },
      nutrition: { label: 'Nutrition', kicker: 'Structurer', title: 'Des repères adaptés à ton objectif.', body: 'Suis ton énergie et tes macros sans transformer chaque repas en équation.' },
      recovery: { label: 'Récupération', kicker: 'Observer', title: 'Vois ce qui a réellement travaillé.', body: 'Les séances terminées alimentent une estimation musculaire prudente, jamais un diagnostic médical.' },
      athena: { label: 'Athena', kicker: 'Ajuster', title: 'Un conseil qui connaît ton contexte.', body: 'Athena utilise ton onboarding et tes données récentes pour répondre avec des limites explicites.' },
    },
    training: { exercise: 'Développé couché', set: 'Série 3 sur 4', target: 'Objectif', weight: '80 kg', reps: '8 reps', effort: 'RIR 2', progress: 'Progression proposée après validation de la séance' },
    nutrition: { consumed: 'Consommé', target: 'Objectif du jour', proteins: 'Protéines', carbs: 'Glucides', fats: 'Lipides', meals: 'Repas enregistrés' },
    recovery: { chest: 'Pectoraux', legs: 'Quadriceps', ready: 'Probablement disponible', recovering: 'Récupération en cours', note: 'Estimation non médicale fondée sur les séances terminées.' },
    athena: { question: 'Je garde la séance prévue aujourd’hui ?', answer: 'Tes données récentes ne montrent pas de signal suffisant pour modifier automatiquement la séance. Garde le plan prévu et ajuste si tes sensations sont inhabituelles.', source: 'Contexte utilisé', note: 'Onboarding · séances · RIR · suivi récent', active: 'Contexte actif' },
    method: {
      eyebrow: 'Du premier objectif au prochain progrès', title: 'MoovX suit le processus complet.', body: 'Pas une collection d’outils isolés : une boucle simple qui devient plus utile à mesure que tu l’utilises.',
      steps: [
        { index: '01', title: 'Définis ton contexte', body: 'Objectif, expérience, disponibilité, matériel, alimentation et contraintes.' },
        { index: '02', title: 'Reçois un plan cohérent', body: 'Une structure d’entraînement et de nutrition adaptée à ce que tu peux réellement tenir.' },
        { index: '03', title: 'Enregistre le réel', body: 'Séances, séries, repas, poids, mensurations, sommeil et ressenti.' },
        { index: '04', title: 'Ajuste avec méthode', body: 'Progression, récupération et conseils Athena s’appuient sur les données disponibles.' },
      ],
    },
    science: {
      eyebrow: 'Athena · Science et prudence', title: 'Utile parce qu’elle ne prétend pas tout savoir.', body: 'Athena distingue les faits enregistrés, les estimations et les informations manquantes. Elle accompagne les décisions fitness sans remplacer un professionnel de santé.', link: 'Comprendre Athena',
      items: [
        { title: 'Contexte explicite', body: 'Objectifs, préférences et historique sont utilisés sans inventer les données absentes.' },
        { title: 'Repères documentés', body: 'Les recommandations sont encadrées par des politiques d’entraînement, nutrition et récupération.' },
        { title: 'Limites visibles', body: 'Pas de diagnostic, pas de score médical et une orientation vers un professionnel lorsque nécessaire.' },
      ],
    },
    progress: {
      eyebrow: 'Suivi longitudinal', title: 'Le progrès ne se résume pas à la balance.', body: 'Observe la tendance, la performance et la régularité au lieu de réagir à une journée isolée.',
      metrics: [
        { value: 'Charge', label: 'Records et exercices', detail: 'Historique par mouvement' },
        { value: 'Volume', label: 'Travail hebdomadaire', detail: 'Séries réellement terminées' },
        { value: 'Corps', label: 'Poids et mensurations', detail: 'Tendances par période' },
        { value: 'Rythme', label: 'Sommeil et ressenti', detail: 'Contexte, pas diagnostic' },
      ],
    },
    pricing: {
      eyebrow: 'Simple et transparent', title: 'Toute l’expérience MoovX.', body: 'Choisis la durée qui te convient. Le produit reste le même.', monthly: 'CHF 10 / mois', yearly: 'CHF 80 / an', lifetime: 'CHF 150 à vie', product: 'MoovX complet',
      included: ['Programme personnalisé', 'Nutrition et suivi des macros', 'Athena et suivi contextuel', 'Récupération musculaire', 'Progression et historique', 'Application FR · EN · DE'],
      cta: 'Commencer gratuitement', note: '14 jours gratuits · Sans carte · Annulation libre', coach: 'Tu es coach ? Découvrir l’espace professionnel',
    },
    faq: {
      title: 'Les réponses avant de commencer.',
      items: [
        { question: 'MoovX convient-il aux débutants ?', answer: 'Oui. L’onboarding prend en compte l’expérience, la disponibilité et le matériel afin de proposer un point de départ cohérent.' },
        { question: 'Athena remplace-t-elle un coach ou un médecin ?', answer: 'Non. Athena est un assistant numérique de coaching. Ses estimations ne constituent ni un diagnostic ni un avis médical.' },
        { question: 'Dois-je suivre un programme six jours par semaine ?', answer: 'Non. La fréquence dépend de ton profil et de ta disponibilité. MoovX n’impose pas un PPL six jours.' },
        { question: 'Puis-je utiliser MoovX avec un coach humain ?', answer: 'Oui. Un coach peut gérer les programmes, la nutrition et le suivi de ses clients depuis son espace professionnel.' },
      ],
    },
    final: { eyebrow: 'Ta prochaine action est simple', title: 'Commence avec un plan que tu peux vraiment suivre.', body: 'Deux minutes pour poser ton contexte. MoovX construit ensuite la première étape.', cta: 'Créer mon programme' },
    footer: { product: 'Produit', resources: 'Ressources', legal: 'Légal', privacy: 'Confidentialité', terms: 'Conditions générales', login: 'Connexion', coach: 'Espace coach', note: 'Coaching fitness adaptatif · Genève, Suisse' },
  },
  en: {
    a11y: { home: 'MoovX — home', navigation: 'Main navigation' },
    nav: { product: 'Product', method: 'Method', pricing: 'Pricing', login: 'Log in', start: 'Try MoovX' },
    hero: {
      eyebrow: 'Adaptive coaching · Designed in Geneva',
      titleA: 'Your plan adapts.',
      titleB: 'So does your progress.',
      body: 'Training, nutrition, recovery and Athena in one app that evolves with your workouts and everyday life.',
      primary: 'Create my programme', secondary: 'See MoovX in action', note: '14 days free · No card · No commitment',
    },
    preview: {
      label: 'App preview', greeting: 'Today', day: 'Tuesday, 13 September', training: 'Training', trainingValue: 'Upper body · 48 min', nutrition: 'Nutrition', nutritionValue: '1,620 / 2,250 kcal', recovery: 'Recovery', recoveryValue: 'Chest recovering', next: 'Next action', nextValue: 'Your workout is ready', cta: 'Start workout',
    },
    proof: ['A programme adapted to your pace', 'Decisions based on your data', 'Available in FR · EN · DE'],
    system: { eyebrow: 'One app. Four engines.', title: 'Every data point becomes a useful decision.', body: 'MoovX connects what you plan, what you complete and how you feel to show you clearly what to do next.' },
    screens: {
      eyebrow: 'The app today', title: 'MoovX, as you will use it.', body: 'Real views of the current interface, captured directly from the app components with an anonymous demo profile.',
      items: [
        { title: 'Home', detail: 'Your workout and daily status', alt: 'Current MoovX home screen' },
        { title: 'Active workout', detail: 'Load, repetitions and RIR', alt: 'Current MoovX active workout screen' },
        { title: 'Nutrition', detail: 'Calories, macros and tools', alt: 'Current MoovX nutrition tracking screen' },
        { title: 'Recovery', detail: 'Interactive muscle overview', alt: 'Current MoovX muscle recovery screen' },
      ],
    },
    tabs: {
      training: { label: 'Training', kicker: 'Perform', title: 'A clear workout, set by set.', body: 'Loads, repetitions, RIR, rest times and progression stay together.' },
      nutrition: { label: 'Nutrition', kicker: 'Structure', title: 'Guidance tailored to your goal.', body: 'Track energy and macros without turning every meal into an equation.' },
      recovery: { label: 'Recovery', kicker: 'Observe', title: 'See what actually worked.', body: 'Completed workouts feed a cautious muscle recovery estimate, never a medical diagnosis.' },
      athena: { label: 'Athena', kicker: 'Adjust', title: 'Advice that knows your context.', body: 'Athena uses your onboarding and recent data to answer with explicit limits.' },
    },
    training: { exercise: 'Bench press', set: 'Set 3 of 4', target: 'Target', weight: '80 kg', reps: '8 reps', effort: 'RIR 2', progress: 'Progression suggested after workout validation' },
    nutrition: { consumed: 'Consumed', target: 'Daily target', proteins: 'Protein', carbs: 'Carbohydrates', fats: 'Fat', meals: 'Meals logged' },
    recovery: { chest: 'Chest', legs: 'Quadriceps', ready: 'Probably available', recovering: 'Recovering', note: 'Non-medical estimate based on completed workouts.' },
    athena: { question: 'Should I keep today’s planned workout?', answer: 'Your recent data does not show enough evidence to change the workout automatically. Keep the plan and adjust if how you feel is unusual.', source: 'Context used', note: 'Onboarding · workouts · RIR · recent tracking', active: 'Context active' },
    method: {
      eyebrow: 'From your first goal to your next gain', title: 'MoovX follows the full process.', body: 'Not a collection of isolated tools: a simple loop that becomes more useful as you use it.',
      steps: [
        { index: '01', title: 'Define your context', body: 'Goal, experience, availability, equipment, nutrition and constraints.' },
        { index: '02', title: 'Receive a coherent plan', body: 'Training and nutrition structured around what you can realistically sustain.' },
        { index: '03', title: 'Record what happened', body: 'Workouts, sets, meals, weight, measurements, sleep and how you feel.' },
        { index: '04', title: 'Adjust methodically', body: 'Progression, recovery and Athena guidance use the data available.' },
      ],
    },
    science: {
      eyebrow: 'Athena · Science and caution', title: 'Useful because it does not pretend to know everything.', body: 'Athena distinguishes recorded facts, estimates and missing information. It supports fitness decisions without replacing a healthcare professional.', link: 'Understand Athena',
      items: [
        { title: 'Explicit context', body: 'Goals, preferences and history are used without inventing missing data.' },
        { title: 'Documented guidance', body: 'Recommendations are governed by training, nutrition and recovery policies.' },
        { title: 'Visible limits', body: 'No diagnosis, no medical score and guidance to consult a professional when appropriate.' },
      ],
    },
    progress: {
      eyebrow: 'Long-term tracking', title: 'Progress is more than a number on the scale.', body: 'Follow trends, performance and consistency instead of reacting to a single day.',
      metrics: [
        { value: 'Load', label: 'Records and exercises', detail: 'History by movement' },
        { value: 'Volume', label: 'Weekly work', detail: 'Sets actually completed' },
        { value: 'Body', label: 'Weight and measurements', detail: 'Trends over time' },
        { value: 'Rhythm', label: 'Sleep and how you feel', detail: 'Context, not diagnosis' },
      ],
    },
    pricing: {
      eyebrow: 'Simple and transparent', title: 'The full MoovX experience.', body: 'Choose the duration that suits you. The product stays the same.', monthly: 'CHF 10 / month', yearly: 'CHF 80 / year', lifetime: 'CHF 150 lifetime', product: 'Complete MoovX',
      included: ['Personalised programme', 'Nutrition and macro tracking', 'Athena and contextual guidance', 'Muscle recovery', 'Progress and history', 'App in FR · EN · DE'],
      cta: 'Start for free', note: '14 days free · No card · Cancel anytime', coach: 'Are you a coach? Discover the professional space',
    },
    faq: {
      title: 'Answers before you begin.',
      items: [
        { question: 'Is MoovX suitable for beginners?', answer: 'Yes. Onboarding considers your experience, availability and equipment to suggest a coherent starting point.' },
        { question: 'Does Athena replace a coach or doctor?', answer: 'No. Athena is a digital coaching assistant. Its estimates are neither a diagnosis nor medical advice.' },
        { question: 'Do I need to train six days a week?', answer: 'No. Frequency depends on your profile and availability. MoovX does not impose a six-day PPL split.' },
        { question: 'Can I use MoovX with a human coach?', answer: 'Yes. A coach can manage programmes, nutrition and client tracking from the professional space.' },
      ],
    },
    final: { eyebrow: 'Your next action is simple', title: 'Start with a plan you can actually follow.', body: 'Two minutes to establish your context. MoovX then builds the first step.', cta: 'Create my programme' },
    footer: { product: 'Product', resources: 'Resources', legal: 'Legal', privacy: 'Privacy', terms: 'Terms and conditions', login: 'Log in', coach: 'Coach space', note: 'Adaptive fitness coaching · Geneva, Switzerland' },
  },
  de: {
    a11y: { home: 'MoovX — Startseite', navigation: 'Hauptnavigation' },
    nav: { product: 'Produkt', method: 'Methode', pricing: 'Preise', login: 'Anmelden', start: 'MoovX testen' },
    hero: {
      eyebrow: 'Adaptives Coaching · Entwickelt in Genf', titleA: 'Dein Plan passt sich an.', titleB: 'Dein Fortschritt auch.', body: 'Training, Ernährung, Regeneration und Athena in einer App, die sich mit deinen Einheiten und deinem Alltag weiterentwickelt.', primary: 'Mein Programm erstellen', secondary: 'MoovX in Aktion', note: '14 Tage kostenlos · Keine Karte · Keine Bindung',
    },
    preview: {
      label: 'App-Vorschau', greeting: 'Heute', day: 'Dienstag, 13. September', training: 'Training', trainingValue: 'Oberkörper · 48 Min.', nutrition: 'Ernährung', nutritionValue: '1.620 / 2.250 kcal', recovery: 'Regeneration', recoveryValue: 'Brust in Regeneration', next: 'Nächster Schritt', nextValue: 'Dein Training ist bereit', cta: 'Training starten',
    },
    proof: ['Ein Programm in deinem Rhythmus', 'Entscheidungen auf Basis deiner Daten', 'Verfügbar auf FR · EN · DE'],
    system: { eyebrow: 'Eine App. Vier Motoren.', title: 'Jeder Datenpunkt wird zu einer nützlichen Entscheidung.', body: 'MoovX verbindet deine Planung, deine tatsächliche Leistung und dein Befinden und zeigt dir klar, was als Nächstes ansteht.' },
    screens: {
      eyebrow: 'Die App heute', title: 'MoovX, so wie du es nutzt.', body: 'Echte Ansichten der aktuellen Oberfläche, direkt aus den App-Komponenten mit einem anonymen Demoprofil aufgenommen.',
      items: [
        { title: 'Start', detail: 'Dein Training und Tagesstatus', alt: 'Aktuelle Startansicht von MoovX' },
        { title: 'Aktives Training', detail: 'Gewicht, Wiederholungen und RIR', alt: 'Aktuelle Ansicht eines aktiven MoovX-Trainings' },
        { title: 'Ernährung', detail: 'Kalorien, Makros und Tools', alt: 'Aktuelle Ernährungsübersicht von MoovX' },
        { title: 'Regeneration', detail: 'Interaktive Muskelübersicht', alt: 'Aktuelle Muskelregenerationsansicht von MoovX' },
      ],
    },
    tabs: {
      training: { label: 'Training', kicker: 'Ausführen', title: 'Ein klares Training, Satz für Satz.', body: 'Gewichte, Wiederholungen, RIR, Pausenzeiten und Fortschritt bleiben an einem Ort.' },
      nutrition: { label: 'Ernährung', kicker: 'Strukturieren', title: 'Orientierung passend zu deinem Ziel.', body: 'Verfolge Energie und Makros, ohne jede Mahlzeit in eine Gleichung zu verwandeln.' },
      recovery: { label: 'Regeneration', kicker: 'Beobachten', title: 'Sieh, was wirklich gearbeitet hat.', body: 'Abgeschlossene Trainings liefern eine vorsichtige Einschätzung der Muskelregeneration – niemals eine medizinische Diagnose.' },
      athena: { label: 'Athena', kicker: 'Anpassen', title: 'Ein Rat, der deinen Kontext kennt.', body: 'Athena nutzt dein Onboarding und deine jüngsten Daten und macht Grenzen transparent.' },
    },
    training: { exercise: 'Bankdrücken', set: 'Satz 3 von 4', target: 'Ziel', weight: '80 kg', reps: '8 Wdh.', effort: 'RIR 2', progress: 'Fortschritt wird nach Abschluss des Trainings vorgeschlagen' },
    nutrition: { consumed: 'Verzehrt', target: 'Tagesziel', proteins: 'Protein', carbs: 'Kohlenhydrate', fats: 'Fett', meals: 'Erfasste Mahlzeiten' },
    recovery: { chest: 'Brust', legs: 'Quadrizeps', ready: 'Vermutlich verfügbar', recovering: 'In Regeneration', note: 'Nicht-medizinische Schätzung auf Basis abgeschlossener Trainings.' },
    athena: { question: 'Soll ich das heutige Training wie geplant machen?', answer: 'Deine aktuellen Daten liefern keinen ausreichenden Hinweis, das Training automatisch zu ändern. Halte am Plan fest und passe ihn an, wenn sich dein Befinden ungewöhnlich anfühlt.', source: 'Verwendeter Kontext', note: 'Onboarding · Trainings · RIR · aktuelles Tracking', active: 'Kontext aktiv' },
    method: {
      eyebrow: 'Vom ersten Ziel zum nächsten Fortschritt', title: 'MoovX begleitet den gesamten Prozess.', body: 'Keine Sammlung isolierter Tools, sondern ein einfacher Kreislauf, der mit jeder Nutzung hilfreicher wird.',
      steps: [
        { index: '01', title: 'Definiere deinen Kontext', body: 'Ziel, Erfahrung, Verfügbarkeit, Ausrüstung, Ernährung und Einschränkungen.' },
        { index: '02', title: 'Erhalte einen stimmigen Plan', body: 'Eine Trainings- und Ernährungsstruktur, die du realistisch einhalten kannst.' },
        { index: '03', title: 'Erfasse die Realität', body: 'Trainings, Sätze, Mahlzeiten, Gewicht, Maße, Schlaf und Befinden.' },
        { index: '04', title: 'Passe gezielt an', body: 'Fortschritt, Regeneration und Athena-Ratschläge nutzen die verfügbaren Daten.' },
      ],
    },
    science: {
      eyebrow: 'Athena · Wissenschaft und Umsicht', title: 'Hilfreich, weil sie nicht vorgibt, alles zu wissen.', body: 'Athena unterscheidet erfasste Fakten, Schätzungen und fehlende Informationen. Sie unterstützt Fitnessentscheidungen, ohne medizinisches Fachpersonal zu ersetzen.', link: 'Athena verstehen',
      items: [
        { title: 'Expliziter Kontext', body: 'Ziele, Präferenzen und Verlauf werden genutzt, ohne fehlende Daten zu erfinden.' },
        { title: 'Dokumentierte Leitlinien', body: 'Empfehlungen folgen Richtlinien für Training, Ernährung und Regeneration.' },
        { title: 'Sichtbare Grenzen', body: 'Keine Diagnose, kein medizinischer Score und der Hinweis auf Fachpersonal, wenn es nötig ist.' },
      ],
    },
    progress: {
      eyebrow: 'Langfristiges Tracking', title: 'Fortschritt ist mehr als die Zahl auf der Waage.', body: 'Beobachte Trends, Leistung und Konstanz, statt auf einen einzelnen Tag zu reagieren.',
      metrics: [
        { value: 'Last', label: 'Rekorde und Übungen', detail: 'Verlauf pro Bewegung' },
        { value: 'Volumen', label: 'Wöchentliche Arbeit', detail: 'Tatsächlich absolvierte Sätze' },
        { value: 'Körper', label: 'Gewicht und Maße', detail: 'Trends im Zeitverlauf' },
        { value: 'Rhythmus', label: 'Schlaf und Befinden', detail: 'Kontext, keine Diagnose' },
      ],
    },
    pricing: {
      eyebrow: 'Einfach und transparent', title: 'Das vollständige MoovX-Erlebnis.', body: 'Wähle die Laufzeit, die zu dir passt. Das Produkt bleibt dasselbe.', monthly: 'CHF 10 / Monat', yearly: 'CHF 80 / Jahr', lifetime: 'CHF 150 lebenslang', product: 'MoovX komplett',
      included: ['Personalisiertes Programm', 'Ernährung und Makro-Tracking', 'Athena und kontextbezogene Begleitung', 'Muskelregeneration', 'Fortschritt und Verlauf', 'App auf FR · EN · DE'],
      cta: 'Kostenlos starten', note: '14 Tage kostenlos · Keine Karte · Jederzeit kündbar', coach: 'Du bist Coach? Entdecke den professionellen Bereich',
    },
    faq: {
      title: 'Antworten, bevor du startest.',
      items: [
        { question: 'Ist MoovX für Anfänger geeignet?', answer: 'Ja. Das Onboarding berücksichtigt Erfahrung, Verfügbarkeit und Ausrüstung, um einen passenden Ausgangspunkt vorzuschlagen.' },
        { question: 'Ersetzt Athena einen Coach oder Arzt?', answer: 'Nein. Athena ist ein digitaler Coaching-Assistent. Die Einschätzungen sind weder Diagnose noch medizinischer Rat.' },
        { question: 'Muss ich sechs Tage pro Woche trainieren?', answer: 'Nein. Die Häufigkeit hängt von deinem Profil und deiner Verfügbarkeit ab. MoovX schreibt keinen sechstägigen PPL-Plan vor.' },
        { question: 'Kann ich MoovX mit einem menschlichen Coach nutzen?', answer: 'Ja. Coaches können Programme, Ernährung und das Tracking ihrer Kunden im professionellen Bereich verwalten.' },
      ],
    },
    final: { eyebrow: 'Dein nächster Schritt ist einfach', title: 'Starte mit einem Plan, den du wirklich einhalten kannst.', body: 'Zwei Minuten, um deinen Kontext festzulegen. Danach erstellt MoovX den ersten Schritt.', cta: 'Mein Programm erstellen' },
    footer: { product: 'Produkt', resources: 'Ressourcen', legal: 'Rechtliches', privacy: 'Datenschutz', terms: 'Allgemeine Geschäftsbedingungen', login: 'Anmelden', coach: 'Coach-Bereich', note: 'Adaptives Fitness-Coaching · Genf, Schweiz' },
  },
}
