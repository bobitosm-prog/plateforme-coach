'use client'
import { useState, useEffect } from 'react'
import { Check, Crown, Sparkles } from 'lucide-react'

const GOLD = '#C9A84C'

interface PaywallProps {
  role: 'client' | 'coach'
  userId: string
  coachId?: string | null
  onSignOut: () => void
}

type Plan = { id: string; name: string; price: number; interval: string; features: string[]; badge?: string; savings?: string }

const CLIENT_PLANS: Plan[] = [
  { id: 'client_monthly', name: 'Mensuel', price: 10, interval: '/mois', features: ['Nutrition IA personnalisée', 'Programme training IA', 'Suivi progression', 'Calculateur BMR/TDEE'] },
  { id: 'client_yearly', name: 'Annuel', price: 80, interval: '/an', badge: 'Populaire', savings: 'Économise 33%', features: ['Tout le plan mensuel', 'Économie de 40 CHF/an', 'Accès prioritaire nouvelles fonctionnalités'] },
  { id: 'client_lifetime', name: 'À vie', price: 150, interval: '', badge: 'Meilleure offre', features: ['Accès permanent', 'Toutes les fonctionnalités', 'Mises à jour à vie', 'Zéro abonnement'] },
]

const COACH_PLANS: Plan[] = [
  { id: 'coach_monthly', name: 'Coach Pro', price: 50, interval: '/mois', features: ['Clients illimités', 'Plans IA pour chaque client', 'Calendrier & séances', 'Messagerie temps réel', 'Analytics revenus', 'Paiements Stripe'] },
]

const COACH_CLIENT_FEATURES = ['Plans nutrition IA illimités', 'Programme training personnalisé', 'Messagerie directe avec ton coach', 'Suivi progression complet', 'Toutes les fonctionnalités MoovX']

export default function Paywall({ role, userId, coachId, onSignOut }: PaywallProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [coachData, setCoachData] = useState<{ name: string; rate: number; id: string } | null>(null)

  // Check if client has a coach with a rate
  useEffect(() => {
    if (role !== 'client' || !coachId || coachId === 'platform') return
    fetch('/api/stripe/coach-checkout', { method: 'OPTIONS' }).catch(() => {})
    // Fetch coach info via a lightweight approach
    import('@supabase/ssr').then(({ createBrowserClient }) => {
      const sb = createBrowserClient(
        (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(),
        (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()
      )
      sb.from('profiles').select('full_name, coach_monthly_rate, stripe_account_id').eq('id', coachId).maybeSingle()
        .then(({ data }) => {
          if (data?.stripe_account_id) {
            setCoachData({ name: data.full_name || 'Ton coach', rate: data.coach_monthly_rate || 50, id: coachId })
          }
        })
    })
  }, [role, coachId])

  const plans = role === 'coach' ? COACH_PLANS : CLIENT_PLANS

  async function handleSelect(planId: string) {
    setLoading(planId)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: userId, planId, coachId: coachId || 'platform' }),
      })
      const { url } = await res.json()
      if (url) window.location.href = url
      else setLoading(null)
    } catch { setLoading(null) }
  }

  async function handleCoachCheckout() {
    if (!coachData) return
    setLoading('coach')
    try {
      const res = await fetch('/api/stripe/coach-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: userId, coachId: coachData.id }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else { alert('Erreur: ' + (data.error || 'Impossible de créer le paiement')); setLoading(null) }
    } catch { setLoading(null) }
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0A0A0A', padding: '2rem 1rem', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}} @keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}`}</style>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 40, animation: 'fadeUp 0.6s cubic-bezier(0.16,1,0.3,1)' }}>
        <div style={{ width: 64, height: 64, background: `linear-gradient(135deg,${GOLD},#F0D060)`, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 12px 40px rgba(201,168,76,0.2)' }}>
          {role === 'coach' ? <Crown size={30} color="#000" strokeWidth={2} /> : <Sparkles size={30} color="#000" strokeWidth={2} />}
        </div>
        <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(1.8rem,4vw,2.6rem)', letterSpacing: 3, color: '#F8FAFC', margin: '0 0 8px' }}>
          {role === 'coach' ? 'ACTIVE TON DASHBOARD' : 'CHOISIS TON PLAN'}
        </h1>
        <p style={{ color: '#555', fontSize: '0.9rem', fontWeight: 300, margin: 0 }}>
          {role === 'coach' ? 'Accède à ton espace coach et gère tes clients' : 'Commence ta transformation avec le Coach IA'}
        </p>
      </div>

      {/* Coach subscription card — shown to clients with a coach */}
      {coachData && role === 'client' && (
        <div style={{ maxWidth: 400, width: '100%', marginBottom: 32, animation: 'fadeUp 0.6s 0.1s cubic-bezier(0.16,1,0.3,1) both' }}>
          <div style={{ borderRadius: 24, padding: 2, background: `linear-gradient(135deg,${GOLD},#F0D060)` }}>
            <div style={{ background: '#111', borderRadius: 22, padding: '32px 28px', position: 'relative' }}>
              <span style={{ position: 'absolute', top: -1, right: 24, background: `linear-gradient(135deg,${GOLD},#F0D060)`, color: '#000', fontSize: '0.62rem', fontWeight: 700, padding: '4px 14px', borderRadius: '0 0 10px 10px', letterSpacing: 1, textTransform: 'uppercase' }}>Recommandé</span>
              <div style={{ fontSize: '0.7rem', letterSpacing: 3, textTransform: 'uppercase', color: GOLD, marginBottom: 12 }}>Coaching avec {coachData.name}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 16 }}>
                <span style={{ fontSize: '0.75rem', color: '#444', alignSelf: 'flex-start', marginTop: 16 }}>CHF</span>
                <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 64, lineHeight: 1, color: GOLD, letterSpacing: 1 }}>{coachData.rate}</span>
                <span style={{ color: '#444', fontSize: '0.85rem' }}>/mois</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
                {COACH_CLIENT_FEATURES.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Check size={14} color={GOLD} strokeWidth={2.5} style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: '0.82rem', color: '#888', fontWeight: 300 }}>{f}</span>
                  </div>
                ))}
              </div>
              <button onClick={handleCoachCheckout} disabled={loading !== null}
                style={{ width: '100%', padding: '15px 20px', borderRadius: 14, border: 'none', cursor: loading ? 'wait' : 'pointer', background: `linear-gradient(135deg,${GOLD},#F0D060)`, color: '#000', fontSize: '0.9rem', fontWeight: 700, fontFamily: "'DM Sans', sans-serif", boxShadow: '0 8px 32px rgba(201,168,76,0.25)', opacity: loading && loading !== 'coach' ? 0.5 : 1 }}>
                {loading === 'coach' ? 'Redirection...' : `S'abonner — CHF ${coachData.rate}/mois`}
              </button>
            </div>
          </div>
          <div style={{ textAlign: 'center', margin: '20px 0 0' }}>
            <span style={{ fontSize: '0.72rem', color: '#333' }}>ou choisis un plan sans coach :</span>
          </div>
        </div>
      )}

      {/* Plans */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', maxWidth: role === 'coach' ? 'min(400px, calc(100vw - 32px))' : 'min(960px, calc(100vw - 32px))', width: '100%' }}>
        {plans.map((plan, i) => {
          const isPopular = plan.badge === 'Populaire'
          const isBest = plan.badge === 'Meilleure offre'
          const isHighlight = isPopular || isBest
          return (
            <div key={plan.id} style={{
              flex: role === 'coach' ? '1 1 100%' : '1 1 280px', maxWidth: role === 'coach' ? 'min(400px, calc(100vw - 32px))' : 320,
              borderRadius: 24, padding: isHighlight ? '2px' : 0,
              background: isHighlight ? `linear-gradient(135deg,${GOLD},#F0D060)` : 'transparent',
              animation: `fadeUp 0.6s ${0.1 + i * 0.1}s cubic-bezier(0.16,1,0.3,1) both`,
            }}>
              <div style={{
                background: '#111', borderRadius: isHighlight ? 22 : 24, padding: '32px 28px',
                border: isHighlight ? 'none' : '1px solid #1a1a1a',
                display: 'flex', flexDirection: 'column', height: '100%', position: 'relative',
              }}>
                {/* Badge */}
                {plan.badge && (
                  <span style={{ position: 'absolute', top: -1, right: 24, background: isBest ? '#22C55E' : `linear-gradient(135deg,${GOLD},#F0D060)`, color: '#000', fontSize: '0.62rem', fontWeight: 700, padding: '4px 14px', borderRadius: '0 0 10px 10px', letterSpacing: 1, textTransform: 'uppercase' }}>
                    {plan.badge}
                  </span>
                )}

                <div style={{ fontSize: '0.7rem', letterSpacing: 3, textTransform: 'uppercase', color: isHighlight ? GOLD : '#555', marginBottom: 16, fontWeight: 400 }}>{plan.name}</div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 6 }}>
                  <span style={{ fontSize: '0.75rem', color: '#444', alignSelf: 'flex-start', marginTop: 16 }}>CHF</span>
                  <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 64, lineHeight: 1, color: isHighlight ? GOLD : '#F8FAFC', letterSpacing: 1 }}>{plan.price}</span>
                  {plan.interval && <span style={{ color: '#444', fontSize: '0.85rem' }}>{plan.interval}</span>}
                </div>

                {'savings' in plan && plan.savings && (
                  <div style={{ fontSize: '0.72rem', color: '#22C55E', fontWeight: 600, marginBottom: 12 }}>{plan.savings}</div>
                )}

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28, marginTop: 8 }}>
                  {plan.features.map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Check size={14} color={isHighlight ? GOLD : '#333'} strokeWidth={2.5} style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: '0.82rem', color: '#888', fontWeight: 300 }}>{f}</span>
                    </div>
                  ))}
                </div>

                <button onClick={() => handleSelect(plan.id)} disabled={loading !== null}
                  style={{
                    width: '100%', padding: '15px 20px', borderRadius: 14, border: 'none', cursor: loading ? 'wait' : 'pointer',
                    background: isHighlight ? `linear-gradient(135deg,${GOLD},#F0D060)` : '#1a1a1a',
                    color: isHighlight ? '#000' : '#888',
                    fontSize: '0.9rem', fontWeight: 700, fontFamily: "'DM Sans', sans-serif",
                    boxShadow: isHighlight ? '0 8px 32px rgba(201,168,76,0.25)' : 'none',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    opacity: loading && loading !== plan.id ? 0.5 : 1,
                  }}>
                  {loading === plan.id ? 'Redirection...' : plan.interval ? `Commencer — CHF ${plan.price}${plan.interval}` : `Payer CHF ${plan.price} — Accès à vie`}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', marginTop: 32, animation: 'fadeUp 0.6s 0.5s cubic-bezier(0.16,1,0.3,1) both' }}>
        <p style={{ color: '#333', fontSize: '0.72rem', margin: '0 0 16px' }}>Paiement sécurisé par Stripe · Résiliable à tout moment</p>
        <button onClick={onSignOut} style={{ background: 'none', border: 'none', color: '#333', fontSize: '0.78rem', cursor: 'pointer', textDecoration: 'underline', transition: 'color 0.2s' }}>
          Déconnexion
        </button>
      </div>
    </div>
  )
}
