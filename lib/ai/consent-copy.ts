export const aiConsentCopy = {
  fr: {
    title: 'Athena et tes données',
    intro: 'Athena utilise Claude, le service d’intelligence artificielle d’Anthropic.',
    data: 'Selon la fonction utilisée, MoovX transmet à Anthropic les informations utiles de ton profil (prénom, âge, mensurations, objectifs), tes entraînements et bilans, tes préférences et restrictions alimentaires, tes messages, et les photos que tu choisis d’analyser. Ces informations peuvent concerner ta santé.',
    purpose: 'Cela permet de créer tes programmes et recettes, répondre à tes questions, analyser tes photos et préparer tes bilans, y compris les bilans automatiques activés.',
    choice: 'Tu peux utiliser les fonctions manuelles sans accepter. Tu peux retirer cet accord dans Compte → Préférences : les futurs envois seront bloqués. Une demande déjà envoyée ne peut pas être annulée.',
    accept: 'Accepter et continuer', later: 'Plus tard', privacy: 'Confidentialité MoovX', provider: 'Confidentialité Anthropic',
    settings: 'Intelligence artificielle · Anthropic', active: 'Partage autorisé pour Athena', inactive: 'Partage non autorisé', loading: 'Vérification…',
    revoke: 'Retirer mon accord', enable: 'Examiner et autoriser', error: 'Impossible de vérifier ou de modifier ton accord. Réessaie.',
    declined: 'Génération reportée. Tu peux continuer sans IA.', account: 'Le compte a changé. Relance cette action depuis le compte concerné.',
    subject: 'L’accord du client doit venir de son propre compte. La génération depuis cet espace coach reste désactivée ; la modification manuelle reste disponible.',
  },
  en: {
    title: 'Athena and your data', intro: 'Athena uses Claude, Anthropic’s artificial intelligence service.',
    data: 'Depending on the feature, MoovX sends Anthropic relevant profile details (first name, age, body measurements, goals), workouts and check-ins, food preferences and restrictions, messages, and photos you choose to analyse. This may include health information.',
    purpose: 'This is used to create programmes and recipes, answer questions, analyse photos and prepare reviews, including enabled automatic reviews.',
    choice: 'You can use manual features without agreeing. Withdraw permission in Account → Preferences to block future sharing. A request already sent cannot be cancelled.',
    accept: 'Agree and continue', later: 'Later', privacy: 'MoovX privacy', provider: 'Anthropic privacy',
    settings: 'Artificial intelligence · Anthropic', active: 'Sharing with Athena allowed', inactive: 'Sharing not allowed', loading: 'Checking…',
    revoke: 'Withdraw permission', enable: 'Review and allow', error: 'Unable to check or update your permission. Please try again.',
    declined: 'Generation postponed. You can continue without AI.', account: 'Your account changed. Restart this action from the correct account.',
    subject: 'Clients must give permission from their own account. Generation from this coach space is disabled; manual editing remains available.',
  },
  de: {
    title: 'Athena und deine Daten', intro: 'Athena verwendet Claude, den KI-Dienst von Anthropic.',
    data: 'Je nach Funktion übermittelt MoovX relevante Profildaten (Vorname, Alter, Körpermasse, Ziele), Trainings und Check-ins, Ernährungsvorlieben und Einschränkungen, Nachrichten sowie Fotos, die du analysieren lassen möchtest, an Anthropic. Dazu können Gesundheitsdaten gehören.',
    purpose: 'Damit werden Programme und Rezepte erstellt, Fragen beantwortet, Fotos analysiert und Auswertungen vorbereitet – auch aktivierte automatische Auswertungen.',
    choice: 'Manuelle Funktionen kannst du ohne Zustimmung nutzen. Unter Konto → Einstellungen kannst du die Zustimmung widerrufen und künftige Übermittlungen sperren. Bereits gesendete Anfragen lassen sich nicht zurückrufen.',
    accept: 'Zustimmen und fortfahren', later: 'Später', privacy: 'MoovX-Datenschutz', provider: 'Anthropic-Datenschutz',
    settings: 'Künstliche Intelligenz · Anthropic', active: 'Datenübermittlung für Athena erlaubt', inactive: 'Datenübermittlung nicht erlaubt', loading: 'Wird geprüft…',
    revoke: 'Zustimmung widerrufen', enable: 'Prüfen und erlauben', error: 'Die Zustimmung konnte nicht geprüft oder geändert werden. Bitte erneut versuchen.',
    declined: 'Generierung verschoben. Du kannst ohne KI fortfahren.', account: 'Das Konto wurde gewechselt. Starte diese Aktion im richtigen Konto neu.',
    subject: 'Kunden müssen in ihrem eigenen Konto zustimmen. Die Generierung im Coach-Bereich ist deaktiviert; manuelle Bearbeitung bleibt möglich.',
  },
} as const
export type AiConsentLocale = keyof typeof aiConsentCopy
export function aiLocale(): AiConsentLocale {
  if (typeof document === 'undefined') return 'fr'
  const locale = document.documentElement.lang.split('-')[0]
  return locale === 'en' || locale === 'de' ? locale : 'fr'
}
