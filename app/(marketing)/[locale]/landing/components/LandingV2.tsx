import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, BrainCircuit, Check, ChevronRight, ShieldCheck, Sparkles } from 'lucide-react'
import type { LandingV2Copy, LandingV2Locale } from '../landing-v2-copy'
import { LANDING_V2_COPY } from '../landing-v2-copy'
import LandingMotion from './LandingMotion'
import LandingProductDemo from './LandingProductDemo'
import styles from '../LandingV2.module.css'

const APP_URL = 'https://app.moovx.ch'

export default function LandingV2({ locale, trialDays, nativeSource = false, invitationNext = false }: { locale: LandingV2Locale; trialDays: number; nativeSource?: boolean; invitationNext?: boolean }) {
  const copy = LANDING_V2_COPY[locale]
  const registrationQuery = new URLSearchParams()
  if (nativeSource) registrationQuery.set('source', 'ios')
  if (invitationNext) registrationQuery.set('next', '/join')
  const registerURL = `${APP_URL}/register-client${registrationQuery.size ? `?${registrationQuery}` : ''}`

  return <div className={styles.page}>
    <LandingMotion />
    <Header locale={locale} copy={copy} registerURL={registerURL} />

    <main>
      <section className={styles.hero}>
        <Image className={styles.heroImage} src="/images/hero/hero-default.webp" alt="" fill priority sizes="100vw" />
        <div className={styles.heroShade} />
        <div className={styles.ambientGrid} aria-hidden="true" />
        <div className={styles.heroInner}>
          <div className={styles.heroCopy} data-landing-reveal>
            <p className={styles.eyebrow}>{copy.hero.eyebrow}</p>
            <h1>{copy.hero.titleA}<br /><em>{copy.hero.titleB}</em></h1>
            <p className={styles.heroBody}>{copy.hero.body}</p>
            <div className={styles.heroActions}>
              <a className={styles.primaryButton} href={registerURL}>{copy.hero.primary}<ArrowRight size={17} aria-hidden="true" /></a>
              <a className={styles.secondaryButton} href="#product">{copy.hero.secondary}</a>
            </div>
            <small>{copy.hero.note.replace('14', String(trialDays))}</small>
          </div>
          <figure className={styles.heroPhone} data-landing-reveal><Image src="/images/landing/app-current/home.v2.webp" width={393} height={852} alt={copy.screens.items[0].alt} priority sizes="300px" /><figcaption>{copy.preview.label}</figcaption></figure>
        </div>
        <div className={styles.proofRail}>
          {copy.proof.map((item, index) => <span key={item}><i>{String(index + 1).padStart(2, '0')}</i>{item}</span>)}
        </div>
      </section>

      <section className={styles.systemSection} id="product">
        <SectionHeading eyebrow={copy.system.eyebrow} title={copy.system.title} body={copy.system.body} />
        <div data-landing-reveal><LandingProductDemo copy={copy} /></div>
      </section>

      <AppScreens copy={copy} />
      <section className={styles.installSection} id="install" aria-labelledby="install-title">
        <h2 id="install-title">{copy.install.title}</h2>
        <p>{copy.install.body}</p>
        <div className={styles.installGrid}>
          <article><h3>iPhone · Safari</h3><ol>{copy.install.ios.map(step => <li key={step}>{step}</li>)}</ol></article>
          <article><h3>Android · Chrome</h3><ol>{copy.install.android.map(step => <li key={step}>{step}</li>)}</ol></article>
        </div>
        <p>{copy.install.note}</p>
        <a className={styles.primaryButton} href={APP_URL}>{copy.install.cta}<ArrowRight size={17} aria-hidden="true" /></a>
      </section>

      <section className={styles.methodSection} id="method">
        <div className={styles.methodIntro} data-landing-reveal>
          <p className={styles.eyebrow}>{copy.method.eyebrow}</p>
          <h2>{copy.method.title}</h2>
          <p>{copy.method.body}</p>
        </div>
        <div className={styles.methodSteps}>
          {copy.method.steps.map(step => <article key={step.index} data-landing-reveal>
            <span>{step.index}</span><h3>{step.title}</h3><p>{step.body}</p>
          </article>)}
        </div>
      </section>

      <section className={styles.scienceSection}>
        <div className={styles.scienceGlow} aria-hidden="true" />
        <div className={styles.scienceGrid}>
          <div data-landing-reveal>
            <p className={styles.eyebrow}>{copy.science.eyebrow}</p>
            <h2>{copy.science.title}</h2>
            <p className={styles.sectionBody}>{copy.science.body}</p>
            <Link className={styles.textLink} href="/fr/coach-sportif-ia">{copy.science.link} <ArrowRight size={15} aria-hidden="true" /></Link>
          </div>
          <div className={styles.scienceCards}>
            {copy.science.items.map((item, index) => <article key={item.title} data-landing-reveal>
              <span>{index === 0 ? <BrainCircuit /> : index === 1 ? <Sparkles /> : <ShieldCheck />}</span>
              <div><h3>{item.title}</h3><p>{item.body}</p></div>
            </article>)}
          </div>
        </div>
      </section>

      <section className={styles.progressSection}>
        <SectionHeading eyebrow={copy.progress.eyebrow} title={copy.progress.title} body={copy.progress.body} />
        <div className={styles.progressGrid}>
          {copy.progress.metrics.map((metric, index) => <article key={metric.value} data-landing-reveal>
            <div className={styles.metricVisual}>
              <span>{metric.value}</span>
              <svg viewBox="0 0 180 64" aria-hidden="true"><path d={index % 2 ? 'M2 54 C30 48 40 28 66 34 S104 50 126 22 S156 22 178 6' : 'M2 52 C28 56 38 42 60 44 S92 22 112 30 S148 18 178 8'} /></svg>
            </div>
            <h3>{metric.label}</h3><p>{metric.detail}</p>
          </article>)}
        </div>
      </section>

      <section className={styles.pricingSection} id="pricing">
        <div className={styles.pricingIntro} data-landing-reveal>
          <p className={styles.eyebrow}>{copy.pricing.eyebrow}</p><h2>{copy.pricing.title}</h2><p>{copy.pricing.body}</p>
        </div>
        <div className={styles.priceCard} data-landing-reveal>
          <div className={styles.priceTop}><span>{copy.pricing.product}</span></div>
          <div className={styles.priceOptions}>
            <div className={styles.priceOption}><span className={styles.priceCurrency}>CHF</span><strong>{copy.pricing.monthly}</strong><span className={styles.pricePeriod}>{copy.pricing.monthlyPeriod}</span></div>
            <div className={`${styles.priceOption} ${styles.priceAnnual}`}><span className={styles.priceCurrency}>CHF</span><strong>{copy.pricing.yearly}</strong><span className={styles.pricePeriod}>{copy.pricing.yearlyPeriod}</span><small>{copy.pricing.yearlySavings}</small></div>
          </div>
          <ul>{copy.pricing.included.map(item => <li key={item}><Check size={15} aria-hidden="true" />{item}</li>)}</ul>
          <a className={styles.primaryButton} href={registerURL}>{copy.pricing.cta}<ArrowRight size={17} aria-hidden="true" /></a>
          <small>{copy.pricing.note.replace('14', String(trialDays))}</small>
          <a className={styles.coachLink} href={`${APP_URL}/onboarding-coach`}>{copy.pricing.coach}<ChevronRight size={15} aria-hidden="true" /></a>
        </div>
      </section>

      <section className={styles.faqSection}>
        <h2 data-landing-reveal>{copy.faq.title}</h2>
        <div>{copy.faq.items.map((item, index) => <details key={item.question} open={index === 0} data-landing-reveal><summary>{item.question}<span>+</span></summary><p>{item.answer}</p></details>)}</div>
      </section>

      <section className={styles.finalSection}>
        <div data-landing-reveal><p className={styles.eyebrow}>{copy.final.eyebrow}</p><h2>{copy.final.title}</h2><p>{copy.final.body}</p><a className={styles.primaryButton} href={registerURL}>{copy.final.cta}<ArrowRight size={17} aria-hidden="true" /></a></div>
      </section>
      {locale === 'fr' && <section className={styles.resourcesSection} aria-labelledby="landing-resources-title">
        <h2 id="landing-resources-title">Ressources gratuites pour ton entraînement et ta nutrition</h2>
        <p>Prépare tes séances et trouve des repères pour ton alimentation avec nos guides et outils.</p>
        <nav aria-label="Guides et outils MoovX" className={styles.resourceLinks}>
          <Link href="/fr/programmes/musculation/3-jours">Programme de musculation sur 3 jours</Link>
          <Link href="/fr/programmes/musculation/debutant">Programme de musculation pour débutant</Link>
          <Link href="/fr/outils/calculateur-calories-macros">Calculateur de calories et macros</Link>
          <Link href="/fr/guides/nutrition">Guide de la nutrition sportive</Link>
          <Link href="/fr/guides/musculation">Guide de la musculation</Link>
        </nav>
      </section>}
    </main>

    <Footer locale={locale} copy={copy} />
  </div>
}

const APP_SCREENS = ['home', 'training', 'nutrition', 'recovery'] as const

function AppScreens({ copy }: { copy: LandingV2Copy }) {
  return <section className={styles.appScreensSection} aria-labelledby="app-screens-title">
    <div className={styles.appScreensIntro} data-landing-reveal>
      <p className={styles.eyebrow}>{copy.screens.eyebrow}</p>
      <h2 id="app-screens-title">{copy.screens.title}</h2>
      <p>{copy.screens.body}</p>
    </div>
    <div className={styles.appScreensGrid}>
      {APP_SCREENS.map((screen, index) => {
        const item = copy.screens.items[index]
        return <figure className={styles.appScreen} key={screen} data-landing-reveal>
          <div className={styles.appScreenFrame}>
            <Image
              src={`/images/landing/app-current/${screen}.v2.webp`}
              width={393}
              height={852}
              alt={item.alt}
              sizes="(max-width: 640px) 72vw, (max-width: 980px) 42vw, 260px"
            />
          </div>
          <figcaption><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{item.title}</strong><small>{item.detail}</small></div></figcaption>
        </figure>
      })}
    </div>
  </section>
}

function Header({ locale, copy, registerURL }: { locale: LandingV2Locale; copy: LandingV2Copy; registerURL: string }) {
  return <header className={styles.header}>
    <Link className={styles.brand} href={`/${locale}/landing`} aria-label={copy.a11y.home}><Image src="/logo-moovx-48.png" width={32} height={32} alt="" /><strong>MOOVX</strong><span>GENEVA · CH</span></Link>
    <nav aria-label={copy.a11y.navigation}><a href="#product">{copy.nav.product}</a><a href="#method">{copy.nav.method}</a><a href="#pricing">{copy.nav.pricing}</a></nav>
    <div className={styles.headerActions}><a href={`${APP_URL}/login`}>{copy.nav.login}</a><a href={registerURL}>{copy.nav.start}</a></div>
  </header>
}

function SectionHeading({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return <div className={styles.sectionHeading} data-landing-reveal><p className={styles.eyebrow}>{eyebrow}</p><h2>{title}</h2><p>{body}</p></div>
}

function Footer({ locale, copy }: { locale: LandingV2Locale; copy: LandingV2Copy }) {
  return <footer className={styles.footer}>
    <div className={styles.footerBrand}><Image src="/logo-moovx-48.png" width={32} height={32} alt="" /><strong>MOOVX</strong><p>{copy.footer.note}</p></div>
    <div><strong>{copy.footer.product}</strong><a href="#product">{copy.nav.product}</a><a href="#pricing">{copy.nav.pricing}</a><a href="#install">{copy.install.link}</a><a href={`${APP_URL}/login`}>{copy.footer.login}</a></div>
    <div><strong>{copy.footer.resources}</strong><Link href={`/${locale}/blog`}>Blog</Link><Link href={`/${locale}/coach-sportif-ia`}>Athena</Link><a href={`${APP_URL}/onboarding-coach`}>{copy.footer.coach}</a></div>
    <div><strong>{copy.footer.legal}</strong><Link href={`/${locale}/privacy`}>{copy.footer.privacy}</Link><Link href={`/${locale}/cgu`}>{copy.footer.terms}</Link></div>
    <small>© 2026 MoovX</small>
  </footer>
}
