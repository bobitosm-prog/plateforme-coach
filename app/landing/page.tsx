'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

// ─── Intersection Observer Hook ───
function useInView(threshold = 0.15): [React.RefObject<HTMLDivElement | null>, boolean] {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } }, { threshold })
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return [ref, visible]
}

// ─── Animated Counter ───
function Counter({ target, suffix = '', duration = 1800 }: { target: number; suffix?: string; duration?: number }) {
  const [val, setVal] = useState(0)
  const [ref, visible] = useInView(0.3)
  useEffect(() => {
    if (!visible) return
    let start = 0
    const step = target / (duration / 16)
    const id = setInterval(() => { start += step; if (start >= target) { setVal(target); clearInterval(id) } else setVal(Math.floor(start)) }, 16)
    return () => clearInterval(id)
  }, [visible, target, duration])
  return <span ref={ref}>{val}{suffix}</span>
}

// ─── FAQ Item ───
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <button onClick={() => setOpen(!open)} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', color: open ? '#C9A84C' : '#bbb', padding: '22px 0', fontSize: 15, fontWeight: 400, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: "'DM Sans', sans-serif", transition: 'color 0.3s', lineHeight: 1.5 }}>
        {q}
        <span style={{ color: '#C9A84C', fontSize: 22, transition: 'transform 0.4s cubic-bezier(0.16,1,0.3,1)', transform: open ? 'rotate(45deg)' : 'rotate(0)', flexShrink: 0, marginLeft: 16 }}>+</span>
      </button>
      <div style={{ maxHeight: open ? 200 : 0, overflow: 'hidden', transition: 'max-height 0.5s cubic-bezier(0.16,1,0.3,1), opacity 0.4s', opacity: open ? 1 : 0 }}>
        <p style={{ color: '#666', fontSize: 13.5, lineHeight: 1.85, paddingBottom: 20, fontWeight: 300, margin: 0 }}>{a}</p>
      </div>
    </div>
  )
}

// ─── Section Reveal ───
function Reveal({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const [ref, visible] = useInView(0.1)
  return <div ref={ref} className={className} style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(40px)', transition: `opacity 0.8s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 0.8s cubic-bezier(0.16,1,0.3,1) ${delay}s` }}>{children}</div>
}

export default function LandingPage() {
  const router = useRouter()
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => { const fn = () => setScrolled(window.scrollY > 50); window.addEventListener('scroll', fn); return () => window.removeEventListener('scroll', fn) }, [])

  const gold = '#C9A84C'
  const goldLight = '#F0D060'
  const go = (path: string) => () => router.push(path)

  return (
    <div style={{ background: '#050505', color: '#fff', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        *{margin:0;padding:0;box-sizing:border-box}html{scroll-behavior:smooth}::selection{background:rgba(201,168,76,0.3);color:#fff}
        @keyframes heroFloat{0%,100%{transform:translateY(0) rotate(0deg)}50%{transform:translateY(-16px) rotate(1deg)}}
        @keyframes orbPulse{0%,100%{opacity:0.6;transform:translate(-50%,-50%) scale(1)}50%{opacity:1;transform:translate(-50%,-50%) scale(1.08)}}
        @keyframes slideIn{from{opacity:0;transform:translateY(50px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
        @keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        @keyframes phonePulse{0%,100%{box-shadow:0 0 60px rgba(201,168,76,0.08)}50%{box-shadow:0 0 100px rgba(201,168,76,0.15)}}
        @keyframes badgeBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        @keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
        .grain-overlay{position:fixed;inset:0;pointer-events:none;z-index:9999;opacity:0.025;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}
        .hero-title-line{animation:slideIn 1s cubic-bezier(0.16,1,0.3,1) forwards;opacity:0}
        .hero-title-line:nth-child(1){animation-delay:0.1s}.hero-title-line:nth-child(2){animation-delay:0.2s}.hero-title-line:nth-child(3){animation-delay:0.3s}
        .hero-sub-anim{animation:fadeUp 0.8s 0.5s cubic-bezier(0.16,1,0.3,1) forwards;opacity:0}
        .hero-ctas-anim{animation:fadeUp 0.8s 0.65s cubic-bezier(0.16,1,0.3,1) forwards;opacity:0}
        .hero-stats-anim{animation:fadeUp 0.8s 0.8s cubic-bezier(0.16,1,0.3,1) forwards;opacity:0}
        .hero-phone-anim{animation:fadeUp 1s 0.4s cubic-bezier(0.16,1,0.3,1) forwards;opacity:0}
        .btn-gold{background:linear-gradient(135deg,#C9A84C,#F0D060);border:none;color:#000;padding:16px 36px;border-radius:60px;font-size:15px;font-weight:600;cursor:pointer;font-family:'DM Sans';box-shadow:0 8px 32px rgba(201,168,76,0.25);transition:all 0.35s cubic-bezier(0.16,1,0.3,1);position:relative;overflow:hidden}
        .btn-gold:hover{transform:translateY(-3px) scale(1.02);box-shadow:0 16px 48px rgba(201,168,76,0.35)}
        .btn-gold::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.25),transparent);background-size:200% 100%;animation:shimmer 3s ease-in-out infinite}
        .btn-ghost{background:transparent;border:1px solid rgba(255,255,255,0.1);color:#999;padding:16px 32px;border-radius:60px;font-size:14.5px;cursor:pointer;font-family:'DM Sans';font-weight:300;transition:all 0.3s;display:flex;align-items:center;gap:10px}
        .btn-ghost:hover{border-color:rgba(201,168,76,0.4);color:#C9A84C;background:rgba(201,168,76,0.04)}
        .bento-card{background:rgba(255,255,255,0.015);border:1px solid rgba(255,255,255,0.05);border-radius:24px;padding:32px;position:relative;overflow:hidden;transition:all 0.5s cubic-bezier(0.16,1,0.3,1)}
        .bento-card:hover{border-color:rgba(201,168,76,0.3);transform:translateY(-6px)}
        .phone-mock{width:280px;background:linear-gradient(160deg,#1c1c1e,#0c0c0c);border-radius:48px;border:1.5px solid rgba(255,255,255,0.08);padding:14px 10px;position:relative;z-index:1;box-shadow:0 60px 120px rgba(0,0,0,0.9),0 0 0 1px rgba(255,255,255,0.04) inset;animation:phonePulse 4s ease-in-out infinite}
        .floating-tag{position:absolute;background:rgba(10,10,10,0.95);backdrop-filter:blur(20px);border:1px solid rgba(201,168,76,0.2);border-radius:24px;padding:8px 16px;font-size:12px;font-weight:500;white-space:nowrap;z-index:2}
        @media(max-width:900px){.hide-mobile{display:none!important}.hero-grid{grid-template-columns:1fr!important}.bento-grid{grid-template-columns:1fr!important}.bento-big{grid-column:span 1!important;grid-row:span 1!important}.price-grid{grid-template-columns:1fr!important}.testi-grid-l{grid-template-columns:1fr!important}.how-grid-l{grid-template-columns:1fr!important;gap:40px!important}.how-line-l{display:none!important}.pwa-grid{grid-template-columns:1fr!important}.footer-grid{grid-template-columns:1fr 1fr!important}.section-pad{padding:64px 20px!important}.hero-pad{padding:80px 20px 50px!important}}
        @media(max-width:480px){.section-pad{padding:40px 16px!important}.hero-pad{padding:60px 16px 40px!important}.phone-mock{width:220px!important;border-radius:36px!important}.btn-gold,.btn-ghost{width:100%;text-align:center;justify-content:center}.bento-card{padding:20px!important}.footer-grid{grid-template-columns:1fr!important}}
      `}</style>

      <div className="grain-overlay" />

      {/* NAV */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 200, padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: scrolled ? 'rgba(5,5,5,0.97)' : 'rgba(5,5,5,0.6)', backdropFilter: 'blur(24px)', borderBottom: scrolled ? '1px solid rgba(201,168,76,0.08)' : '1px solid transparent', transition: 'all 0.4s' }}>
        {/* Spacer for centering */}
        <div style={{ width: 170 }} className="hide-mobile" />
        {/* Centered logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', position: 'absolute', left: '50%', transform: 'translateX(-50%)' }} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div style={{ width: 36, height: 36, background: `linear-gradient(135deg,${gold},${goldLight})`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, boxShadow: '0 4px 24px rgba(201,168,76,0.3)' }}>⚡</div>
          <div><div style={{ fontFamily: "'Bebas Neue'", fontSize: 21, letterSpacing: 3, lineHeight: 1 }}>MOOVX</div><div style={{ fontSize: 7, letterSpacing: 4, color: gold, textTransform: 'uppercase', opacity: 0.7 }}>Swiss Made · Swiss Quality</div></div>
        </div>
        {/* Right buttons */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={go('/login')} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', color: '#999', padding: '8px 20px', borderRadius: 40, fontSize: 12.5, cursor: 'pointer', fontFamily: "'DM Sans'", letterSpacing: 0.3 }}>Connexion</button>
          <button onClick={go('/register-client')} className="hide-mobile" style={{ background: gold, border: 'none', color: '#000', padding: '9px 22px', borderRadius: 40, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans'" }}>Commencer</button>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero-pad" style={{ minHeight: '94vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 40px 60px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', width: 500, height: 500, background: 'radial-gradient(circle,rgba(201,168,76,0.08),transparent 60%)', animation: 'orbPulse 6s ease-in-out infinite', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(201,168,76,0.015) 1px,transparent 1px),linear-gradient(90deg,rgba(201,168,76,0.015) 1px,transparent 1px)', backgroundSize: '80px 80px' }} />
        <div style={{ maxWidth: 800, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid rgba(201,168,76,0.25)', background: 'rgba(201,168,76,0.04)', borderRadius: 40, padding: '6px 16px 6px 8px', marginBottom: 32, animation: 'fadeUp 0.6s 0s cubic-bezier(0.16,1,0.3,1) forwards', opacity: 0 }}>
            <span style={{ width: 22, height: 22, background: 'rgba(201,168,76,0.12)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: gold }}>✦</span>
            <span style={{ fontSize: 11.5, color: gold, letterSpacing: 0.5 }}>Propulsé par l&apos;IA Claude d&apos;Anthropic</span>
          </div>
          <h1 style={{ fontFamily: "'Bebas Neue'", fontSize: 'clamp(56px,7vw,96px)', lineHeight: 0.92, letterSpacing: 1, marginBottom: 28 }}>
            <div className="hero-title-line">TRANSFORME</div>
            <div className="hero-title-line">TON CORPS.</div>
            <div className="hero-title-line" style={{ color: gold }}>DÉPASSE TES LIMITES.</div>
          </h1>
          <p className="hero-sub-anim" style={{ color: '#777', fontSize: 16.5, fontWeight: 300, lineHeight: 1.85, marginBottom: 40, maxWidth: 520 }}>MoovX connecte athlètes et coaches d&apos;élite avec des plans alimentaires et sportifs générés par IA. Basé sur <span style={{ color: '#aaa' }}>170+ aliments fitness + 3 484 ANSES</span>.</p>
          <div className="hero-ctas-anim" style={{ display: 'flex', gap: 14, marginBottom: 56, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button className="btn-gold" onClick={go('/register-client')}>Commencer — Dès CHF 10/mois</button>
            <button className="btn-ghost" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}><span style={{ fontSize: 10, opacity: 0.6 }}>▶</span> Voir la démo</button>
          </div>
          <div className="hero-stats-anim" style={{ display: 'flex', justifyContent: 'center' }}>
            {[[4.9,'★','Note moyenne'],[500,'+','Athlètes actifs'],[50,'+','Coachs certifiés']].map(([num,suf,label],i) => (
              <div key={i} style={{ padding: '0 32px', borderRight: i < 2 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <div style={{ fontFamily: "'Bebas Neue'", fontSize: 38, color: gold, lineHeight: 1, letterSpacing: 1 }}><Counter target={num as number} suffix={suf as string} /></div>
                <div style={{ fontSize: 10, color: '#3a3a3a', textTransform: 'uppercase', letterSpacing: 2.5, marginTop: 4 }}>{label as string}</div>
              </div>
            ))}
          </div>

          {/* Phone mockup — centered below */}
          <div className="hero-phone-anim" style={{ display: 'flex', justifyContent: 'center', position: 'relative', marginTop: 64 }}>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 350, height: 350, background: 'radial-gradient(circle,rgba(201,168,76,0.1),transparent 65%)', pointerEvents: 'none' }} />
            <div className="floating-tag" style={{ top: '8%', right: '-8%', animation: 'badgeBob 3s ease-in-out infinite' }}>🔥 -3 kg ce mois</div>
            <div className="floating-tag hide-mobile" style={{ top: '42%', left: '-20%', animation: 'badgeBob 3s ease-in-out 0.7s infinite' }}>✓ Plan validé par IA</div>
            <div className="floating-tag" style={{ bottom: '12%', right: '-6%', animation: 'badgeBob 3s ease-in-out 1.4s infinite' }}>💪 Séance aujourd&apos;hui</div>
            <div className="phone-mock">
              <div style={{ width: 90, height: 24, background: '#000', borderRadius: 16, margin: '0 auto 10px', position: 'relative' }}><div style={{ position: 'absolute', width: 10, height: 10, background: '#1a1a1a', borderRadius: '50%', top: '50%', right: 12, transform: 'translateY(-50%)' }} /></div>
              <div style={{ background: '#0a0a0a', borderRadius: 38, overflow: 'hidden' }}>
                <div style={{ padding: '16px 16px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ textAlign: 'left' }}><div style={{ fontSize: 9.5, color: '#444', fontWeight: 300 }}>Mercredi 25 Mars</div><div style={{ fontSize: 17, fontWeight: 500, marginTop: 2 }}>Bonjour, Sarah 👋</div></div>
                  <div style={{ width: 34, height: 34, background: `linear-gradient(135deg,${gold},${goldLight})`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#000' }}>S</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, padding: '0 12px 8px' }}>
                  {[['⚖️','62 kg','Poids actuel',true],['🎯','55 kg','Objectif',false]].map(([icon,val,label,isGold],i) => (<div key={i} style={{ background: '#121212', borderRadius: 14, padding: '12px 13px', border: '1px solid rgba(255,255,255,0.04)', textAlign: 'left' }}><div style={{ fontSize: 14, marginBottom: 4 }}>{icon as string}</div><div style={{ fontSize: 20, fontWeight: 500, color: isGold ? gold : '#fff' }}>{val as string}</div><div style={{ fontSize: 8, color: '#3a3a3a', textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 2 }}>{label as string}</div></div>))}
                </div>
                <div style={{ margin: '0 12px 8px', background: '#121212', borderRadius: 14, padding: '12px 13px', border: '1px solid rgba(255,255,255,0.04)', textAlign: 'left' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span style={{ fontSize: 8.5, color: gold, letterSpacing: 2, textTransform: 'uppercase' }}>Nutrition du jour</span><span style={{ fontSize: 8.5, color: '#3a3a3a' }}>1 420 / 1 800 kcal</span></div>
                  <div style={{ height: 4, background: '#1a1a1a', borderRadius: 2, overflow: 'hidden', marginBottom: 10 }}><div style={{ height: '100%', width: '79%', background: `linear-gradient(90deg,${gold},${goldLight})`, borderRadius: 2 }} /></div>
                  <div style={{ display: 'flex', justifyContent: 'space-around' }}>{[['120g','Prot','#60a5fa'],['180g','Gluc','#4ade80'],['48g','Lip',gold]].map(([v,l,c],i) => (<div key={i} style={{ textAlign: 'center' }}><div style={{ fontSize: 13, fontWeight: 500, color: c as string }}>{v}</div><div style={{ fontSize: 7.5, color: '#3a3a3a', textTransform: 'uppercase', letterSpacing: 1 }}>{l}</div></div>))}</div>
                </div>
                <div style={{ margin: '0 12px 12px', background: '#121212', borderRadius: 14, padding: '12px 13px', border: '1px solid rgba(255,255,255,0.04)', textAlign: 'left' }}>
                  <div style={{ fontSize: 8.5, color: gold, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Programme du jour</div>
                  {[['Squat barre — 4×8','90s'],['Presse — 3×12','60s'],['Fentes haltères — 3×10','60s']].map(([name,rest],i) => (<div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: i < 2 ? '1px solid #181818' : 'none' }}><span style={{ fontSize: 11.5, color: '#aaa' }}>{name}</span><span style={{ fontSize: 9, background: '#1a1a1a', padding: '2px 8px', borderRadius: 6, color: '#555' }}>{rest}</span></div>))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <div style={{ borderTop: '1px solid rgba(201,168,76,0.06)', borderBottom: '1px solid rgba(201,168,76,0.06)', background: 'rgba(201,168,76,0.008)', overflow: 'hidden', padding: '15px 0' }}>
        <div style={{ display: 'flex', gap: 48, animation: 'marquee 22s linear infinite', whiteSpace: 'nowrap' }}>{['FitClub Geneva','Sport Academy Zurich','Elite Performance Basel','ProCoach Lausanne','Swiss Athletics','FitClub Geneva','Sport Academy Zurich','Elite Performance Basel','ProCoach Lausanne','Swiss Athletics'].map((n,i) => (<span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 48 }}><span style={{ fontSize: 10.5, color: '#222', letterSpacing: 4, textTransform: 'uppercase', fontWeight: 500 }}>{n}</span><span style={{ color: 'rgba(201,168,76,0.25)', fontSize: 8 }}>✦</span></span>))}</div>
      </div>

      {/* FEATURES */}
      <section id="features" style={{ background: '#070707' }}><div className="section-pad" style={{ padding: '100px 40px', maxWidth: 1200, margin: '0 auto' }}>
        <Reveal><div style={{ textAlign: 'center', marginBottom: 64 }}><div style={{ fontSize: 10.5, color: gold, letterSpacing: 5, textTransform: 'uppercase', marginBottom: 14, fontWeight: 400 }}>Fonctionnalités</div><div style={{ fontFamily: "'Bebas Neue'", fontSize: 'clamp(40px,4.5vw,62px)', letterSpacing: 2, lineHeight: 0.95, marginBottom: 16 }}>TOUT CE DONT TU AS BESOIN</div><div style={{ color: '#4a4a4a', fontSize: 15, fontWeight: 300 }}>Une seule plateforme. Des résultats mesurables.</div></div></Reveal>
        <div className="bento-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
          <Reveal delay={0.1} className="bento-big"><div className="bento-card" style={{ height: '100%', gridColumn: 'span 2', gridRow: 'span 2' }}><div style={{ fontSize: 36, marginBottom: 18 }}>🥗</div><span style={{ display: 'inline-block', background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.18)', borderRadius: 20, padding: '4px 12px', fontSize: 9.5, color: gold, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 18 }}>Fitness + ANSES</span><div style={{ fontSize: 28, fontWeight: 500, marginBottom: 12, lineHeight: 1.25 }}>Nutrition IA<br />ultra-personnalisée</div><div style={{ color: '#555', fontSize: 14, lineHeight: 1.8, fontWeight: 300 }}>Plans de 7 jours générés en 30 secondes basés sur tes macros et <span style={{ color: '#999' }}>170+ aliments fitness sélectionnés</span>.</div><div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 9 }}>{[["Petit-déjeuner","Flocons d'avoine · Banane · Yaourt grec","487 kcal"],["Déjeuner","Blanc de poulet cuit · Riz basmati · Brocoli","612 kcal"],["Dîner","Pavé de saumon · Patate douce · Épinards","520 kcal"]].map(([t,items,kcal],i) => (<div key={i} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 12, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(255,255,255,0.03)' }}><div><div style={{ fontSize: 9, color: gold, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 2 }}>{t}</div><div style={{ fontSize: 12, color: '#555', fontWeight: 300 }}>{items}</div></div><div style={{ fontSize: 10.5, background: 'rgba(255,255,255,0.03)', padding: '3px 10px', borderRadius: 8, color: '#444', whiteSpace: 'nowrap' }}>{kcal}</div></div>))}</div></div></Reveal>
          {[['💪','Training sur mesure',"Programmes adaptés à ton niveau, objectif et équipement."],['📊','Suivi & Progression',"Graphiques, photos avant/après, mensurations et streak."],['💬','Coach connecté','Messagerie temps réel. Retours instantanés.'],['🛒','Liste de courses auto','Générée depuis ton plan semaine, par rayon.']].map(([icon,title,desc],i) => (<Reveal key={i} delay={0.15+i*0.08}><div className="bento-card"><div style={{ fontSize: 32, marginBottom: 16 }}>{icon}</div><div style={{ fontSize: 20, fontWeight: 500, marginBottom: 10, lineHeight: 1.25 }}>{title}</div><div style={{ color: '#555', fontSize: 13.5, lineHeight: 1.75, fontWeight: 300 }}>{desc}</div></div></Reveal>))}
        </div>
      </div></section>

      {/* HOW */}
      <section id="how" style={{ background: '#070707' }}><div className="section-pad" style={{ padding: '100px 40px', maxWidth: 1200, margin: '0 auto' }}>
        <Reveal><div style={{ textAlign: 'center', marginBottom: 64 }}><div style={{ fontSize: 10.5, color: gold, letterSpacing: 5, textTransform: 'uppercase', marginBottom: 14 }}>Comment ça marche</div><div style={{ fontFamily: "'Bebas Neue'", fontSize: 'clamp(40px,4.5vw,62px)', letterSpacing: 2, lineHeight: 0.95 }}>3 ÉTAPES VERS TES RÉSULTATS</div></div></Reveal>
        <div className="how-grid-l" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 0, position: 'relative' }}>
          <div className="how-line-l" style={{ position: 'absolute', top: 42, left: '16%', right: '16%', height: 1, background: 'linear-gradient(90deg,transparent,rgba(201,168,76,0.15),transparent)' }} />
          {[['🎯','2 minutes','Crée ton profil','Objectifs, mensurations, préférences alimentaires.',false],['⚡','30 secondes','Plan IA instantané','Nutrition 7 jours + programme entraînement.',true],['🏆','Chaque jour','Progresse & Performe','Coche tes repas, échange avec ton coach.',false]].map(([icon,time,title,desc,isGold],i) => (
            <Reveal key={i} delay={0.1+i*0.15}><div style={{ textAlign: 'center', padding: '0 36px' }}><div style={{ width: 84, height: 84, borderRadius: '50%', margin: '0 auto 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, position: 'relative', zIndex: 1, background: isGold ? `linear-gradient(135deg,${gold},${goldLight})` : 'rgba(201,168,76,0.06)', border: isGold ? 'none' : '1px solid rgba(201,168,76,0.15)', boxShadow: isGold ? '0 0 50px rgba(201,168,76,0.25)' : 'none' }}>{icon as string}</div><div style={{ fontSize: 9.5, color: gold, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 10 }}>{time as string}</div><div style={{ fontSize: 19, fontWeight: 500, marginBottom: 10 }}>{title as string}</div><div style={{ color: '#4a4a4a', fontSize: 13.5, lineHeight: 1.75, fontWeight: 300 }}>{desc as string}</div></div></Reveal>
          ))}
        </div>
      </div></section>

      {/* PRICING */}
      <section id="pricing" style={{ background: '#0b0b0b' }}><div className="section-pad" style={{ padding: '100px 40px', maxWidth: 1200, margin: '0 auto' }}>
        <Reveal><div style={{ textAlign: 'center', marginBottom: 64 }}><div style={{ fontSize: 10.5, color: gold, letterSpacing: 5, textTransform: 'uppercase', marginBottom: 14 }}>Tarifs</div><div style={{ fontFamily: "'Bebas Neue'", fontSize: 'clamp(40px,4.5vw,62px)', letterSpacing: 2, lineHeight: 0.95, marginBottom: 16 }}>SIMPLE ET TRANSPARENT</div></div></Reveal>
        <div className="price-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, maxWidth: 1000, margin: '0 auto 40px' }}>
          {/* Monthly */}
          <Reveal delay={0.1}><div style={{ borderRadius: 28, padding: 36, background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: 10, letterSpacing: 4, textTransform: 'uppercase', color: '#555', marginBottom: 20 }}>Mensuel</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 8 }}><span style={{ fontSize: 12, color: '#666', alignSelf: 'flex-start', marginTop: 16 }}>CHF</span><span style={{ fontFamily: "'Bebas Neue'", fontSize: 72, lineHeight: 1, color: '#F8FAFC' }}>10</span><span style={{ color: '#555', fontSize: 13 }}>/mois</span></div>
            <div style={{ color: '#444', fontSize: 12.5, marginBottom: 28, fontWeight: 300 }}>Coach IA inclus</div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>{['Nutrition IA personnalisée','Programme training IA','Suivi progression','Calculateur BMR/TDEE'].map(f => (<li key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#888', fontWeight: 300 }}><span style={{ color: '#444', fontSize: 10 }}>✦</span> {f}</li>))}</ul>
            <button className="btn-gold" onClick={go('/register-client')} style={{ width: '100%', padding: 14, fontSize: 13.5 }}>Commencer →</button>
          </div></Reveal>
          {/* Yearly */}
          <Reveal delay={0.15}><div style={{ borderRadius: 28, padding: 36, position: 'relative', background: 'rgba(201,168,76,0.03)', border: '1.5px solid rgba(201,168,76,0.35)' }}>
            <span style={{ position: 'absolute', top: 20, right: 20, background: gold, color: '#000', fontSize: 9, fontWeight: 700, padding: '4px 12px', borderRadius: 20, letterSpacing: 1, textTransform: 'uppercase' }}>Populaire</span>
            <div style={{ fontSize: 10, letterSpacing: 4, textTransform: 'uppercase', color: gold, marginBottom: 20 }}>Annuel</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 8 }}><span style={{ fontSize: 12, color: '#666', alignSelf: 'flex-start', marginTop: 16 }}>CHF</span><span style={{ fontFamily: "'Bebas Neue'", fontSize: 72, lineHeight: 1, color: gold }}>80</span><span style={{ color: '#555', fontSize: 13 }}>/an</span></div>
            <div style={{ color: '#22C55E', fontSize: 12.5, marginBottom: 28, fontWeight: 600 }}>Économise 33% — 6.67 CHF/mois</div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>{['Tout le plan mensuel','Économie de 40 CHF/an','Accès prioritaire nouveautés','Support prioritaire'].map(f => (<li key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#bbb', fontWeight: 300 }}><span style={{ color: gold, fontSize: 10 }}>✦</span> {f}</li>))}</ul>
            <button className="btn-gold" onClick={go('/register-client')} style={{ width: '100%', padding: 14, fontSize: 13.5 }}>Commencer →</button>
            <div style={{ textAlign: 'center', color: '#333', fontSize: 11, marginTop: 12, fontWeight: 300 }}>Résiliable à tout moment</div>
          </div></Reveal>
          {/* Lifetime */}
          <Reveal delay={0.2}><div style={{ borderRadius: 28, padding: 36, position: 'relative', background: 'rgba(34,197,94,0.02)', border: '1px solid rgba(34,197,94,0.15)' }}>
            <span style={{ position: 'absolute', top: 20, right: 20, background: '#22C55E', color: '#000', fontSize: 9, fontWeight: 700, padding: '4px 12px', borderRadius: 20, letterSpacing: 1, textTransform: 'uppercase' }}>Meilleure offre</span>
            <div style={{ fontSize: 10, letterSpacing: 4, textTransform: 'uppercase', color: '#22C55E', marginBottom: 20 }}>À vie</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 8 }}><span style={{ fontSize: 12, color: '#666', alignSelf: 'flex-start', marginTop: 16 }}>CHF</span><span style={{ fontFamily: "'Bebas Neue'", fontSize: 72, lineHeight: 1, color: '#22C55E' }}>150</span></div>
            <div style={{ color: '#444', fontSize: 12.5, marginBottom: 28, fontWeight: 300 }}>Paiement unique · Zéro abo</div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>{['Accès permanent','Toutes les fonctionnalités','Mises à jour à vie','Zéro frais récurrents'].map(f => (<li key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#888', fontWeight: 300 }}><span style={{ color: '#22C55E', fontSize: 10 }}>✦</span> {f}</li>))}</ul>
            <button onClick={go('/register-client')} style={{ width: '100%', background: '#22C55E', border: 'none', color: '#000', padding: 14, borderRadius: 60, fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans'" }}>Accès à vie →</button>
          </div></Reveal>
        </div>
        {/* Coach plan */}
        <Reveal delay={0.25}><div style={{ maxWidth: 480, margin: '0 auto', borderRadius: 28, padding: '36px 42px', background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
          <div style={{ fontSize: 10, letterSpacing: 4, textTransform: 'uppercase', color: '#555', marginBottom: 16 }}>Coach Pro</div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4, marginBottom: 8 }}><span style={{ fontSize: 12, color: '#666' }}>CHF</span><span style={{ fontFamily: "'Bebas Neue'", fontSize: 56, lineHeight: 1, letterSpacing: 1 }}>50</span><span style={{ color: '#555', fontSize: 13 }}>/mois</span></div>
          <div style={{ color: '#444', fontSize: 12.5, marginBottom: 24, fontWeight: 300 }}>Clients illimités · IA incluse · Stripe intégré</div>
          <button onClick={go('/coach-signup')} style={{ background: 'transparent', color: gold, border: '1px solid rgba(201,168,76,0.25)', borderRadius: 14, padding: '14px 40px', fontSize: 13.5, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans'" }}>Devenir coach →</button>
        </div></Reveal>
      </div></section>

      {/* TESTIMONIALS */}
      <section id="temoignages" style={{ background: '#060606' }}><div className="section-pad" style={{ padding: '100px 40px', maxWidth: 1200, margin: '0 auto' }}>
        <Reveal><div style={{ textAlign: 'center', marginBottom: 64 }}><div style={{ fontSize: 10.5, color: gold, letterSpacing: 5, textTransform: 'uppercase', marginBottom: 14 }}>Témoignages</div><div style={{ fontFamily: "'Bebas Neue'", fontSize: 'clamp(40px,4.5vw,62px)', letterSpacing: 2, lineHeight: 0.95 }}>ILS ONT TRANSFORMÉ LEUR VIE</div></div></Reveal>
        <div className="testi-grid-l" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18 }}>
          {[['MT','#1a3a2a','Marc T.','Coach IFBB, Genève','Les plans IA me font gagner 2h par client.','+12 clients'],['SM','#1a2a3a','Sarah M.','Cliente, Lausanne','-8 kg en 3 mois. Précision bluffante.','-8 kg'],['LB','#2a1a3a','Lucas B.','Client, Zurich','Coach humain + IA. Game changer.','+6 kg muscle']].map(([ini,bg,name,role,quote,result],i) => (
            <Reveal key={i} delay={0.1+i*0.1}><div style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 24, padding: 30 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}><div style={{ width: 48, height: 48, borderRadius: '50%', background: bg, border: '1.5px solid rgba(201,168,76,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 15, flexShrink: 0 }}>{ini}</div><div><div style={{ fontSize: 15, fontWeight: 500 }}>{name}</div><div style={{ fontSize: 11.5, color: '#444', fontWeight: 300 }}>{role}</div></div></div>
              <div style={{ color: gold, fontSize: 13, letterSpacing: 2, marginBottom: 14 }}>★★★★★</div>
              <p style={{ color: '#666', fontSize: 13.5, lineHeight: 1.85, fontStyle: 'italic', fontWeight: 300, marginBottom: 20, margin: '0 0 20px' }}>"{quote}"</p>
              <span style={{ display: 'inline-block', background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 20, padding: '5px 14px', fontSize: 11.5, color: gold, fontWeight: 500 }}>{result}</span>
            </div></Reveal>
          ))}
        </div>
      </div></section>

      {/* FAQ */}
      <section style={{ background: '#060606' }}><div className="section-pad" style={{ padding: '100px 40px', maxWidth: 1200, margin: '0 auto' }}>
        <Reveal><div style={{ textAlign: 'center', marginBottom: 64 }}><div style={{ fontSize: 10.5, color: gold, letterSpacing: 5, textTransform: 'uppercase', marginBottom: 14 }}>FAQ</div><div style={{ fontFamily: "'Bebas Neue'", fontSize: 'clamp(40px,4.5vw,62px)', letterSpacing: 2, lineHeight: 0.95 }}>TES QUESTIONS</div></div></Reveal>
        <Reveal delay={0.1}><div style={{ maxWidth: 700, margin: '0 auto' }}>{[['Comment fonctionne le paiement ?','Dès CHF 10/mois via Stripe, résiliable à tout moment. Aucun engagement.'],["Qu'est-ce qu'une PWA ?",'Installe depuis Safari ou Chrome en 2 secondes. Plein écran, notifications push.'],["L'IA remplace-t-elle mon coach ?",'Non, l\'IA assiste ton coach humain.'],['Puis-je changer de coach ?','Oui, à tout moment. Nouveau coach sous 24h.'],['Données sécurisées ?','Données en Suisse via Supabase, AES-256. RGPD total.']].map(([q,a],i) => <FaqItem key={i} q={q} a={a} />)}</div></Reveal>
      </div></section>

      {/* CTA FINAL */}
      <section style={{ padding: '120px 40px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 700, height: 350, background: 'radial-gradient(ellipse,rgba(201,168,76,0.08),transparent 65%)', pointerEvents: 'none' }} />
        <Reveal><div style={{ position: 'relative', zIndex: 1, maxWidth: 720, margin: '0 auto' }}>
          <h2 style={{ fontFamily: "'Bebas Neue'", fontSize: 'clamp(50px,6vw,84px)', lineHeight: 0.92, letterSpacing: 2, marginBottom: 24 }}>PRÊT À DEVENIR<br /><span style={{ color: gold }}>LA MEILLEURE VERSION</span><br />DE TOI-MÊME ?</h2>
          <p style={{ color: '#555', fontSize: 16.5, fontWeight: 300, marginBottom: 48, lineHeight: 1.7 }}>Rejoins 500+ athlètes qui ont transformé leur physique avec MoovX.</p>
          <button className="btn-gold" onClick={go('/register-client')} style={{ padding: '20px 64px', fontSize: 16.5 }}>Commencer maintenant — Dès CHF 10/mois</button>
          <div style={{ color: '#2a2a2a', fontSize: 12.5, marginTop: 20, fontWeight: 300 }}>✓ Sans engagement · ✓ Résiliable · ✓ Support inclus</div>
        </div></Reveal>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.03)', background: '#020202' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '60px 40px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 24 }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, background: `linear-gradient(135deg,${gold},${goldLight})`, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>⚡</div>
            <div><div style={{ fontFamily: "'Bebas Neue'", fontSize: 19, letterSpacing: 2.5 }}>MOOVX</div><div style={{ fontSize: 7.5, letterSpacing: 3, color: gold, opacity: 0.6, textTransform: 'uppercase' }}>Swiss Made · Swiss Quality</div></div>
          </div>
          <p style={{ color: '#333', fontSize: 13, lineHeight: 1.75, fontWeight: 300, maxWidth: 320, margin: 0 }}>La plateforme de coaching fitness propulsée par l&apos;IA.</p>
          {/* Link columns — centered row */}
          <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap', justifyContent: 'center' }}>
            {[{t:'Produit',l:['Fonctionnalités','Tarifs','Coachs']},{t:'Légal',l:['CGU','Confidentialité','RGPD']},{t:'Contact',l:['contact@moovx.ch','Support','Devenir coach']}].map(col => (
              <div key={col.t}>
                <div style={{ fontSize: 11, color: gold, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 14, fontWeight: 400 }}>{col.t}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{col.l.map(l => <a key={l} href="#" style={{ color: '#333', textDecoration: 'none', fontSize: 13, fontWeight: 300 }}>{l}</a>)}</div>
              </div>
            ))}
          </div>
        </div>
        {/* Bottom bar */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.025)', padding: '22px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', gap: 20 }}>{['CGU','Confidentialité','Cookies'].map(l => <a key={l} href="#" style={{ color: '#222', fontSize: 12, textDecoration: 'none', fontWeight: 300 }}>{l}</a>)}</div>
          <div style={{ color: '#222', fontSize: 12, fontWeight: 300 }}>© 2026 MoovX · Swiss Made · Genève, Suisse</div>
        </div>
      </footer>
    </div>
  )
}
