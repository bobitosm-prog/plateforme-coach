'use client'
import { useState } from 'react'
import { X } from 'lucide-react'
import {
  BG_CARD, BG_CARD_2, BG_BASE, BORDER, TEXT_MUTED, TEXT_PRIMARY, GOLD, GOLD_RULE,
  FONT_DISPLAY, FONT_ALT, FONT_BODY, RADIUS_CARD,
  ACTIVITY_LEVELS, calcMifflinStJeor, calcKatchMcArdle, calcHarrisBenedict,
} from '../../../lib/design-tokens'

interface BmrModalProps {
  supabase: any
  session: any
  initialValues: {
    weight: string
    height: string
    age: string
    gender: string
    activity: string
    body_fat: string
  }
  onClose: () => void
}

export default function BmrModal({ supabase, session, initialValues, onClose }: BmrModalProps) {
  const [bmrForm, setBmrForm] = useState(initialValues)
  const [bmrResult, setBmrResult] = useState<any>(null)

  function calculateBMR() {
    const w = parseFloat(bmrForm.weight)
    const h = parseFloat(bmrForm.height)
    const a = parseInt(bmrForm.age)
    const bf = parseFloat(bmrForm.body_fat)
    if (!w || !h || !a) return

    const mifflin = calcMifflinStJeor(w, h, a, bmrForm.gender)
    const harris = calcHarrisBenedict(w, h, a, bmrForm.gender)
    const katch = bf ? calcKatchMcArdle(w, bf) : null
    const actMult = ACTIVITY_LEVELS.find(l => l.id === bmrForm.activity)?.mult || 1.55
    const tdee = Math.round((katch || mifflin) * actMult)
    const fatLoss = Math.round(tdee * 0.8)
    const massGain = Math.round(tdee * 1.1)
    const protein = Math.round(w * 2.2)
    const proteinCal = protein * 4
    const fatCal = Math.round(tdee * 0.25)
    const fat = Math.round(fatCal / 9)
    const carbs = Math.round((tdee - proteinCal - fatCal) / 4)

    setBmrResult({ mifflin: Math.round(mifflin), harris: Math.round(harris), katch: katch ? Math.round(katch) : null, tdee, fatLoss, massGain, protein, fat, carbs })
    supabase.from('profiles').upsert({ id: session.user.id, current_weight: w, height: h, gender: bmrForm.gender, activity_level: bmrForm.activity, body_fat_pct: bf || null, calorie_goal: tdee })
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 50, overflowY: 'auto' }}>
      <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: `${RADIUS_CARD}px ${RADIUS_CARD}px 0 0`, padding: '24px 20px 40px', marginTop: 40, minHeight: '90vh' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: '1.4rem', fontWeight: 700, letterSpacing: '2px', margin: '0 0 2px', color: TEXT_PRIMARY }}>CALCULATEUR BMR</h3>
            <p style={{ fontSize: '0.7rem', color: TEXT_MUTED, margin: 0, fontFamily: FONT_BODY, fontWeight: 300 }}>Mifflin-St Jeor · Katch-McArdle · Harris-Benedict</p>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, background: BG_CARD_2, borderRadius: 0, border: `1px solid ${BORDER}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} color={TEXT_MUTED} /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          {[['weight', 'Poids', 'kg'], ['height', 'Taille', 'cm'], ['age', 'Âge', 'ans'], ['body_fat', '% Graisse (opt.)', '%']].map(([key, label, unit]) => (
            <div key={key} style={{ background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 0, padding: '10px 12px' }}>
              <div style={{ fontSize: 11, fontFamily: FONT_ALT, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_MUTED, marginBottom: 4 }}>{label}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input
                  type="number"
                  value={(bmrForm as any)[key]}
                  onChange={e => setBmrForm(p => ({ ...p, [key]: e.target.value }))}
                  placeholder="0"
                  style={{ background: 'transparent', color: GOLD, fontSize: '0.95rem', fontFamily: FONT_DISPLAY, fontWeight: 700, flex: 1, outline: 'none', border: 'none', width: '100%' }}
                />
                <span style={{ color: TEXT_MUTED, fontSize: '0.75rem', fontFamily: FONT_ALT }}>{unit}</span>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
          {[['male', 'Homme'], ['female', 'Femme']].map(([val, label]) => (
            <button key={val} onClick={() => setBmrForm(p => ({ ...p, gender: val }))}
              style={{ border: `1px solid ${bmrForm.gender === val ? GOLD : BORDER}`, background: bmrForm.gender === val ? `${GOLD}18` : BG_BASE, borderRadius: 0, padding: '12px', fontSize: '0.85rem', fontFamily: FONT_ALT, fontWeight: 700, color: bmrForm.gender === val ? GOLD : TEXT_MUTED, cursor: 'pointer', transition: 'all 200ms' }}>
              {label}
            </button>
          ))}
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontFamily: FONT_ALT, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_MUTED, marginBottom: 8 }}>Niveau d'activité</div>
          {ACTIVITY_LEVELS.map(l => (
            <button key={l.id} onClick={() => setBmrForm(p => ({ ...p, activity: l.id }))}
              style={{ width: '100%', border: `1px solid ${bmrForm.activity === l.id ? GOLD + '80' : BORDER}`, background: bmrForm.activity === l.id ? `${GOLD}10` : BG_BASE, borderRadius: 0, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, cursor: 'pointer', transition: 'all 200ms' }}>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.85rem', fontFamily: FONT_ALT, fontWeight: 700, color: bmrForm.activity === l.id ? GOLD : TEXT_PRIMARY }}>{l.label}</div>
                <div style={{ fontSize: '0.7rem', color: TEXT_MUTED, fontFamily: FONT_BODY, fontWeight: 300 }}>{l.sub}</div>
              </div>
              <span style={{ fontSize: '0.75rem', fontFamily: FONT_DISPLAY, fontWeight: 700, color: TEXT_MUTED }}>×{l.mult}</span>
            </button>
          ))}
        </div>
        <button onClick={calculateBMR} style={{ width: '100%', background: GOLD, color: '#050505', fontFamily: FONT_ALT, fontWeight: 800, padding: '16px', borderRadius: 0, border: 'none', cursor: 'pointer', fontSize: '1rem', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 20, clipPath: 'polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)' }}>Calculer mon TDEE</button>
        {bmrResult && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: BG_BASE, border: `1px solid ${GOLD_RULE}`, borderRadius: RADIUS_CARD, padding: 20 }}>
              <div style={{ fontSize: 11, fontFamily: FONT_ALT, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_MUTED, marginBottom: 4 }}>TDEE (Dépense Totale)</div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: '3rem', fontWeight: 700, color: GOLD, letterSpacing: '0.05em' }}>{bmrResult.tdee}</div>
              <div style={{ fontSize: '0.75rem', color: TEXT_MUTED, fontFamily: FONT_BODY, fontWeight: 300 }}>kcal / jour · Sauvegardé comme objectif</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {[['Mifflin', bmrResult.mifflin, false], ['Harris', bmrResult.harris, false], ['Katch', bmrResult.katch || '—', !!bmrResult.katch]].map(([n, v, hi]) => (
                <div key={n as string} style={{ background: BG_BASE, border: `1px solid ${hi ? GOLD_RULE : BORDER}`, borderRadius: RADIUS_CARD, padding: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, fontFamily: FONT_ALT, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_MUTED, marginBottom: 4 }}>{n}</div>
                  <div style={{ fontFamily: FONT_DISPLAY, fontSize: '1.4rem', fontWeight: 700, color: hi ? GOLD : TEXT_PRIMARY }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: 20 }}>
              <div style={{ fontSize: 11, fontFamily: FONT_ALT, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_MUTED, marginBottom: 12 }}>Objectifs Caloriques</div>
              {[['Perte de graisse', bmrResult.fatLoss, '-20%'], ['Maintenance', bmrResult.tdee, '0%'], ['Prise de masse', bmrResult.massGain, '+10%']].map(([label, val, pct]) => (
                <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${BORDER}` }}>
                  <span style={{ fontSize: '0.85rem', color: TEXT_MUTED, fontFamily: FONT_BODY }}>{label}</span>
                  <div>
                    <span style={{ fontFamily: FONT_DISPLAY, fontSize: '1.2rem', fontWeight: 700, color: GOLD }}>{val}</span>
                    <span style={{ fontSize: '0.75rem', color: TEXT_MUTED, marginLeft: 4, fontFamily: FONT_ALT }}>kcal</span>
                    <span style={{ fontSize: '0.7rem', color: TEXT_MUTED, marginLeft: 8, fontFamily: FONT_ALT }}>{pct}</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: RADIUS_CARD, padding: 20 }}>
              <div style={{ fontSize: 11, fontFamily: FONT_ALT, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_MUTED, marginBottom: 12 }}>Macros ({bmrResult.tdee} kcal)</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {[['Protéines', bmrResult.protein, 'g', GOLD], ['Glucides', bmrResult.carbs, 'g', GOLD], ['Lipides', bmrResult.fat, 'g', GOLD]].map(([n, v, u, c]) => (
                  <div key={n as string} style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: FONT_DISPLAY, fontSize: '2rem', fontWeight: 700, color: TEXT_PRIMARY }}>{v}</div>
                    <div style={{ fontSize: 11, fontFamily: FONT_ALT, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: c as string }}>{n}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
