'use client'
import { BG_CARD, BORDER, GOLD, GOLD_DIM, GOLD_RULE, GOLD_BORDER_STRONG, TEXT_PRIMARY, TEXT_MUTED, FONT_DISPLAY, FONT_BODY } from '../../../../lib/design-tokens'

interface Props {
  mealLabel: string
  foods: any[]
  onImport: () => void
  onClose: () => void
}

export default function ImportPlanSheet({ mealLabel, foods, onImport, onClose }: Props) {
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1100 }} onClick={onClose} />
      <div onClick={e => e.stopPropagation()} style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1200, background: BG_CARD, border: `1px solid ${BORDER}`, borderBottom: 'none', borderRadius: '20px 20px 0 0', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 8px', flexShrink: 0 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: GOLD_RULE }} />
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
          <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 22, letterSpacing: 2, color: TEXT_PRIMARY, margin: '0 0 4px' }}>IMPORTER LE PLAN IA</h3>
          <p style={{ fontFamily: FONT_BODY, fontSize: 14, color: TEXT_MUTED, margin: '0 0 16px' }}>Ajouter les aliments recommandes pour {mealLabel} ?</p>
          {foods.map((f: any, i: number) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: i < foods.length - 1 ? `1px solid ${GOLD_DIM}` : 'none' }}>
              <div>
                <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: TEXT_PRIMARY, fontWeight: 500 }}>{f.aliment}</div>
                <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: TEXT_MUTED }}>{f.quantite_g}g</div>
              </div>
              <span style={{ fontFamily: FONT_DISPLAY, fontSize: 16, color: GOLD, letterSpacing: 1 }}>{f.kcal} KCAL</span>
            </div>
          ))}
        </div>
        <div style={{ padding: '16px 20px', paddingBottom: 'calc(env(safe-area-inset-bottom, 20px) + 80px)', borderTop: `1px solid ${GOLD_DIM}`, background: BG_CARD, display: 'flex', gap: 12, flexShrink: 0 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 14, background: 'transparent', border: `1.5px solid ${GOLD_BORDER_STRONG}`, borderRadius: 12, color: GOLD, fontFamily: FONT_DISPLAY, fontSize: 16, letterSpacing: 2, cursor: 'pointer' }}>ANNULER</button>
          <button onClick={onImport} style={{ flex: 1, padding: 14, border: 'none', background: 'linear-gradient(135deg, #E8C97A, #D4A843, #C9A84C, #8B6914)', borderRadius: 12, color: '#0D0B08', fontFamily: FONT_DISPLAY, fontSize: 16, letterSpacing: 2, cursor: 'pointer', boxShadow: '0 4px 20px rgba(212,168,67,0.2)' }}>IMPORTER</button>
        </div>
      </div>
    </>
  )
}
