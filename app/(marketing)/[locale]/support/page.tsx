import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { buildAlternates, LOCALES, type Locale } from '@/lib/seo'

const copy = {
  fr: {
    title: 'Assistance MoovX', heading: 'Comment pouvons-nous t’aider ?',
    intro: 'Une question sur ton compte, tes séances ou tes achats ? Écris-nous.',
    contact: 'Contacter l’assistance', back: 'Retour à MoovX', privacy: 'Confidentialité', terms: 'Conditions générales',
    sections: [
      ['Pour nous aider à comprendre', 'Indique la version de MoovX, ton modèle de téléphone, les étapes suivies et le message affiché. Tu peux joindre une capture en masquant les informations personnelles. Ne transmets jamais ton mot de passe, un code de connexion ou tes coordonnées bancaires.'],
      ['Achats Apple', 'Utilise « Restaurer mes achats » dans l’écran des offres Apple de MoovX, avec le compte Apple qui a effectué l’achat et le compte MoovX associé. Pour gérer ou annuler un abonnement, ouvre Réglages sur ton iPhone, puis ton nom et Abonnements. Supprimer l’application ne résilie pas un abonnement.'],
      ['Compte et données', 'La suppression du compte est disponible dans les paramètres de ton compte MoovX. Si tu ne peux plus y accéder, écris à contact@moovx.ch pour demander de l’aide. Nous pourrons te demander de vérifier que le compte t’appartient.'],
      ['Tes 14 jours gratuits', 'L’essai MoovX n’active aucun abonnement automatiquement. Un achat Apple ne démarre que si tu le confirmes.'],
    ],
  },
  en: {
    title: 'MoovX Support', heading: 'How can we help?',
    intro: 'Need help with your account, workouts or purchases? Email us.',
    contact: 'Contact support', back: 'Back to MoovX', privacy: 'Privacy', terms: 'Terms',
    sections: [
      ['Help us understand the issue', 'Include your MoovX version, phone model, steps taken and the message displayed. You can attach a screenshot with personal information hidden. Never send your password, a sign-in code or bank details.'],
      ['Apple purchases', 'Use Restore purchases on the Apple offers screen in MoovX, with the Apple Account that made the purchase and its associated MoovX account. To manage or cancel a subscription, open Settings on your iPhone, then your name and Subscriptions. Deleting the app does not cancel a subscription.'],
      ['Account and data', 'Account deletion is available in your MoovX account settings. If you cannot access your account, email contact@moovx.ch for help. We may ask you to verify account ownership.'],
      ['Your 14 free days', 'The MoovX trial does not automatically activate a subscription. An Apple purchase starts only after you confirm it.'],
    ],
  },
  de: {
    title: 'MoovX Support', heading: 'Wie können wir dir helfen?',
    intro: 'Fragen zu deinem Konto, Training oder deinen Käufen? Schreib uns.',
    contact: 'Support kontaktieren', back: 'Zurück zu MoovX', privacy: 'Datenschutz', terms: 'Nutzungsbedingungen',
    sections: [
      ['So können wir dir helfen', 'Nenne deine MoovX-Version, dein Telefonmodell, die ausgeführten Schritte und die angezeigte Meldung. Du kannst einen Screenshot mit unkenntlich gemachten persönlichen Angaben anhängen. Sende niemals dein Passwort, einen Anmeldecode oder Bankdaten.'],
      ['Apple-Käufe', 'Nutze Käufe wiederherstellen im Bildschirm mit den Apple-Angeboten in MoovX. Verwende den Apple Account, mit dem du gekauft hast, und das zugehörige MoovX-Konto. Abonnements verwaltest oder kündigst du auf dem iPhone unter Einstellungen, deinem Namen und Abonnements. Das Löschen der App kündigt kein Abonnement.'],
      ['Konto und Daten', 'Du kannst dein Konto in den MoovX-Kontoeinstellungen löschen. Wenn du keinen Zugriff mehr hast, schreibe an contact@moovx.ch. Wir können einen Nachweis verlangen, dass dir das Konto gehört.'],
      ['Deine 14 kostenlosen Tage', 'Die MoovX-Testphase aktiviert kein Abonnement automatisch. Ein Apple-Kauf beginnt erst nach deiner Bestätigung.'],
    ],
  },
} as const

type Props = { params: Promise<{ locale: string }> }
function validLocale(locale: string): locale is Locale {
  return LOCALES.includes(locale as Locale)
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  if (!validLocale(locale)) notFound()
  return { title: copy[locale].title, description: copy[locale].intro, alternates: buildAlternates('/support', locale) }
}
export default async function SupportPage({ params }: Props) {
  const { locale } = await params
  if (!validLocale(locale)) notFound()
  const t = copy[locale]
  return <main className="support-page">
    <div className="support-content">
      <Link href={`/${locale}/landing`}>{t.back}</Link>
      <p className="eyebrow">MOOVX · {t.title}</p>
      <h1>{t.heading}</h1><p>{t.intro}</p>
      <a className="contact" href="mailto:contact@moovx.ch">{t.contact}<br /><span>contact@moovx.ch</span></a>
      {t.sections.map(([heading, body]) => <section key={heading}><h2>{heading}</h2><p>{body}</p></section>)}
      <nav aria-label={t.title}><Link href={`/${locale}/privacy`}>{t.privacy}</Link><Link href={`/${locale}/cgu`}>{t.terms}</Link></nav>
    </div>
    <style>{`
      .support-page { min-height:100vh;background:#0D0B08;color:#F0EDE8;padding:48px 20px 100px; }
      .support-content { max-width:720px;margin:auto;font-family:var(--font-body),sans-serif; }
      .support-page h1 { font-size:clamp(30px,6vw,48px);line-height:1.15; }
      .support-page h2 { font-size:22px;margin-top:0; }
      .support-page p { line-height:1.7;color:#c7c3b9; }
      .support-page a { color:#E8C563;overflow-wrap:anywhere; }
      .support-page a:focus-visible { outline:3px solid #E8C563;outline-offset:5px; }
      .support-page .eyebrow { color:#E8C563;margin-top:36px; }
      .support-page .contact { display:inline-block;padding:18px 22px;margin:16px 0 28px;background:#E8C563;color:#17140c;border-radius:16px;text-decoration:none;font-weight:700; }
      .support-page .contact span { font-weight:400; }
      .support-page section { background:#1d1b17;border-radius:20px;padding:24px;margin-bottom:16px; }
      .support-page nav { display:flex;flex-wrap:wrap;gap:24px;margin-top:32px; }
    `}</style>
  </main>
}
