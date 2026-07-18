import { Beef, Droplet, Droplets, Wheat } from 'lucide-react'

import { colors, fonts, mutedStyle, statSmallStyle, statStyle, subtitleStyle } from '@/lib/design-tokens'

export interface NutritionMacroTotals { kcal: number; protein: number; carbs: number; fat: number }

interface NutritionSummarySectionProps {
  consumed: NutritionMacroTotals
  targets: NutritionMacroTotals
  waterMl: number
  waterGoalMl: number
  canAddWater: boolean
  remainingLabel: string
  macroLabels: { protein: string; carbs: string; fat: string }
  water250Label: string
  water500Label: string
  onAddWater: (amountMl: number) => void
}

export function NutritionSummarySection(props: NutritionSummarySectionProps) {
  const { consumed, targets, waterMl, waterGoalMl, canAddWater, remainingLabel, macroLabels, water250Label, water500Label, onAddWater } = props
  const size = 180, stroke = 12, radius = (size - stroke) / 2, circumference = 2 * Math.PI * radius
  const caloriePct = Math.min(100, Math.round((consumed.kcal / targets.kcal) * 100))
  const waterPct = Math.min(100, Math.round((waterMl / waterGoalMl) * 100))
  const waterStroke = 10, waterRadius = radius - stroke - 5, waterCircumference = 2 * Math.PI * waterRadius
  return <>
    <style>{`@keyframes nutWaterPulse { 0%, 100% { filter: drop-shadow(0 0 4px rgba(111,183,232,0.4)); } 50% { filter: drop-shadow(0 0 9px rgba(111,183,232,0.85)); } }`}</style>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
      <div style={{ position: 'relative' }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <defs><linearGradient id="nutRingGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#E8C97A" /><stop offset="100%" stopColor="#D4A843" /></linearGradient><linearGradient id="nutWaterGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#6FB7E8" /><stop offset="100%" stopColor="#3D7EA6" /></linearGradient></defs>
          <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={colors.surfaceHigh} strokeWidth={stroke} />
          <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="url(#nutRingGrad)" strokeWidth={stroke} strokeDasharray={circumference} strokeDashoffset={circumference - caloriePct / 100 * circumference} style={{ transition: 'stroke-dashoffset 0.8s ease', filter: `drop-shadow(0 0 8px ${colors.goldRule})` }} />
          <circle cx={size/2} cy={size/2} r={waterRadius} fill="none" stroke={colors.surfaceHigh} strokeWidth={waterStroke} />
          <circle cx={size/2} cy={size/2} r={waterRadius} fill="none" stroke="url(#nutWaterGrad)" strokeWidth={waterStroke} strokeDasharray={waterCircumference} strokeDashoffset={waterCircumference - waterPct / 100 * waterCircumference} style={{ transition: 'stroke-dashoffset 0.8s ease', animation: 'nutWaterPulse 2.5s ease-in-out infinite' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}><span style={{ ...statStyle, fontSize: 40, color: colors.gold, lineHeight: 1 }}>{consumed.kcal}</span><span style={{ ...mutedStyle, fontSize: 11 }}>/ {targets.kcal} kcal</span><span style={{ ...mutedStyle, fontSize: 10, marginTop: 2 }}>{remainingLabel}</span></div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12 }}><Droplets size={15} color="#6FB7E8" /><span style={{ fontFamily: fonts.headline, fontSize: 15, color: '#6FB7E8' }}>{(waterMl/1000).toFixed(1)}L <span style={{ ...mutedStyle, fontSize: 11 }}>/ {(waterGoalMl/1000).toFixed(1)}L · {waterPct}%</span></span></div>
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>{[[250, water250Label], [500, water500Label]].map(([amount, label]) => <button key={amount} onClick={() => canAddWater && onAddWater(Number(amount))} disabled={!canAddWater} style={{ flex: 1, padding: '8px 12px', borderRadius: 10, background: 'rgba(111,183,232,0.12)', border: 'none', color: '#6FB7E8', fontFamily: fonts.alt, fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: canAddWater ? 'pointer' : 'not-allowed', opacity: canAddWater ? 1 : 0.4 }}>{label}</button>)}</div>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
      {[
        { label: macroLabels.protein, current: consumed.protein, target: targets.protein, color: colors.gold, icon: Beef },
        { label: macroLabels.carbs, current: consumed.carbs, target: targets.carbs, color: colors.blue, icon: Wheat },
        { label: macroLabels.fat, current: consumed.fat, target: targets.fat, color: colors.orange, icon: Droplet },
      ].map(({ label, current, target, color, icon: Icon }) => <div key={label} style={{ textAlign: 'center' }}><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 4 }}><Icon size={12} color={color} /><span style={{ ...subtitleStyle, fontSize: 10, letterSpacing: '0.1em' }}>{label}</span></div><div style={{ ...statSmallStyle, color }}>{Math.round(current)}<span style={{ fontSize: 12, color: colors.textMuted }}>/{target}g</span></div><div style={{ height: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 12, overflow: 'hidden', marginTop: 4 }}><div style={{ height: '100%', background: color, width: `${Math.min(100, Math.round(current / target * 100))}%`, borderRadius: 12 }} /></div></div>)}
    </div>
  </>
}
