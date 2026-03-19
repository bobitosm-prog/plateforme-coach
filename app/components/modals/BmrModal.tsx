'use client'
import { useState } from 'react'
import { X } from 'lucide-react'
import {
  BG_CARD, BG_BASE, BORDER, TEXT_MUTED, TEXT_PRIMARY, ORANGE,
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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 50, overflowY: 'auto' }}>
      <div style={{ background: BG_CARD, borderRadius: '24px 24px 0 0', padding: '24px 20px 40px', marginTop: 40, minHeight: '90vh' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.4rem', fontWeight: 700, letterSpacing: '0.06em', margin: '0 0 2px' }}>CALCULATEUR BMR</h3>
            <p style={{ fontSize: '0.7rem', color: TEXT_MUTED, margin: 0 }}>Mifflin-St Jeor · Katch-McArdle · Harris-Benedict</p>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, background: '#2A2A2A', borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} color={TEXT_MUTED} /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          {[['weight', 'Poids', 'kg'], ['height', 'Taille', 'cm'], ['age', 'Âge', 'ans'], ['body_fat', '% Graisse (opt.)', '%']].map(([key, label, unit]) => (
            <div key={key} style={{ background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '10px 12px' }}>
              <div style={{ fontSize: '0.65rem', color: TEXT_MUTED, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input
                  type="number"
                  value={(bmrForm as any)[key]}
                  onChange={e => setBmrForm(p => ({ ...p, [key]: e.target.value }))}
                  placeholder="0"
                  style={{ background: 'transparent', color: TEXT_PRIMARY, fontSize: '0.95rem', fontWeight: 700, flex: 1, outline: 'none', border: 'none', width: '100%' }}
                />
                <span style={{ color: TEXT_MUTED, fontSize: '0.75rem' }}>{unit}</span>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
          {[['male', 'Homme'], ['female', 'Femme']].map(([val, label]) => (
            <button key={val} onClick={() => setBmrForm(p => ({ ...p, gender: val }))}
              style={{ border: `1px solid ${bmrForm.gender === val ? ORANGE : BORDER}`, background: bmrForm.gender === val ? `${ORANGE}18` : BG_BASE, borderRadius: 12, padding: '12px', fontSize: '0.85rem', fontWeight: 700, color: bmrForm.gender === val ? ORANGE : TEXT_MUTED, cursor: 'pointer', transition: 'all 200ms' }}>
              {label}
            </button>
          ))}
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: '0.65rem', color: TEXT_MUTED, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>Niveau d'activité</div>
          {ACTIVITY_LEVELS.map(l => (
            <button key={l.id} onClick={() => setBmrForm(p => ({ ...p, activity: l.id }))}
              style={{ width: '100%', border: `1px solid ${bmrForm.activity === l.id ? ORANGE + '80' : BORDER}`, background: bmrForm.activity === l.id ? `${ORANGE}10` : BG_BASE, borderRadius: 12, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, cursor: 'pointer', transition: 'all 200ms' }}>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: bmrForm.activity === l.id ? ORANGE : TEXT_PRIMARY }}>{l.label}</div>
                <div style={{ fontSize: '0.7rem', color: TEXT_MUTED }}>{l.sub}</div>
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: TEXT_MUTED }}>×{l.mult}</span>
            </button>
          ))}
        </div>
        <button onClick={calculateBMR} style={{ width: '100%', background: ORANGE, color: '#000', fontWeight: 700, padding: '16px', borderRadius: 14, border: 'none', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1rem', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 20 }}>Calculer mon TDEE</button>
        {bmrResult && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: BG_BASE, border: `1px solid ${ORANGE}30`, borderRadius: 16, padding: 20 }}>
              <div style={{ fontSize: '0.7rem', color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>TDEE (Dépense Totale)</div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '3rem', fontWeight: 700, color: ORANGE, letterSpacing: '0.05em' }}>{bmrResult.tdee}</div>
              <div style={{ fontSize: '0.75rem', color: TEXT_MUTED }}>kcal / jour · Sauvegardé comme objectif</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {[['Mifflin', bmrResult.mifflin, false], ['Harris', bmrResult.harris, false], ['Katch', bmrResult.katch || '—', !!bmrResult.katch]].map(([n, v, hi]) => (
                <div key={n as string} style={{ background: BG_BASE, border: `1px solid ${hi ? ORANGE + '30' : BORDER}`, borderRadius: 14, padding: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: '0.65rem', color: TEXT_MUTED, textTransform: 'uppercase', marginBottom: 4 }}>{n}</div>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.4rem', fontWeight: 700, color: hi ? ORANGE : TEXT_PRIMARY }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20 }}>
              <div style={{ fontSize: '0.65rem', color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Objectifs Caloriques</div>
              {[['Perte de graisse', bmrResult.fatLoss, '-20%'], ['Maintenance', bmrResult.tdee, '0%'], ['Prise de masse', bmrResult.massGain, '+10%']].map(([label, val, pct]) => (
                <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${BORDER}` }}>
                  <span style={{ fontSize: '0.85rem', color: TEXT_MUTED }}>{label}</span>
                  <div>
                    <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.2rem', fontWeight: 700, color: TEXT_PRIMARY }}>{val}</span>
                    <span style={{ fontSize: '0.75rem', color: TEXT_MUTED, marginLeft: 4 }}>kcal</span>
                    <span style={{ fontSize: '0.7rem', color: TEXT_MUTED, marginLeft: 8 }}>{pct}</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20 }}>
              <div style={{ fontSize: '0.65rem', color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Macros ({bmrResult.tdee} kcal)</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {[['Protéines', bmrResult.protein, 'g', '#3b82f6'], ['Glucides', bmrResult.carbs, 'g', ORANGE], ['Lipides', bmrResult.fat, 'g', '#10b981']].map(([n, v, u, c]) => (
                  <div key={n as string} style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '2rem', fontWeight: 700, color: TEXT_PRIMARY }}>{v}</div>
                    <div style={{ fontSize: '0.65rem', color: c as string, fontWeight: 700, textTransform: 'uppercase' }}>{n}</div>
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
