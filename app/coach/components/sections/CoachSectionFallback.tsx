import { BG_BASE, BORDER, GOLD } from '@/lib/design-tokens'

export default function CoachSectionFallback() {
  return <div aria-label="Chargement de la section" style={{ minHeight: 240, display: 'grid', placeItems: 'center', background: BG_BASE }}><div style={{ width: 28, height: 28, border: `3px solid ${BORDER}`, borderTopColor: GOLD, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /></div>
}
