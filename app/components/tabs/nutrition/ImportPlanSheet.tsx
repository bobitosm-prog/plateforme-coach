'use client'
import { colors, fonts } from '../../../../lib/design-tokens'
import type { Food } from '../../../../lib/meal-plan'

interface Props {
  mealLabel: string
  foods: Food[]
  isInvited?: boolean
  onImport: () => void
  onClose: () => void
}

export default function ImportPlanSheet({ mealLabel, foods, isInvited, onImport, onClose }: Props) {
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1100 }} onClick={onClose} />
      <div onClick={e => e.stopPropagation()} style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1200, background: colors.surface2, border: `1px solid ${colors.divider}`, borderBottom: 'none', borderRadius: '20px 20px 0 0', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 8px', flexShrink: 0 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: colors.goldRule }} />
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
          <h3 style={{ fontFamily: fonts.headline, fontSize: 22, letterSpacing: 2, color: colors.text, margin: '0 0 4px' }}>{isInvited ? 'IMPORTER DU PLAN' : 'IMPORTER LE PLAN IA'}</h3>
          <p style={{ fontFamily: fonts.body, fontSize: 14, color: colors.textMuted, margin: '0 0 16px' }}>Ajouter les aliments recommandes pour {mealLabel} ?</p>
          {foods.map((f, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: i < foods.length - 1 ? `1px solid ${colors.divider}` : 'none' }}>
              <div>
                <div style={{ fontFamily: fonts.body, fontSize: 14, color: colors.text, fontWeight: 500 }}>{f.name}</div>
                <div style={{ fontFamily: fonts.body, fontSize: 12, color: colors.textMuted }}>{f.qty}g</div>
              </div>
              <span style={{ fontFamily: fonts.headline, fontSize: 16, color: colors.gold, letterSpacing: 1 }}>{f.kcal} KCAL</span>
            </div>
          ))}
        </div>
        <div style={{ padding: '16px 20px', paddingBottom: 'calc(env(safe-area-inset-bottom, 20px) + 80px)', borderTop: `1px solid ${colors.divider}`, background: colors.surface2, display: 'flex', gap: 12, flexShrink: 0 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 14, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: colors.gold, fontFamily: fonts.alt, fontSize: 14, fontWeight: 700, letterSpacing: 2, cursor: 'pointer', textTransform: 'uppercase' as const }}>ANNULER</button>
          <button onClick={onImport} style={{ flex: 1, padding: 14, border: 'none', background: 'linear-gradient(135deg, #E8C97A, #D4A843, #C9A84C, #8B6914)', borderRadius: 12, color: '#0D0B08', fontFamily: fonts.alt, fontSize: 14, fontWeight: 700, letterSpacing: 2, cursor: 'pointer', textTransform: 'uppercase' as const, boxShadow: '0 4px 20px rgba(212,168,67,0.2)' }}>IMPORTER</button>
        </div>
      </div>
    </>
  )
}
