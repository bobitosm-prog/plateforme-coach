'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function LandingPage() {
  const router = useRouter()

  useEffect(() => {
    // Wire up navigation buttons
    const wire = (id: string, path: string) => {
      const el = document.getElementById(id)
      if (el) el.onclick = () => router.push(path)
    }
    wire('btn-login', '/login')
    wire('btn-start', '/register-client')
    wire('btn-hero-start', '/register-client')
    wire('btn-pricing-start', '/register-client')
    wire('btn-cta-final', '/register-client')
    wire('btn-coach-signup', '/coach-signup')

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', (e) => {
        e.preventDefault()
        const id = (a as HTMLAnchorElement).getAttribute('href')?.slice(1)
        document.getElementById(id || '')?.scrollIntoView({ behavior: 'smooth' })
      })
    })
  }, [router])

  const html = `
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--gold:#C9A84C;--gold-light:#E8C96A;--bg:#060606;--bg2:#0e0e0e;--muted:#888}
body{background:var(--bg);color:#fff;font-family:'Inter',sans-serif;overflow-x:hidden;font-size:15px}
nav{position:sticky;top:0;z-index:100;background:transparent;backdrop-filter:blur(20px);border-bottom:1px solid transparent;padding:0 48px;display:flex;align-items:center;justify-content:space-between;height:64px;transition:all 0.3s}
.logo{display:flex;align-items:center;gap:10px;cursor:pointer}
.logo-icon{width:36px;height:36px;background:var(--gold);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px}
.logo-text{font-family:'Bebas Neue';font-size:22px;letter-spacing:2px}
.logo-sub{font-size:8px;letter-spacing:4px;color:var(--gold);opacity:0.7;text-transform:uppercase;line-height:1}
nav ul{list-style:none;display:flex;gap:32px}
nav ul a{color:var(--muted);text-decoration:none;font-size:13px;transition:color 0.2s}
nav ul a:hover{color:var(--gold)}
.nav-btns{display:flex;gap:10px}
.btn-ghost{background:transparent;border:1px solid rgba(255,255,255,0.12);color:#ccc;padding:8px 20px;border-radius:50px;font-size:13px;cursor:pointer;font-family:'Inter';transition:all 0.2s}
.btn-ghost:hover{border-color:var(--gold);color:var(--gold)}
.btn-gold{background:linear-gradient(90deg,var(--gold) 0%,var(--gold-light) 50%,var(--gold) 100%);background-size:200% auto;border:none;color:#000;padding:9px 22px;border-radius:50px;font-size:13px;font-weight:600;cursor:pointer;font-family:'Inter';animation:shimmer 3s linear infinite}
.hero{min-height:92vh;display:flex;align-items:center;padding:80px 48px 60px;position:relative;overflow:hidden}
.hero-glow{position:absolute;top:40%;left:50%;transform:translate(-50%,-50%);width:700px;height:500px;background:radial-gradient(ellipse,rgba(201,168,76,0.07) 0%,transparent 65%);pointer-events:none}
.hero-grid{display:grid;grid-template-columns:1fr 1fr;gap:64px;align-items:center;max-width:1200px;margin:0 auto;width:100%;position:relative;z-index:1}
.badge{display:inline-flex;align-items:center;gap:8px;border:1px solid rgba(201,168,76,0.35);border-radius:50px;padding:6px 16px;font-size:12px;color:var(--gold);margin-bottom:32px;letter-spacing:0.5px}
.badge-dot{width:6px;height:6px;background:var(--gold);border-radius:50%;animation:pulse 2s infinite;flex-shrink:0}
.hero-title{font-family:'Bebas Neue';font-size:clamp(64px,8vw,108px);line-height:0.92;letter-spacing:1px;margin-bottom:28px}
.hero-title .gold{color:var(--gold)}
.hero-desc{color:var(--muted);font-size:16px;line-height:1.75;margin-bottom:40px;font-weight:300;max-width:480px}
.hero-desc strong{color:#ddd;font-weight:500}
.hero-btns{display:flex;gap:14px;margin-bottom:52px;flex-wrap:wrap}
.btn-hero{background:linear-gradient(90deg,var(--gold),var(--gold-light),var(--gold));background-size:200% auto;border:none;color:#000;padding:16px 36px;border-radius:50px;font-size:15px;font-weight:700;cursor:pointer;font-family:'Inter';animation:shimmer 3s linear infinite;box-shadow:0 0 40px rgba(201,168,76,0.25);letter-spacing:0.3px}
.btn-outline{background:transparent;border:1px solid rgba(255,255,255,0.12);color:#ccc;padding:16px 28px;border-radius:50px;font-size:14px;cursor:pointer;font-family:'Inter';display:flex;align-items:center;gap:8px;transition:all 0.2s}
.btn-outline:hover{border-color:var(--gold);color:var(--gold)}
.stats{display:flex}
.stat{flex:1;padding:0 24px}
.stat:not(:first-child){border-left:1px solid rgba(201,168,76,0.18)}
.stat-val{font-family:'Bebas Neue';font-size:34px;color:var(--gold);line-height:1}
.stat-label{font-size:11px;color:#555;text-transform:uppercase;letter-spacing:1.5px;margin-top:4px}
.phone-wrap{position:relative;display:flex;justify-content:center}
.phone-glow{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:380px;height:380px;background:radial-gradient(circle,rgba(201,168,76,0.12) 0%,transparent 65%);pointer-events:none}
.phone{width:290px;background:#111;border-radius:44px;border:2px solid rgba(255,255,255,0.08);padding:14px 10px;box-shadow:0 32px 80px rgba(0,0,0,0.7);position:relative;z-index:1}
.phone-notch{width:100px;height:26px;background:#060606;border-radius:20px;margin:0 auto 10px}
.screen{background:#0a0a0a;border-radius:32px;padding:18px}
.screen-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px}
.screen-date{font-size:10px;color:#555}
.screen-hello{font-size:17px;font-weight:600}
.avatar-sm{width:34px;height:34px;background:var(--gold);border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;color:#000}
.screen-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px}
.screen-card{background:#161616;border-radius:14px;padding:12px}
.screen-card .icon{font-size:14px;margin-bottom:4px}
.screen-card .val{font-size:20px;font-weight:600}
.screen-card .val.gold{color:var(--gold)}
.screen-card .lbl{font-size:9px;color:#444;letter-spacing:1.5px;margin-top:2px;text-transform:uppercase}
.nutri-card{background:#161616;border-radius:14px;padding:12px;margin-bottom:10px}
.nutri-top{display:flex;justify-content:space-between;margin-bottom:8px}
.nutri-label{font-size:9px;color:var(--gold);letter-spacing:2px;text-transform:uppercase}
.nutri-kcal{font-size:9px;color:#555}
.progress-bar{height:5px;background:#222;border-radius:3px;overflow:hidden;margin-bottom:10px}
.progress-fill{height:100%;background:linear-gradient(90deg,var(--gold),var(--gold-light));border-radius:3px;width:79%}
.macros{display:flex;justify-content:space-between}
.macro{text-align:center}
.macro .v{font-size:13px;font-weight:600}
.macro .l{font-size:8px;color:#444;letter-spacing:1px;text-transform:uppercase}
.training-card{background:#161616;border-radius:14px;padding:12px}
.training-label{font-size:9px;color:var(--gold);letter-spacing:2px;text-transform:uppercase;margin-bottom:8px}
.exercise{display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid #1e1e1e}
.exercise:last-child{border-bottom:none}
.exercise .name{font-size:12px;color:#ccc}
.exercise .rest{font-size:10px;background:#222;padding:2px 8px;border-radius:6px;color:#666}
.badge-float{position:absolute;background:rgba(18,18,18,0.95);border:1px solid rgba(201,168,76,0.28);border-radius:22px;padding:8px 14px;font-size:12px;font-weight:500;white-space:nowrap;backdrop-filter:blur(10px);z-index:2}
.bf1{top:12%;right:-8%;animation:float 3s ease-in-out 0s infinite}
.bf2{top:46%;left:-18%;animation:float 3s ease-in-out 0.6s infinite}
.bf3{bottom:18%;right:-10%;animation:float 3s ease-in-out 1.2s infinite}
.strip{border-top:1px solid rgba(201,168,76,0.08);border-bottom:1px solid rgba(201,168,76,0.08);padding:18px 0;overflow:hidden;background:rgba(201,168,76,0.015)}
.marquee{display:flex;gap:48px;animation:marquee 18s linear infinite;white-space:nowrap}
.marquee span{color:#3a3a3a;font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:500}
.marquee .dot{color:var(--gold);opacity:0.4;font-size:8px}
section{padding:100px 48px}
.section-tag{font-size:11px;color:var(--gold);letter-spacing:4px;text-transform:uppercase;margin-bottom:16px}
.section-title{font-family:'Bebas Neue';font-size:clamp(42px,5vw,68px);letter-spacing:2px;line-height:1;margin-bottom:16px}
.section-sub{color:var(--muted);font-size:15px}
.section-center{text-align:center;max-width:1200px;margin:0 auto 64px}
.bento{display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:auto auto;gap:16px;max-width:1200px;margin:0 auto}
.bento-card{background:rgba(255,255,255,0.018);border:1px solid rgba(201,168,76,0.1);border-radius:24px;padding:32px;transition:all 0.35s ease;cursor:default;position:relative;overflow:hidden}
.bento-card:hover{border-color:rgba(201,168,76,0.45);transform:translateY(-5px);box-shadow:0 20px 60px rgba(0,0,0,0.4)}
.bento-big{grid-column:span 2;grid-row:span 2}
.bento-icon{font-size:36px;margin-bottom:20px}
.bento-tag{display:inline-block;background:rgba(201,168,76,0.08);border:1px solid rgba(201,168,76,0.25);border-radius:20px;padding:4px 12px;font-size:10px;color:var(--gold);letter-spacing:2px;text-transform:uppercase;margin-bottom:18px}
.bento-title{font-size:24px;font-weight:600;margin-bottom:12px;line-height:1.2}
.bento-desc{color:#666;font-size:14px;line-height:1.7}
.bento-card:not(.bento-big) .bento-title{font-size:18px}
.bento-card:not(.bento-big) .bento-icon{font-size:28px;margin-bottom:14px}
.meal-list{margin-top:28px;display:flex;flex-direction:column;gap:10px}
.meal-row{background:rgba(255,255,255,0.025);border-radius:12px;padding:10px 14px;display:flex;justify-content:space-between;align-items:center}
.meal-time{font-size:10px;color:var(--gold);margin-bottom:2px}
.meal-items{font-size:12px;color:#666}
.meal-kcal{font-size:11px;background:rgba(255,255,255,0.04);padding:4px 10px;border-radius:8px;color:#555}
.how-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:0;position:relative;max-width:1000px;margin:0 auto}
.how-line{position:absolute;top:52px;left:17%;right:17%;height:1px;background:linear-gradient(90deg,transparent,rgba(201,168,76,0.25),transparent)}
.how-item{text-align:center;padding:0 40px}
.how-circle{width:84px;height:84px;border-radius:50%;margin:0 auto 24px;display:flex;align-items:center;justify-content:center;font-size:30px;position:relative;z-index:1}
.how-circle.main{background:var(--gold);box-shadow:0 0 40px rgba(201,168,76,0.3);animation:pulse 2s infinite}
.how-circle.side{background:rgba(201,168,76,0.08);border:1px solid rgba(201,168,76,0.25)}
.how-time{font-size:10px;color:var(--gold);letter-spacing:2.5px;text-transform:uppercase;margin-bottom:12px}
.how-title{font-size:19px;font-weight:600;margin-bottom:10px}
.how-desc{color:#5a5a5a;font-size:13px;line-height:1.7}
.price-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;max-width:860px;margin:0 auto}
.price-card{border-radius:28px;padding:44px;position:relative;overflow:hidden}
.price-card.featured{background:rgba(201,168,76,0.04);border:2px solid rgba(201,168,76,0.45)}
.price-card.standard{background:rgba(255,255,255,0.018);border:1px solid rgba(255,255,255,0.07)}
.popular-badge{position:absolute;top:22px;right:22px;background:var(--gold);color:#000;font-size:10px;font-weight:700;padding:5px 14px;border-radius:20px;letter-spacing:1px;text-transform:uppercase}
.price-type{font-size:11px;color:var(--gold);letter-spacing:3px;text-transform:uppercase;margin-bottom:20px}
.price-amount{display:flex;align-items:baseline;gap:4px;margin-bottom:8px}
.price-cur{font-size:13px;color:#777;align-self:flex-start;margin-top:18px}
.price-num{font-family:'Bebas Neue';font-size:88px;line-height:1;color:var(--gold)}
.price-num.free{font-size:52px;color:#fff}
.price-period{color:#666;font-size:14px}
.price-sub{color:#555;font-size:13px;margin-bottom:32px}
.price-features{list-style:none;display:flex;flex-direction:column;gap:13px;margin-bottom:38px}
.price-features li{display:flex;align-items:center;gap:12px;font-size:14px;color:#ccc}
.price-features li .check{color:var(--gold);font-size:14px}
.price-features.dim li{color:#666}
.price-features.dim li .check{color:#444}
.btn-price-gold{width:100%;background:var(--gold);color:#000;border:none;border-radius:16px;padding:16px;font-size:15px;font-weight:700;cursor:pointer;font-family:'Inter';transition:opacity 0.2s}
.btn-price-gold:hover{opacity:0.88}
.btn-price-outline{width:100%;background:transparent;color:var(--gold);border:1px solid rgba(201,168,76,0.35);border-radius:16px;padding:16px;font-size:14px;font-weight:600;cursor:pointer;font-family:'Inter';transition:all 0.2s}
.btn-price-outline:hover{background:rgba(201,168,76,0.06)}
.price-note{text-align:center;color:#444;font-size:12px;margin-top:14px}
.testi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;max-width:1200px;margin:0 auto}
.testi-card{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:24px;padding:32px;transition:all 0.3s}
.testi-card:hover{border-color:rgba(201,168,76,0.28);transform:translateY(-4px)}
.testi-top{display:flex;align-items:center;gap:14px;margin-bottom:20px}
.testi-avatar{width:50px;height:50px;border-radius:50%;border:2px solid rgba(201,168,76,0.25);display:flex;align-items:center;justify-content:center;font-weight:600;font-size:16px;flex-shrink:0}
.testi-name{font-weight:600;font-size:15px}
.testi-role{font-size:12px;color:#555}
.stars{color:var(--gold);font-size:15px;margin-bottom:16px;letter-spacing:2px}
.testi-quote{color:#777;font-size:14px;line-height:1.75;font-style:italic;margin-bottom:20px}
.result-badge{display:inline-block;background:rgba(201,168,76,0.07);border:1px solid rgba(201,168,76,0.2);border-radius:20px;padding:6px 14px;font-size:12px;color:var(--gold);font-weight:600}
.faq-wrap{max-width:700px;margin:0 auto}
.faq-item{border-bottom:1px solid rgba(255,255,255,0.05)}
.faq-q{width:100%;text-align:left;background:none;border:none;color:#fff;padding:22px 0;font-size:16px;font-weight:500;cursor:pointer;display:flex;justify-content:space-between;align-items:center;font-family:'Inter'}
.faq-plus{color:var(--gold);font-size:22px;transition:transform 0.3s;flex-shrink:0;margin-left:16px}
.faq-a{color:#666;font-size:14px;line-height:1.8;padding-bottom:20px;display:none}
.faq-a.open{display:block}
.faq-plus.open{transform:rotate(45deg)}
.cta-final{padding:120px 48px;text-align:center;position:relative;overflow:hidden;background:radial-gradient(ellipse at center,rgba(201,168,76,0.055) 0%,transparent 65%)}
.cta-title{font-family:'Bebas Neue';font-size:clamp(52px,7vw,92px);line-height:0.94;letter-spacing:2px;margin-bottom:24px}
.cta-title .gold{color:var(--gold)}
.cta-desc{color:#666;font-size:17px;margin-bottom:48px;font-weight:300}
.btn-cta-hero{background:linear-gradient(90deg,var(--gold),var(--gold-light),var(--gold));background-size:200% auto;border:none;color:#000;padding:20px 60px;border-radius:50px;font-size:17px;font-weight:700;cursor:pointer;font-family:'Inter';animation:shimmer 3s linear infinite;box-shadow:0 0 60px rgba(201,168,76,0.28);letter-spacing:0.5px}
.cta-sub{color:#3a3a3a;font-size:13px;margin-top:20px}
footer{border-top:1px solid rgba(255,255,255,0.04);padding:44px 48px;background:#030303}
.footer-inner{max-width:1200px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:20px}
.footer-links{display:flex;gap:24px}
.footer-links a{color:#444;font-size:13px;text-decoration:none;transition:color 0.2s}
.footer-links a:hover{color:var(--gold)}
.footer-copy{color:#333;font-size:13px}
@keyframes shimmer{0%{background-position:0% center}100%{background-position:200% center}}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
@keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(201,168,76,0.3)}50%{box-shadow:0 0 30px 8px rgba(201,168,76,0.15)}}
@keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
@media(max-width:900px){.hero-grid{grid-template-columns:1fr}.phone-wrap{display:none}.bento{grid-template-columns:1fr}.bento-big{grid-column:span 1;grid-row:span 1}.how-grid{grid-template-columns:1fr;gap:40px}.how-line{display:none}.price-grid{grid-template-columns:1fr}.testi-grid{grid-template-columns:1fr}nav{padding:0 20px}nav ul{display:none}section{padding:60px 20px}.hero{padding:80px 20px 40px}.cta-final{padding:80px 20px}footer{padding:32px 20px}}
</style>

<nav id="main-nav">
  <div class="logo" onclick="window.scrollTo({top:0,behavior:'smooth'})">
    <div class="logo-icon">⚡</div>
    <div>
      <div class="logo-text">COACHPRO</div>
      <div class="logo-sub">Elite Performance</div>
    </div>
  </div>
  <ul>
    <li><a href="#features">Fonctionnalités</a></li>
    <li><a href="#pricing">Tarifs</a></li>
    <li><a href="#coaches">Coachs</a></li>
  </ul>
  <div class="nav-btns">
    <button class="btn-ghost" id="btn-login">Connexion</button>
    <button class="btn-gold" id="btn-start">Commencer</button>
  </div>
</nav>

<div class="hero">
  <div class="hero-glow"></div>
  <div class="hero-grid">
    <div>
      <div class="badge"><div class="badge-dot"></div>Propulsé par l'IA Claude d'Anthropic</div>
      <h1 class="hero-title">TRANSFORME<br>TON CORPS.<br><span class="gold">DÉPASSE</span><br><span class="gold">TES LIMITES.</span></h1>
      <p class="hero-desc">CoachPro connecte athlètes et coaches d'élite avec des plans alimentaires et sportifs générés par IA. Basé sur <strong>3 484 aliments ANSES/Ciqual 2025</strong>. Résultats garantis.</p>
      <div class="hero-btns">
        <button class="btn-hero" id="btn-hero-start">🚀 Commencer — CHF 30/mois</button>
        <button class="btn-outline" onclick="document.getElementById('features').scrollIntoView({behavior:'smooth'})">▶ Comment ça marche</button>
      </div>
      <div class="stats">
        <div class="stat"><div class="stat-val">4.9★</div><div class="stat-label">Note moyenne</div></div>
        <div class="stat"><div class="stat-val">500+</div><div class="stat-label">Athlètes actifs</div></div>
        <div class="stat"><div class="stat-val">50+</div><div class="stat-label">Coachs certifiés</div></div>
      </div>
    </div>
    <div class="phone-wrap">
      <div class="phone-glow"></div>
      <div class="badge-float bf1">🔥 -3kg ce mois</div>
      <div class="badge-float bf2">✓ Plan validé IA</div>
      <div class="badge-float bf3">💪 Séance today</div>
      <div class="phone">
        <div class="phone-notch"></div>
        <div class="screen">
          <div class="screen-header">
            <div><div class="screen-date">Mercredi 25 Mars</div><div class="screen-hello">Bonjour, Sarah 👋</div></div>
            <div class="avatar-sm">S</div>
          </div>
          <div class="screen-grid">
            <div class="screen-card"><div class="icon">⚖️</div><div class="val gold">62 kg</div><div class="lbl">Poids actuel</div></div>
            <div class="screen-card"><div class="icon">🎯</div><div class="val">55 kg</div><div class="lbl">Objectif</div></div>
          </div>
          <div class="nutri-card">
            <div class="nutri-top"><span class="nutri-label">Nutrition du jour</span><span class="nutri-kcal">1420/1800 kcal</span></div>
            <div class="progress-bar"><div class="progress-fill"></div></div>
            <div class="macros">
              <div class="macro"><div class="v" style="color:#3b82f6">120g</div><div class="l">Prot</div></div>
              <div class="macro"><div class="v" style="color:#22c55e">180g</div><div class="l">Gluc</div></div>
              <div class="macro"><div class="v" style="color:#C9A84C">48g</div><div class="l">Lip</div></div>
            </div>
          </div>
          <div class="training-card">
            <div class="training-label">Programme du jour</div>
            <div class="exercise"><span class="name">Squat barre — 4×8</span><span class="rest">90s</span></div>
            <div class="exercise"><span class="name">Presse — 3×12</span><span class="rest">60s</span></div>
            <div class="exercise"><span class="name">Fentes — 3×10</span><span class="rest">60s</span></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<div class="strip">
  <div class="marquee">
    <span>FitClub Geneva</span><span class="dot">✦</span><span>Sport Academy Zurich</span><span class="dot">✦</span><span>Elite Performance Basel</span><span class="dot">✦</span><span>ProCoach Lausanne</span><span class="dot">✦</span><span>Swiss Athletics</span><span class="dot">✦</span><span>FitClub Geneva</span><span class="dot">✦</span><span>Sport Academy Zurich</span><span class="dot">✦</span><span>Elite Performance Basel</span><span class="dot">✦</span>
  </div>
</div>

<section id="features" style="background:#070707">
  <div class="section-center"><div class="section-tag">Fonctionnalités</div><div class="section-title">TOUT CE DONT TU AS BESOIN</div><div class="section-sub">Une plateforme. Des résultats infinis.</div></div>
  <div class="bento">
    <div class="bento-card bento-big">
      <div style="position:absolute;top:0;right:0;width:220px;height:220px;background:radial-gradient(circle,rgba(201,168,76,0.05),transparent);pointer-events:none;border-radius:24px"></div>
      <div class="bento-icon">🥗</div>
      <div class="bento-tag">Ciqual 2025</div>
      <div class="bento-title" style="font-size:26px">Nutrition IA<br>personnalisée</div>
      <div class="bento-desc">Plans de 7 jours générés en 30 secondes basés sur tes macros et <strong style="color:#aaa">3 484 aliments ANSES/Ciqual 2025</strong>. Quantités exactes en grammes, aliments cuits.</div>
      <div class="meal-list">
        <div class="meal-row"><div><div class="meal-time">🌅 Petit-déjeuner</div><div class="meal-items">Flocons d'avoine · Banane · Yaourt grec</div></div><div class="meal-kcal">487 kcal</div></div>
        <div class="meal-row"><div><div class="meal-time">☀️ Déjeuner</div><div class="meal-items">Blanc de poulet · Riz basmati · Brocoli</div></div><div class="meal-kcal">612 kcal</div></div>
        <div class="meal-row"><div><div class="meal-time">🌙 Dîner</div><div class="meal-items">Saumon · Patate douce · Épinards</div></div><div class="meal-kcal">520 kcal</div></div>
      </div>
    </div>
    <div class="bento-card"><div class="bento-icon">💪</div><div class="bento-title">Training sur mesure</div><div class="bento-desc">Programmes adaptés à ton niveau, objectif et équipement disponible.</div></div>
    <div class="bento-card"><div class="bento-icon">📊</div><div class="bento-title">Suivi en temps réel</div><div class="bento-desc">Graphiques de progression, photos avant/après et streak d'entraînement.</div></div>
    <div class="bento-card"><div class="bento-icon">💬</div><div class="bento-title">Coach connecté</div><div class="bento-desc">Messagerie temps réel, retours instantanés, ajustements de ton programme.</div></div>
    <div class="bento-card"><div class="bento-icon">🛒</div><div class="bento-title">Liste de courses auto</div><div class="bento-desc">Générée depuis ton plan hebdomadaire, organisée par rayon supermarché.</div></div>
  </div>
</section>

<section style="background:#0a0a0a">
  <div class="section-center"><div class="section-tag">Comment ça marche</div><div class="section-title">3 ÉTAPES VERS TES RÉSULTATS</div></div>
  <div class="how-grid">
    <div class="how-line"></div>
    <div class="how-item"><div class="how-circle side">🎯</div><div class="how-time">2 minutes</div><div class="how-title">Crée ton profil</div><div class="how-desc">Objectifs, mensurations, préférences alimentaires. L'IA apprend à te connaître en profondeur.</div></div>
    <div class="how-item"><div class="how-circle main">⚡</div><div class="how-time">30 secondes</div><div class="how-title">Ton plan IA en 30s</div><div class="how-desc">Ton coach génère un plan 7 jours complet : nutrition précise + programme d'entraînement sur mesure.</div></div>
    <div class="how-item"><div class="how-circle side">🏆</div><div class="how-time">Chaque jour</div><div class="how-title">Progresse & Performe</div><div class="how-desc">Suis ta progression, coche tes repas, échange avec ton coach. Résultats garantis.</div></div>
  </div>
</section>

<section id="pricing">
  <div class="section-center"><div class="section-tag">Tarifs</div><div class="section-title">SIMPLE ET TRANSPARENT</div><div class="section-sub">Sans engagement, résiliable à tout moment.</div></div>
  <div class="price-grid">
    <div class="price-card featured">
      <div class="popular-badge">POPULAIRE</div>
      <div class="price-type">Athlète</div>
      <div class="price-amount"><span class="price-cur">CHF</span><span class="price-num">30</span><span class="price-period">/mois</span></div>
      <div class="price-sub">Tout inclus, sans surprise</div>
      <ul class="price-features">
        <li><span class="check">✦</span> Plan alimentaire IA 7 jours</li>
        <li><span class="check">✦</span> Programme entraînement perso</li>
        <li><span class="check">✦</span> 3 484 aliments ANSES/Ciqual</li>
        <li><span class="check">✦</span> Suivi progression & photos</li>
        <li><span class="check">✦</span> Messagerie coach temps réel</li>
        <li><span class="check">✦</span> Liste de courses automatique</li>
        <li><span class="check">✦</span> Calculateur BMR/TDEE</li>
      </ul>
      <button class="btn-price-gold" id="btn-pricing-start">Commencer maintenant →</button>
      <div class="price-note">Sans engagement · Résiliable à tout moment</div>
    </div>
    <div class="price-card standard">
      <div class="price-type" style="color:#777">Coach</div>
      <div class="price-amount"><span class="price-num free">GRATUIT</span></div>
      <div class="price-sub">*5% commission par client/mois</div>
      <ul class="price-features dim">
        <li><span class="check">✦</span> Dashboard clients illimité</li>
        <li><span class="check">✦</span> Génération plans IA</li>
        <li><span class="check">✦</span> Paiements Stripe automatisés</li>
        <li><span class="check">✦</span> Calendrier & suivi séances</li>
        <li><span class="check">✦</span> Messagerie temps réel</li>
        <li><span class="check">✦</span> Analytics revenus en direct</li>
      </ul>
      <button class="btn-price-outline" id="btn-coach-signup">Devenir coach →</button>
    </div>
  </div>
</section>

<section id="coaches" style="background:#070707">
  <div class="section-center"><div class="section-tag">Témoignages</div><div class="section-title">ILS ONT TRANSFORMÉ LEUR VIE</div></div>
  <div class="testi-grid">
    <div class="testi-card"><div class="testi-top"><div class="testi-avatar" style="background:#1a3a2a">MT</div><div><div class="testi-name">Marc T.</div><div class="testi-role">Coach certifié IFBB, Genève</div></div></div><div class="stars">★★★★★</div><div class="testi-quote">"CoachPro a transformé ma façon de coacher. Les plans IA me font gagner 2 heures par client. Mes résultats clients ont explosé."</div><div class="result-badge">+12 clients en 2 mois</div></div>
    <div class="testi-card"><div class="testi-top"><div class="testi-avatar" style="background:#1a2a3a">SM</div><div><div class="testi-name">Sarah M.</div><div class="testi-role">Cliente, Lausanne</div></div></div><div class="stars">★★★★★</div><div class="testi-quote">"En 3 mois, j'ai perdu 8 kg. Le plan alimentaire est tellement précis que c'est bluffant. La liste de courses automatique, c'est magique."</div><div class="result-badge">-8 kg en 3 mois</div></div>
    <div class="testi-card"><div class="testi-top"><div class="testi-avatar" style="background:#2a1a3a">LB</div><div><div class="testi-name">Lucas B.</div><div class="testi-role">Client, Zurich</div></div></div><div class="stars">★★★★★</div><div class="testi-quote">"J'avais essayé des dizaines d'apps. CoachPro est la première qui combine vraiment coach humain et IA. Le vrai game changer."</div><div class="result-badge">+6 kg de muscle</div></div>
  </div>
</section>

<section>
  <div class="section-center"><div class="section-tag">FAQ</div><div class="section-title">TES QUESTIONS</div></div>
  <div class="faq-wrap">
    <div class="faq-item"><button class="faq-q" onclick="toggleFaq(0)">Comment fonctionne le paiement ?<span class="faq-plus" id="plus0">+</span></button><div class="faq-a" id="faq0">Paiement sécurisé via Stripe. CHF 30/mois, résiliable à tout moment depuis ton profil. Aucun engagement, aucune surprise.</div></div>
    <div class="faq-item"><button class="faq-q" onclick="toggleFaq(1)">L'IA remplace-t-elle mon coach ?<span class="faq-plus" id="plus1">+</span></button><div class="faq-a" id="faq1">Non — l'IA assiste ton coach humain. Il génère, supervise et valide chaque plan avant qu'il te soit envoyé. Le meilleur des deux mondes.</div></div>
    <div class="faq-item"><button class="faq-q" onclick="toggleFaq(2)">Puis-je changer de coach ?<span class="faq-plus" id="plus2">+</span></button><div class="faq-a" id="faq2">Oui, à tout moment. Contacte notre support et nous t'assignons un nouveau coach sous 24h, en gardant ton historique.</div></div>
    <div class="faq-item"><button class="faq-q" onclick="toggleFaq(3)">Comment résilier ?<span class="faq-plus" id="plus3">+</span></button><div class="faq-a" id="faq3">Depuis ton profil → Mon abonnement → Résilier. Aucun frais, ton accès reste actif jusqu'à la fin de la période payée.</div></div>
    <div class="faq-item"><button class="faq-q" onclick="toggleFaq(4)">Mes données sont-elles sécurisées ?<span class="faq-plus" id="plus4">+</span></button><div class="faq-a" id="faq4">Oui. Données stockées en Suisse via Supabase, chiffrées en transit et au repos. Conformité RGPD totale. Tes données t'appartiennent.</div></div>
  </div>
</section>

<div class="cta-final">
  <h2 class="cta-title">PRÊT À DEVENIR<br><span class="gold">LA MEILLEURE VERSION</span><br>DE TOI-MÊME ?</h2>
  <p class="cta-desc">Rejoins 500+ athlètes qui ont transformé leur physique avec CoachPro.</p>
  <button class="btn-cta-hero" id="btn-cta-final">🚀 COMMENCER MAINTENANT — CHF 30/MOIS</button>
  <div class="cta-sub">✓ Sans engagement &nbsp;·&nbsp; ✓ Résiliable &nbsp;·&nbsp; ✓ Support inclus</div>
</div>

<footer>
  <div class="footer-inner">
    <div class="logo"><div class="logo-icon" style="width:30px;height:30px;font-size:15px;border-radius:8px">⚡</div><div><div class="logo-text" style="font-size:17px">COACHPRO</div><div class="logo-sub">Elite Performance</div></div></div>
    <div class="footer-links"><a href="#">CGU</a><a href="#">Confidentialité</a><a href="#">Contact</a></div>
    <div class="footer-copy">© 2026 CoachPro by MoovX · contact@moovx.ch</div>
  </div>
</footer>
`

  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <script dangerouslySetInnerHTML={{
        __html: `
          function toggleFaq(i) {
            var a = document.getElementById('faq'+i);
            var p = document.getElementById('plus'+i);
            var open = a.classList.contains('open');
            document.querySelectorAll('.faq-a').forEach(function(el){el.classList.remove('open')});
            document.querySelectorAll('.faq-plus').forEach(function(el){el.classList.remove('open')});
            if (!open) { a.classList.add('open'); p.classList.add('open'); }
          }
          window.addEventListener('scroll', function() {
            var nav = document.getElementById('main-nav');
            if (!nav) return;
            if (window.scrollY > 40) {
              nav.style.background = 'rgba(6,6,6,0.92)';
              nav.style.borderBottomColor = 'rgba(201,168,76,0.1)';
            } else {
              nav.style.background = 'transparent';
              nav.style.borderBottomColor = 'transparent';
            }
          });
        `
      }} />
    </>
  )
}
