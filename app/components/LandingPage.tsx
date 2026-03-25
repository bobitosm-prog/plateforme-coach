'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function LandingPage() {
  const router = useRouter()

  useEffect(() => {
    // FAQ
    ;(window as any).tf = (i: number) => {
      const a = document.getElementById('f' + i)
      const p = document.getElementById('p' + i)
      if (!a || !p) return
      const o = a.classList.contains('open')
      document.querySelectorAll('.faq-a').forEach(e => e.classList.remove('open'))
      document.querySelectorAll('.faq-plus').forEach(e => e.classList.remove('open'))
      if (!o) { a.classList.add('open'); p.classList.add('open') }
    }
    // Navbar scroll
    const nav = document.getElementById('main-nav')
    const onScroll = () => {
      if (!nav) return
      nav.style.background = window.scrollY > 40 ? 'rgba(5,5,5,0.95)' : 'rgba(5,5,5,0.88)'
    }
    window.addEventListener('scroll', onScroll)
    // Buttons
    const go = (id: string, path: string) => {
      document.getElementById(id)?.addEventListener('click', () => router.push(path))
    }
    go('btn-login', '/login')
    go('btn-start', '/register-client')
    go('btn-hero', '/register-client')
    go('btn-pricing', '/register-client')
    go('btn-coach', '/coach-signup')
    go('btn-cta', '/register-client')
    return () => window.removeEventListener('scroll', onScroll)
  }, [router])

  return (
    <div dangerouslySetInnerHTML={{ __html: LANDING_HTML }} />
  )
}

const LANDING_HTML = `
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,wght@0,200;0,300;0,400;0,500;0,600;1,300&display=swap" rel="stylesheet">
<style>
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,wght@0,200;0,300;0,400;0,500;0,600;1,300&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
:root{--g:#C9A84C;--gl:#F0D060;--bg:#050505;--c1:#0d0d0d;--w:#ffffff;--m:#777}
body{background:var(--bg);color:var(--w);font-family:'DM Sans',sans-serif;overflow-x:hidden;line-height:1.6}
.nav{position:sticky;top:0;z-index:200;background:rgba(5,5,5,0.88);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border-bottom:1px solid rgba(201,168,76,0.1);padding:0 40px;display:flex;align-items:center;justify-content:space-between;height:60px;transition:background 0.3s}
.nav-logo{display:flex;align-items:center;gap:10px;cursor:pointer}
.nav-icon{width:34px;height:34px;background:linear-gradient(135deg,var(--g),var(--gl));border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:17px;box-shadow:0 4px 20px rgba(201,168,76,0.3)}
.nav-brand{font-family:'Bebas Neue';font-size:20px;letter-spacing:2.5px}
.nav-tagline{font-size:7.5px;letter-spacing:3.5px;color:var(--g);text-transform:uppercase;line-height:1;opacity:0.8}
.nav-links{display:flex;gap:28px}
.nav-links a{color:var(--m);text-decoration:none;font-size:13px;font-weight:300;letter-spacing:0.3px;transition:color 0.2s}
.nav-links a:hover{color:var(--g)}
.nav-actions{display:flex;gap:10px;align-items:center}
.btn-nav-ghost{background:transparent;border:1px solid rgba(255,255,255,0.1);color:#bbb;padding:7px 18px;border-radius:40px;font-size:12.5px;cursor:pointer;font-family:'DM Sans';transition:all 0.2s;letter-spacing:0.3px}
.btn-nav-ghost:hover{border-color:rgba(201,168,76,0.5);color:var(--g)}
.btn-nav-cta{background:var(--g);border:none;color:#000;padding:8px 20px;border-radius:40px;font-size:12.5px;font-weight:600;cursor:pointer;font-family:'DM Sans';letter-spacing:0.3px;transition:all 0.2s}
.btn-nav-cta:hover{background:var(--gl)}
.hero{min-height:96vh;display:flex;align-items:center;padding:70px 40px 60px;position:relative;overflow:hidden}
.hero-orb1{position:absolute;top:-100px;right:-100px;width:600px;height:600px;background:radial-gradient(circle,rgba(201,168,76,0.06),transparent 60%);pointer-events:none}
.hero-orb2{position:absolute;bottom:-200px;left:-100px;width:500px;height:500px;background:radial-gradient(circle,rgba(201,168,76,0.04),transparent 60%);pointer-events:none}
.hero-lines{position:absolute;inset:0;background-image:linear-gradient(rgba(201,168,76,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(201,168,76,0.03) 1px,transparent 1px);background-size:60px 60px;pointer-events:none}
.hero-inner{max-width:1160px;margin:0 auto;width:100%;display:grid;grid-template-columns:1.1fr 0.9fr;gap:60px;align-items:center;position:relative;z-index:1}
.hero-pill{display:inline-flex;align-items:center;gap:8px;border:1px solid rgba(201,168,76,0.3);background:rgba(201,168,76,0.06);border-radius:40px;padding:5px 14px 5px 8px;margin-bottom:28px}
.hero-pill-dot{width:20px;height:20px;background:rgba(201,168,76,0.15);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px}
.hero-pill span{font-size:11.5px;color:var(--g);letter-spacing:0.5px}
.hero-h1{font-family:'Bebas Neue';font-size:clamp(58px,7.5vw,100px);line-height:0.9;letter-spacing:0.5px;margin-bottom:24px}
.hero-h1 em{color:var(--g);font-style:normal}
.hero-sub{color:#888;font-size:16px;font-weight:300;line-height:1.8;margin-bottom:36px;max-width:460px}
.hero-sub strong{color:#ccc;font-weight:400}
.hero-ctas{display:flex;gap:12px;margin-bottom:50px;flex-wrap:wrap}
.btn-primary{background:linear-gradient(135deg,var(--g),var(--gl));border:none;color:#000;padding:14px 32px;border-radius:40px;font-size:14.5px;font-weight:600;cursor:pointer;font-family:'DM Sans';box-shadow:0 8px 30px rgba(201,168,76,0.25);transition:all 0.3s}
.btn-primary:hover{transform:translateY(-2px);box-shadow:0 12px 40px rgba(201,168,76,0.35)}
.btn-secondary{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);color:#ccc;padding:14px 28px;border-radius:40px;font-size:14px;cursor:pointer;font-family:'DM Sans';font-weight:300;transition:all 0.2s;display:flex;align-items:center;gap:8px}
.btn-secondary:hover{border-color:rgba(201,168,76,0.3);color:var(--g)}
.hero-stats{display:flex;gap:0;padding-top:4px}
.stat-item{padding:0 28px;border-right:1px solid rgba(255,255,255,0.06)}
.stat-item:first-child{padding-left:0}
.stat-item:last-child{border-right:none}
.stat-num{font-family:'Bebas Neue';font-size:36px;color:var(--g);line-height:1;letter-spacing:1px}
.stat-lbl{font-size:11px;color:#4a4a4a;text-transform:uppercase;letter-spacing:2px;margin-top:2px}
.phone-zone{display:flex;justify-content:center;position:relative}
.phone-aura{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:320px;height:320px;background:radial-gradient(circle,rgba(201,168,76,0.1),transparent 65%);pointer-events:none}
.phone-outer{width:268px;background:linear-gradient(160deg,#1c1c1e,#0f0f0f);border-radius:46px;border:1.5px solid rgba(255,255,255,0.1);padding:12px 9px;box-shadow:0 40px 100px rgba(0,0,0,0.8),0 0 0 1px rgba(255,255,255,0.05) inset;position:relative;z-index:1}
.phone-notch{width:90px;height:22px;background:#000;border-radius:16px;margin:0 auto 8px;position:relative}
.phone-notch::after{content:'';position:absolute;width:10px;height:10px;background:#1a1a1a;border-radius:50%;top:50%;right:12px;transform:translateY(-50%)}
.phone-screen{background:#0a0a0a;border-radius:36px;overflow:hidden}
.ps-head{padding:14px 14px 10px;display:flex;justify-content:space-between;align-items:center}
.ps-date{font-size:9.5px;color:#444;font-weight:300}
.ps-hello{font-size:16px;font-weight:500;margin-top:1px}
.ps-avatar{width:32px;height:32px;background:linear-gradient(135deg,var(--g),var(--gl));border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#000}
.ps-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px;padding:0 10px 8px}
.ps-card{background:#131313;border-radius:14px;padding:11px 12px;border:1px solid rgba(255,255,255,0.04)}
.ps-card-icon{font-size:13px;margin-bottom:3px}
.ps-card-val{font-size:19px;font-weight:500}
.ps-card-val.g{color:var(--g)}
.ps-card-lbl{font-size:8px;color:#3a3a3a;text-transform:uppercase;letter-spacing:1.5px;margin-top:1px}
.ps-nutri{margin:0 10px 8px;background:#131313;border-radius:14px;padding:11px 12px;border:1px solid rgba(255,255,255,0.04)}
.ps-nutri-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
.ps-nutri-lbl{font-size:8.5px;color:var(--g);letter-spacing:2px;text-transform:uppercase}
.ps-nutri-val{font-size:8.5px;color:#3a3a3a}
.ps-bar{height:4px;background:#1e1e1e;border-radius:2px;overflow:hidden;margin-bottom:8px}
.ps-bar-fill{height:100%;width:79%;background:linear-gradient(90deg,var(--g),var(--gl));border-radius:2px}
.ps-macros{display:flex;justify-content:space-around}
.ps-macro-v{font-size:12px;font-weight:500;text-align:center}
.ps-macro-l{font-size:7.5px;color:#3a3a3a;text-align:center;text-transform:uppercase;letter-spacing:1px}
.ps-plan{margin:0 10px 10px;background:#131313;border-radius:14px;padding:11px 12px;border:1px solid rgba(255,255,255,0.04)}
.ps-plan-lbl{font-size:8.5px;color:var(--g);letter-spacing:2px;text-transform:uppercase;margin-bottom:8px}
.ps-ex{display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid #181818}
.ps-ex:last-child{border:none}
.ps-ex-name{font-size:11px;color:#bbb}
.ps-ex-rest{font-size:9px;background:#1e1e1e;padding:2px 7px;border-radius:5px;color:#555}
.float-badge{position:absolute;background:rgba(14,14,14,0.96);border:1px solid rgba(201,168,76,0.22);border-radius:20px;padding:7px 13px;font-size:11px;font-weight:500;white-space:nowrap;z-index:2}
.fb1{top:10%;right:-14%;animation:fbob 3.2s ease-in-out 0s infinite}
.fb2{top:44%;left:-22%;animation:fbob 3.2s ease-in-out 0.8s infinite}
.fb3{bottom:14%;right:-12%;animation:fbob 3.2s ease-in-out 1.6s infinite}
.marquee-strip{border-top:1px solid rgba(201,168,76,0.07);border-bottom:1px solid rgba(201,168,76,0.07);background:rgba(201,168,76,0.012);overflow:hidden;padding:14px 0}
.marquee-track{display:flex;gap:52px;animation:slide 20s linear infinite;white-space:nowrap}
.marquee-item{font-size:10.5px;color:#2e2e2e;letter-spacing:3.5px;text-transform:uppercase;font-weight:500}
.marquee-sep{color:rgba(201,168,76,0.3);font-size:8px}
.sec-wrap{padding:96px 40px;max-width:1160px;margin:0 auto}
.sec-tag{font-size:10.5px;color:var(--g);letter-spacing:4px;text-transform:uppercase;margin-bottom:12px;font-weight:400}
.sec-title{font-family:'Bebas Neue';font-size:clamp(40px,4.5vw,62px);letter-spacing:1.5px;line-height:0.95;margin-bottom:14px}
.sec-sub{color:#5a5a5a;font-size:15px;font-weight:300}
.sec-center{text-align:center;margin-bottom:56px}
.bento{display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:auto auto;gap:14px}
.bc{background:rgba(255,255,255,0.018);border:1px solid rgba(255,255,255,0.06);border-radius:22px;padding:28px;transition:all 0.35s;position:relative;overflow:hidden}
.bc:hover{border-color:rgba(201,168,76,0.35);transform:translateY(-4px);box-shadow:0 20px 60px rgba(0,0,0,0.5)}
.bc-big{grid-column:span 2;grid-row:span 2}
.bc-icon{font-size:32px;margin-bottom:18px}
.bc-pill{display:inline-block;background:rgba(201,168,76,0.07);border:1px solid rgba(201,168,76,0.2);border-radius:18px;padding:3px 11px;font-size:9.5px;color:var(--g);letter-spacing:2px;text-transform:uppercase;margin-bottom:16px}
.bc-title{font-size:21px;font-weight:500;margin-bottom:10px;line-height:1.25}
.bc-big .bc-title{font-size:26px}
.bc-desc{color:#5a5a5a;font-size:13.5px;line-height:1.75;font-weight:300}
.meal-cards{margin-top:26px;display:flex;flex-direction:column;gap:9px}
.meal-card{background:rgba(255,255,255,0.025);border-radius:11px;padding:9px 13px;display:flex;justify-content:space-between;align-items:center;border:1px solid rgba(255,255,255,0.04)}
.mc-time{font-size:9px;color:var(--g);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:2px}
.mc-items{font-size:11.5px;color:#5a5a5a;font-weight:300}
.mc-kcal{font-size:10.5px;background:rgba(255,255,255,0.04);padding:3px 9px;border-radius:7px;color:#444;white-space:nowrap}
.pwa-inner{max-width:1160px;margin:0 auto;padding:96px 40px;display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:center}
.pwa-steps{display:flex;flex-direction:column;gap:28px;margin-top:40px}
.pwa-step{display:flex;gap:20px;align-items:flex-start}
.pwa-step-num{width:40px;height:40px;border-radius:50%;background:rgba(201,168,76,0.08);border:1px solid rgba(201,168,76,0.2);display:flex;align-items:center;justify-content:center;font-family:'Bebas Neue';font-size:17px;color:var(--g);flex-shrink:0;margin-top:2px}
.pwa-step-title{font-size:16px;font-weight:500;margin-bottom:4px}
.pwa-step-desc{font-size:13.5px;color:#5a5a5a;font-weight:300;line-height:1.7}
.pwa-device{background:linear-gradient(160deg,#1a1a1a,#0d0d0d);border-radius:22px;border:1px solid rgba(255,255,255,0.08);padding:24px;box-shadow:0 30px 80px rgba(0,0,0,0.6)}
.pwa-screen-row{display:flex;align-items:center;gap:10px;margin-bottom:14px}
.pwa-dot{width:10px;height:10px;border-radius:50%}
.pwa-url{flex:1;background:#111;border-radius:7px;padding:7px 12px;font-size:11px;color:#3a3a3a;font-family:monospace}
.pwa-banner{background:linear-gradient(135deg,rgba(201,168,76,0.12),rgba(201,168,76,0.04));border:1px solid rgba(201,168,76,0.2);border-radius:14px;padding:16px 18px;margin-bottom:14px;display:flex;align-items:center;gap:14px}
.pwa-banner-icon{width:44px;height:44px;background:linear-gradient(135deg,var(--g),var(--gl));border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0}
.pwa-banner-title{font-size:13px;font-weight:500;margin-bottom:2px}
.pwa-banner-sub{font-size:11px;color:#5a5a5a;font-weight:300}
.pwa-install-btn{background:var(--g);color:#000;border:none;border-radius:8px;padding:7px 16px;font-size:11.5px;font-weight:600;cursor:pointer;font-family:'DM Sans';margin-top:6px}
.pwa-feats{display:grid;grid-template-columns:1fr 1fr;gap:9px}
.pwa-feat{background:rgba(255,255,255,0.025);border-radius:10px;padding:10px 12px;font-size:12px;color:#666;font-weight:300;display:flex;align-items:center;gap:8px}
.pwa-feat span{color:var(--g);font-size:13px}
.how-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:0;position:relative}
.how-line{position:absolute;top:40px;left:16%;right:16%;height:1px;background:linear-gradient(90deg,transparent,rgba(201,168,76,0.18),transparent)}
.how-item{text-align:center;padding:0 36px}
.how-orb{width:80px;height:80px;border-radius:50%;margin:0 auto 22px;display:flex;align-items:center;justify-content:center;font-size:26px;position:relative;z-index:1}
.how-orb.gold{background:linear-gradient(135deg,var(--g),var(--gl));box-shadow:0 0 40px rgba(201,168,76,0.3)}
.how-orb.dim{background:rgba(201,168,76,0.07);border:1px solid rgba(201,168,76,0.18)}
.how-time{font-size:9.5px;color:var(--g);letter-spacing:3px;text-transform:uppercase;margin-bottom:10px}
.how-title{font-size:18px;font-weight:500;margin-bottom:10px}
.how-desc{color:#4a4a4a;font-size:13px;line-height:1.75;font-weight:300}
.price-cards{display:grid;grid-template-columns:1fr 1fr;gap:20px;max-width:900px;margin:0 auto}
.pc{border-radius:26px;padding:40px;position:relative}
.pc.feat{background:rgba(201,168,76,0.04);border:1.5px solid rgba(201,168,76,0.4)}
.pc.std{background:rgba(255,255,255,0.018);border:1px solid rgba(255,255,255,0.07)}
.pc-badge{position:absolute;top:20px;right:20px;background:var(--g);color:#000;font-size:9.5px;font-weight:700;padding:4px 13px;border-radius:18px;letter-spacing:1px;text-transform:uppercase}
.pc-type{font-size:10px;letter-spacing:3.5px;text-transform:uppercase;margin-bottom:18px}
.pc.feat .pc-type{color:var(--g)}
.pc.std .pc-type{color:#555}
.pc-price{display:flex;align-items:baseline;gap:4px;margin-bottom:6px}
.pc-cur{font-size:12px;color:#666;align-self:flex-start;margin-top:18px}
.pc-num{font-family:'Bebas Neue';font-size:84px;line-height:1;color:var(--g)}
.pc-num.free{font-size:46px;color:#fff;letter-spacing:1px}
.pc-period{color:#555;font-size:13px}
.pc-sub{color:#444;font-size:12.5px;margin-bottom:30px;font-weight:300}
.pc-list{list-style:none;display:flex;flex-direction:column;gap:11px;margin-bottom:34px}
.pc-list li{display:flex;align-items:center;gap:11px;font-size:13.5px;font-weight:300}
.pc-list li .ck{font-size:11px}
.pc.feat .pc-list li{color:#ccc}
.pc.feat .pc-list li .ck{color:var(--g)}
.pc.std .pc-list li{color:#555}
.pc.std .pc-list li .ck{color:#333}
.pc-btn-gold{width:100%;background:var(--g);color:#000;border:none;border-radius:14px;padding:15px;font-size:14px;font-weight:600;cursor:pointer;font-family:'DM Sans';transition:all 0.2s}
.pc-btn-gold:hover{background:var(--gl)}
.pc-btn-out{width:100%;background:transparent;color:var(--g);border:1px solid rgba(201,168,76,0.3);border-radius:14px;padding:15px;font-size:13.5px;font-weight:500;cursor:pointer;font-family:'DM Sans';transition:all 0.2s}
.pc-btn-out:hover{background:rgba(201,168,76,0.06)}
.pc-note{text-align:center;color:#333;font-size:11.5px;margin-top:12px;font-weight:300}
.testi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
.tc{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:22px;padding:28px;transition:all 0.3s}
.tc:hover{border-color:rgba(201,168,76,0.22);transform:translateY(-3px)}
.tc-head{display:flex;align-items:center;gap:12px;margin-bottom:18px}
.tc-av{width:46px;height:46px;border-radius:50%;border:1.5px solid rgba(201,168,76,0.2);display:flex;align-items:center;justify-content:center;font-weight:600;font-size:15px;flex-shrink:0}
.tc-name{font-size:14.5px;font-weight:500}
.tc-role{font-size:11.5px;color:#444;font-weight:300}
.tc-stars{color:var(--g);font-size:13px;letter-spacing:2px;margin-bottom:14px}
.tc-quote{color:#666;font-size:13.5px;line-height:1.8;font-style:italic;font-weight:300;margin-bottom:18px}
.tc-result{display:inline-block;background:rgba(201,168,76,0.06);border:1px solid rgba(201,168,76,0.18);border-radius:18px;padding:5px 13px;font-size:11.5px;color:var(--g);font-weight:500}
.faq-wrap{max-width:680px;margin:0 auto}
.faq-item{border-bottom:1px solid rgba(255,255,255,0.05)}
.faq-q{width:100%;text-align:left;background:none;border:none;color:#ddd;padding:20px 0;font-size:15px;font-weight:400;cursor:pointer;display:flex;justify-content:space-between;align-items:center;font-family:'DM Sans';transition:color 0.2s}
.faq-q:hover{color:var(--g)}
.faq-plus{color:var(--g);font-size:20px;transition:transform 0.3s;flex-shrink:0;margin-left:16px;line-height:1}
.faq-a{color:#555;font-size:13.5px;line-height:1.85;padding-bottom:18px;display:none;font-weight:300}
.faq-a.open{display:block}
.faq-plus.open{transform:rotate(45deg)}
.cta-sec{padding:96px 40px;text-align:center;position:relative;overflow:hidden}
.cta-orb{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:600px;height:300px;background:radial-gradient(ellipse,rgba(201,168,76,0.07),transparent 65%);pointer-events:none}
.cta-inner{position:relative;z-index:1;max-width:700px;margin:0 auto}
.cta-h{font-family:'Bebas Neue';font-size:clamp(52px,6.5vw,86px);line-height:0.92;letter-spacing:1.5px;margin-bottom:22px}
.cta-h em{color:var(--g);font-style:normal}
.cta-p{color:#555;font-size:16px;font-weight:300;margin-bottom:44px;line-height:1.7}
.btn-cta{background:linear-gradient(135deg,var(--g),var(--gl));border:none;color:#000;padding:18px 56px;border-radius:50px;font-size:16px;font-weight:700;cursor:pointer;font-family:'DM Sans';box-shadow:0 12px 50px rgba(201,168,76,0.3);transition:all 0.3s}
.btn-cta:hover{transform:translateY(-2px);box-shadow:0 16px 60px rgba(201,168,76,0.4)}
.cta-tiny{color:#2e2e2e;font-size:12.5px;margin-top:18px;font-weight:300}
.footer{border-top:1px solid rgba(255,255,255,0.04);background:#020202}
.footer-top{max-width:1160px;margin:0 auto;padding:56px 40px 40px;display:grid;grid-template-columns:1.5fr 1fr 1fr 1fr;gap:48px}
.footer-brand-logo{display:flex;align-items:center;gap:10px;margin-bottom:16px}
.footer-brand-icon{width:34px;height:34px;background:linear-gradient(135deg,var(--g),var(--gl));border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:16px}
.footer-brand-name{font-family:'Bebas Neue';font-size:19px;letter-spacing:2.5px}
.footer-brand-desc{color:#3a3a3a;font-size:13px;line-height:1.75;font-weight:300;max-width:260px;margin-bottom:20px}
.footer-social{display:flex;gap:10px}
.footer-soc-btn{width:34px;height:34px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:14px;cursor:pointer;transition:all 0.2s}
.footer-soc-btn:hover{border-color:rgba(201,168,76,0.3)}
.footer-col-title{font-size:11px;color:var(--g);letter-spacing:3px;text-transform:uppercase;margin-bottom:18px;font-weight:400}
.footer-col-links{display:flex;flex-direction:column;gap:11px}
.footer-col-links a{color:#3a3a3a;text-decoration:none;font-size:13px;font-weight:300;transition:color 0.2s}
.footer-col-links a:hover{color:#aaa}
.footer-bottom{border-top:1px solid rgba(255,255,255,0.03);padding:20px 40px;display:flex;justify-content:space-between;align-items:center;max-width:1160px;margin:0 auto}
.footer-copy{color:#2a2a2a;font-size:12px;font-weight:300}
.footer-legal{display:flex;gap:20px}
.footer-legal a{color:#2a2a2a;font-size:12px;text-decoration:none;transition:color 0.2s;font-weight:300}
.footer-legal a:hover{color:#666}
@keyframes fbob{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
@keyframes slide{from{transform:translateX(0)}to{transform:translateX(-50%)}}
@media(max-width:900px){.nav-links{display:none}.hero-inner{grid-template-columns:1fr}.phone-zone{display:none}.bento{grid-template-columns:1fr}.bc-big{grid-column:span 1;grid-row:span 1}.pwa-inner{grid-template-columns:1fr}.how-grid{grid-template-columns:1fr;gap:40px}.how-line{display:none}.price-cards{grid-template-columns:1fr}.testi-grid{grid-template-columns:1fr}.footer-top{grid-template-columns:1fr 1fr}.sec-wrap{padding:60px 20px}.hero{padding:70px 20px 40px}.cta-sec{padding:60px 20px}.pwa-inner{padding:60px 20px}}
</style>

<nav class="nav" id="main-nav">
  <div class="nav-logo" onclick="window.scrollTo({top:0,behavior:'smooth'})">
    <div class="nav-icon">⚡</div>
    <div><div class="nav-brand">COACHPRO</div><div class="nav-tagline">Elite Performance</div></div>
  </div>
  <div class="nav-links">
    <a href="#features">Fonctionnalités</a>
    <a href="#pwa">Installation</a>
    <a href="#pricing">Tarifs</a>
    <a href="#coaches">Témoignages</a>
  </div>
  <div class="nav-actions">
    <button class="btn-nav-ghost" id="btn-login">Connexion</button>
    <button class="btn-nav-cta" id="btn-start">Commencer</button>
  </div>
</nav>

<div class="hero">
  <div class="hero-orb1"></div><div class="hero-orb2"></div><div class="hero-lines"></div>
  <div class="hero-inner">
    <div>
      <div class="hero-pill"><div class="hero-pill-dot">✦</div><span>Propulsé par l'IA Claude d'Anthropic</span></div>
      <h1 class="hero-h1">TRANSFORME<br>TON CORPS.<br><em>DÉPASSE</em><br><em>TES LIMITES.</em></h1>
      <p class="hero-sub">CoachPro connecte athlètes et coaches d'élite avec des plans alimentaires et sportifs générés par IA. Basé sur <strong>3 484 aliments ANSES/Ciqual 2025</strong>. Résultats garantis.</p>
      <div class="hero-ctas">
        <button class="btn-primary" id="btn-hero">🚀 Commencer — CHF 30/mois</button>
        <button class="btn-secondary" onclick="document.getElementById('features').scrollIntoView({behavior:'smooth'})">▶ &nbsp;Voir la démo</button>
      </div>
      <div class="hero-stats">
        <div class="stat-item"><div class="stat-num">4.9★</div><div class="stat-lbl">Note moyenne</div></div>
        <div class="stat-item"><div class="stat-num">500+</div><div class="stat-lbl">Athlètes actifs</div></div>
        <div class="stat-item"><div class="stat-num">50+</div><div class="stat-lbl">Coachs certifiés</div></div>
      </div>
    </div>
    <div class="phone-zone">
      <div class="phone-aura"></div>
      <div class="float-badge fb1">🔥 -3 kg ce mois</div>
      <div class="float-badge fb2">✓ Plan validé par IA</div>
      <div class="float-badge fb3">💪 Séance aujourd'hui</div>
      <div class="phone-outer">
        <div class="phone-notch"></div>
        <div class="phone-screen">
          <div class="ps-head"><div><div class="ps-date">Mercredi 25 Mars</div><div class="ps-hello">Bonjour, Sarah 👋</div></div><div class="ps-avatar">S</div></div>
          <div class="ps-grid">
            <div class="ps-card"><div class="ps-card-icon">⚖️</div><div class="ps-card-val g">62 kg</div><div class="ps-card-lbl">Poids actuel</div></div>
            <div class="ps-card"><div class="ps-card-icon">🎯</div><div class="ps-card-val">55 kg</div><div class="ps-card-lbl">Objectif</div></div>
          </div>
          <div class="ps-nutri">
            <div class="ps-nutri-row"><span class="ps-nutri-lbl">Nutrition du jour</span><span class="ps-nutri-val">1 420 / 1 800 kcal</span></div>
            <div class="ps-bar"><div class="ps-bar-fill"></div></div>
            <div class="ps-macros">
              <div><div class="ps-macro-v" style="color:#60a5fa">120g</div><div class="ps-macro-l">Prot</div></div>
              <div><div class="ps-macro-v" style="color:#4ade80">180g</div><div class="ps-macro-l">Gluc</div></div>
              <div><div class="ps-macro-v" style="color:#C9A84C">48g</div><div class="ps-macro-l">Lip</div></div>
            </div>
          </div>
          <div class="ps-plan">
            <div class="ps-plan-lbl">Programme du jour</div>
            <div class="ps-ex"><span class="ps-ex-name">Squat barre — 4×8</span><span class="ps-ex-rest">90s</span></div>
            <div class="ps-ex"><span class="ps-ex-name">Presse — 3×12</span><span class="ps-ex-rest">60s</span></div>
            <div class="ps-ex"><span class="ps-ex-name">Fentes haltères — 3×10</span><span class="ps-ex-rest">60s</span></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<div class="marquee-strip"><div class="marquee-track"><span class="marquee-item">FitClub Geneva</span><span class="marquee-sep">✦</span><span class="marquee-item">Sport Academy Zurich</span><span class="marquee-sep">✦</span><span class="marquee-item">Elite Performance Basel</span><span class="marquee-sep">✦</span><span class="marquee-item">ProCoach Lausanne</span><span class="marquee-sep">✦</span><span class="marquee-item">Swiss Athletics</span><span class="marquee-sep">✦</span><span class="marquee-item">FitClub Geneva</span><span class="marquee-sep">✦</span><span class="marquee-item">Sport Academy Zurich</span><span class="marquee-sep">✦</span><span class="marquee-item">Elite Performance Basel</span><span class="marquee-sep">✦</span></div></div>

<div id="features" style="background:#070707"><div class="sec-wrap">
  <div class="sec-center"><div class="sec-tag">Fonctionnalités</div><div class="sec-title">TOUT CE DONT TU AS BESOIN</div><div class="sec-sub">Une seule plateforme. Des résultats mesurables.</div></div>
  <div class="bento">
    <div class="bc bc-big">
      <div class="bc-icon">🥗</div><div class="bc-pill">Ciqual 2025 · ANSES</div>
      <div class="bc-title">Nutrition IA<br>ultra-personnalisée</div>
      <div class="bc-desc">Plans de 7 jours générés en 30 secondes basés sur tes macros et <strong style="color:#aaa;font-weight:400">3 484 aliments officiels ANSES/Ciqual 2025</strong>. Quantités exactes en grammes pour les aliments cuits.</div>
      <div class="meal-cards">
        <div class="meal-card"><div><div class="mc-time">Petit-déjeuner</div><div class="mc-items">Flocons d'avoine · Banane · Yaourt grec 0%</div></div><div class="mc-kcal">487 kcal</div></div>
        <div class="meal-card"><div><div class="mc-time">Déjeuner</div><div class="mc-items">Blanc de poulet cuit · Riz basmati · Brocoli</div></div><div class="mc-kcal">612 kcal</div></div>
        <div class="meal-card"><div><div class="mc-time">Dîner</div><div class="mc-items">Pavé de saumon · Patate douce · Épinards</div></div><div class="mc-kcal">520 kcal</div></div>
      </div>
    </div>
    <div class="bc"><div class="bc-icon">💪</div><div class="bc-title">Training sur mesure</div><div class="bc-desc">Programmes adaptés à ton niveau, objectif et équipement. Séries, reps et temps de repos optimisés par l'IA.</div></div>
    <div class="bc"><div class="bc-icon">📊</div><div class="bc-title">Suivi & Progression</div><div class="bc-desc">Graphiques de progression, photos avant/après, mensurations et streak d'entraînement quotidien.</div></div>
    <div class="bc"><div class="bc-icon">💬</div><div class="bc-title">Coach connecté</div><div class="bc-desc">Messagerie temps réel. Retours instantanés et ajustements de ton programme selon ta progression.</div></div>
    <div class="bc"><div class="bc-icon">🛒</div><div class="bc-title">Liste de courses auto</div><div class="bc-desc">Générée depuis ton plan semaine, organisée par rayon. Quantités exactes calculées sur 7 jours.</div></div>
  </div>
</div></div>

<div id="pwa" style="background:#0d0d0d"><div class="pwa-inner">
  <div>
    <div class="sec-tag">Application mobile</div>
    <div class="sec-title">INSTALLABLE SANS<br>APP STORE</div>
    <p style="color:#5a5a5a;font-size:15px;font-weight:300;line-height:1.8;margin:16px 0 8px">CoachPro est une <strong style="color:#aaa;font-weight:400">Progressive Web App (PWA)</strong> — installe l'app directement depuis ton navigateur, sans App Store ni Google Play.</p>
    <div class="pwa-steps">
      <div class="pwa-step"><div class="pwa-step-num">1</div><div><div class="pwa-step-title">Ouvre CoachPro dans Safari ou Chrome</div><div class="pwa-step-desc">Navigue sur <span style="color:var(--g)">app.moovx.ch</span> depuis ton iPhone ou Android.</div></div></div>
      <div class="pwa-step"><div class="pwa-step-num">2</div><div><div class="pwa-step-title">Ajouter à l'écran d'accueil</div><div class="pwa-step-desc">iPhone : Partager → Sur l'écran d'accueil. Android : menu ⋮ → Installer.</div></div></div>
      <div class="pwa-step"><div class="pwa-step-num">3</div><div><div class="pwa-step-title">Utilise comme une app native</div><div class="pwa-step-desc">Plein écran, rapide, notifications push. Comme une app classique.</div></div></div>
    </div>
  </div>
  <div>
    <div class="pwa-device">
      <div class="pwa-screen-row"><div class="pwa-dot" style="background:#ff5f57"></div><div class="pwa-dot" style="background:#febc2e"></div><div class="pwa-dot" style="background:#28c840"></div><div class="pwa-url">app.moovx.ch</div></div>
      <div class="pwa-banner"><div class="pwa-banner-icon">⚡</div><div><div class="pwa-banner-title">Installer CoachPro</div><div class="pwa-banner-sub">Ajouter à l'écran d'accueil</div><button class="pwa-install-btn">+ Installer</button></div></div>
      <div class="pwa-feats">
        <div class="pwa-feat"><span>✓</span> Fonctionne hors ligne</div>
        <div class="pwa-feat"><span>✓</span> Notifications push</div>
        <div class="pwa-feat"><span>✓</span> Mises à jour auto</div>
        <div class="pwa-feat"><span>✓</span> Plein écran natif</div>
        <div class="pwa-feat"><span>✓</span> iOS & Android</div>
        <div class="pwa-feat"><span>✓</span> Aucun store requis</div>
      </div>
    </div>
  </div>
</div></div>

<div style="background:#080808"><div class="sec-wrap">
  <div class="sec-center"><div class="sec-tag">Comment ça marche</div><div class="sec-title">3 ÉTAPES VERS TES RÉSULTATS</div></div>
  <div class="how-grid">
    <div class="how-line"></div>
    <div class="how-item"><div class="how-orb dim">🎯</div><div class="how-time">2 minutes</div><div class="how-title">Crée ton profil</div><div class="how-desc">Objectifs, mensurations, préférences alimentaires et niveau fitness.</div></div>
    <div class="how-item"><div class="how-orb gold">⚡</div><div class="how-time">30 secondes</div><div class="how-title">Plan IA instantané</div><div class="how-desc">Nutrition 7 jours avec vraies valeurs ANSES/Ciqual + programme entraînement.</div></div>
    <div class="how-item"><div class="how-orb dim">🏆</div><div class="how-time">Chaque jour</div><div class="how-title">Progresse & Performe</div><div class="how-desc">Coche tes repas, valide tes séances, échange avec ton coach.</div></div>
  </div>
</div></div>

<div id="pricing" style="background:#0d0d0d"><div class="sec-wrap">
  <div class="sec-center"><div class="sec-tag">Tarifs</div><div class="sec-title">SIMPLE ET TRANSPARENT</div><div class="sec-sub">Tout inclus. Sans engagement. Résiliable à tout moment.</div></div>
  <div class="price-cards">
    <div class="pc feat">
      <div class="pc-badge">Populaire</div>
      <div class="pc-type">Athlète</div>
      <div class="pc-price"><span class="pc-cur">CHF</span><span class="pc-num">30</span><span class="pc-period">/mois</span></div>
      <div class="pc-sub">Tout inclus, sans surprise</div>
      <ul class="pc-list"><li><span class="ck">✦</span> Plan alimentaire IA 7 jours</li><li><span class="ck">✦</span> Programme d'entraînement perso</li><li><span class="ck">✦</span> 3 484 aliments ANSES/Ciqual</li><li><span class="ck">✦</span> Suivi progression & photos</li><li><span class="ck">✦</span> Messagerie coach temps réel</li><li><span class="ck">✦</span> Liste de courses automatique</li><li><span class="ck">✦</span> Calculateur BMR/TDEE</li></ul>
      <button class="pc-btn-gold" id="btn-pricing">Commencer maintenant →</button>
      <div class="pc-note">Sans engagement · Résiliable à tout moment</div>
    </div>
    <div class="pc std">
      <div class="pc-type">Coach</div>
      <div class="pc-price"><span class="pc-num free">GRATUIT</span></div>
      <div class="pc-sub">*5% commission par client/mois</div>
      <ul class="pc-list"><li><span class="ck">✦</span> Dashboard clients illimité</li><li><span class="ck">✦</span> Génération plans IA</li><li><span class="ck">✦</span> Paiements Stripe automatisés</li><li><span class="ck">✦</span> Calendrier & suivi séances</li><li><span class="ck">✦</span> Messagerie temps réel</li><li><span class="ck">✦</span> Analytics revenus en direct</li></ul>
      <button class="pc-btn-out" id="btn-coach">Devenir coach →</button>
    </div>
  </div>
</div></div>

<div id="coaches" style="background:#060606"><div class="sec-wrap">
  <div class="sec-center"><div class="sec-tag">Témoignages</div><div class="sec-title">ILS ONT TRANSFORMÉ LEUR VIE</div></div>
  <div class="testi-grid">
    <div class="tc"><div class="tc-head"><div class="tc-av" style="background:#1a3a2a">MT</div><div><div class="tc-name">Marc T.</div><div class="tc-role">Coach certifié IFBB, Genève</div></div></div><div class="tc-stars">★★★★★</div><div class="tc-quote">"CoachPro a transformé ma façon de travailler. Les plans IA me font gagner 2 heures par client."</div><div class="tc-result">+12 clients en 2 mois</div></div>
    <div class="tc"><div class="tc-head"><div class="tc-av" style="background:#1a2a3a">SM</div><div><div class="tc-name">Sarah M.</div><div class="tc-role">Cliente, Lausanne</div></div></div><div class="tc-stars">★★★★★</div><div class="tc-quote">"En 3 mois, -8 kg. Le plan avec les vraies valeurs ANSES est bluffant. La liste de courses, c'est magique."</div><div class="tc-result">-8 kg en 3 mois</div></div>
    <div class="tc"><div class="tc-head"><div class="tc-av" style="background:#2a1a3a">LB</div><div><div class="tc-name">Lucas B.</div><div class="tc-role">Client, Zurich</div></div></div><div class="tc-stars">★★★★★</div><div class="tc-quote">"La seule app qui combine coach humain et IA. Elle s'installe sans store. Game changer absolu."</div><div class="tc-result">+6 kg de muscle</div></div>
  </div>
</div></div>

<div style="background:#060606"><div class="sec-wrap">
  <div class="sec-center"><div class="sec-tag">FAQ</div><div class="sec-title">TES QUESTIONS</div></div>
  <div class="faq-wrap">
    <div class="faq-item"><button class="faq-q" onclick="tf(0)">Comment fonctionne le paiement ?<span class="faq-plus" id="p0">+</span></button><div class="faq-a" id="f0">Paiement sécurisé via Stripe. CHF 30/mois, résiliable à tout moment. Aucun engagement.</div></div>
    <div class="faq-item"><button class="faq-q" onclick="tf(1)">Qu'est-ce qu'une PWA ?<span class="faq-plus" id="p1">+</span></button><div class="faq-a" id="f1">Aucun App Store requis. Installe depuis Safari ou Chrome en 2 secondes. Plein écran, notifications push.</div></div>
    <div class="faq-item"><button class="faq-q" onclick="tf(2)">L'IA remplace-t-elle mon coach ?<span class="faq-plus" id="p2">+</span></button><div class="faq-a" id="f2">Non, l'IA assiste ton coach humain. Il supervise et valide chaque plan.</div></div>
    <div class="faq-item"><button class="faq-q" onclick="tf(3)">Puis-je changer de coach ?<span class="faq-plus" id="p3">+</span></button><div class="faq-a" id="f3">Oui, à tout moment. Nouveau coach sous 24h, historique conservé.</div></div>
    <div class="faq-item"><button class="faq-q" onclick="tf(4)">Données sécurisées ?<span class="faq-plus" id="p4">+</span></button><div class="faq-a" id="f4">Données en Suisse via Supabase, chiffrées AES-256. RGPD total.</div></div>
  </div>
</div></div>

<div class="cta-sec">
  <div class="cta-orb"></div>
  <div class="cta-inner">
    <h2 class="cta-h">PRÊT À DEVENIR<br><em>LA MEILLEURE VERSION</em><br>DE TOI-MÊME ?</h2>
    <p class="cta-p">Rejoins 500+ athlètes qui ont transformé leur physique avec CoachPro.</p>
    <button class="btn-cta" id="btn-cta">🚀 Commencer maintenant — CHF 30/mois</button>
    <div class="cta-tiny">✓ Sans engagement · ✓ Résiliable · ✓ Support inclus</div>
  </div>
</div>

<div class="footer">
  <div class="footer-top">
    <div>
      <div class="footer-brand-logo"><div class="footer-brand-icon">⚡</div><div><div class="footer-brand-name">COACHPRO</div><div style="font-size:7.5px;letter-spacing:3px;color:var(--g);opacity:0.6;text-transform:uppercase">Elite Performance</div></div></div>
      <div class="footer-brand-desc">La plateforme de coaching fitness propulsée par l'IA.</div>
      <div class="footer-social"><div class="footer-soc-btn">𝕏</div><div class="footer-soc-btn">in</div><div class="footer-soc-btn">📷</div></div>
    </div>
    <div><div class="footer-col-title">Produit</div><div class="footer-col-links"><a href="#features">Fonctionnalités</a><a href="#pricing">Tarifs</a><a href="#">Pour les coachs</a><a href="#pwa">Installation PWA</a></div></div>
    <div><div class="footer-col-title">Légal</div><div class="footer-col-links"><a href="#">CGU</a><a href="#">Confidentialité</a><a href="#">Mentions légales</a><a href="#">RGPD</a></div></div>
    <div><div class="footer-col-title">Contact</div><div class="footer-col-links"><a href="mailto:contact@moovx.ch">contact@moovx.ch</a><a href="#">Support client</a><a href="#">Devenir coach</a></div></div>
  </div>
  <div class="footer-bottom">
    <div class="footer-copy">© 2026 CoachPro by MoovX · Genève, Suisse</div>
    <div class="footer-legal"><a href="#">CGU</a><a href="#">Confidentialité</a><a href="#">Cookies</a></div>
  </div>
</div>
`
