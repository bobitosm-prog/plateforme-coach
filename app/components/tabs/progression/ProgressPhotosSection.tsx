import { Camera, ChevronRight } from 'lucide-react'
import { colors, fonts, cardStyle, mutedStyle, radii } from '../../../../lib/design-tokens'
import SectionTitle from '../../ui/SectionTitle'
import type { ProgressPhoto, ProgressTranslate } from './progress-tab-types'

export function ProgressPhotosSection({ photos, signedUrls, onAdd, onCompare, t }: {
  readonly photos: readonly ProgressPhoto[]; readonly signedUrls: Readonly<Record<string, string>>; readonly onAdd: () => void; readonly onCompare: () => void; readonly t: ProgressTranslate
}) {
  const compared = photos.length >= 2 ? [photos.at(-1), photos[0]] : []
  return <>
    <SectionTitle noPadding title={t('tab.transformation')} trailing="PHOTOS" />
    <div style={{ ...cardStyle, padding: 16, marginBottom: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        {(compared.length ? compared : ['AVANT', 'APRÈS']).map((item, index) => {
          const photo = typeof item === 'string' ? null : item
          const label = index === 0 ? 'AVANT' : 'APRÈS'
          const url = photo ? signedUrls[photo.id] : ''
          return <div key={photo?.id ?? label} onClick={photo ? undefined : onAdd} style={{ aspectRatio: '3/4', borderRadius: radii.card, overflow: 'hidden', position: 'relative', border: `${photo ? 1 : 2}px ${photo ? 'solid' : 'dashed'} ${colors.goldBorder}`, background: photo ? colors.background : colors.goldDim, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: photo ? 'default' : 'pointer' }}>
            {url ? <img src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={label} /> : <Camera size={photo ? 24 : 20} color={colors.textMuted} />}
            <div style={{ position: 'absolute', bottom: 8, left: 8, padding: '2px 8px', borderRadius: 4, background: photo ? (index === 0 ? 'rgba(239,68,68,0.7)' : 'rgba(34,197,94,0.7)') : 'transparent', fontFamily: fonts.headline, fontSize: 8, fontWeight: 700, color: photo ? '#fff' : colors.textDim, letterSpacing: '0.1em' }}>{label}</div>
          </div>
        })}
      </div>
      {photos.length >= 2 && <button onClick={onCompare} style={{ width: '100%', padding: 10, borderRadius: radii.button, border: `1px solid ${colors.goldRule}`, background: colors.goldDim, cursor: 'pointer' }}><span style={{ fontFamily: fonts.headline, fontSize: 10, fontWeight: 700, color: colors.gold, letterSpacing: '0.08em' }}>COMPARER AVANT / APRÈS</span></button>}
    </div>
    <button onClick={onAdd} style={{ ...cardStyle, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14, width: '100%', cursor: 'pointer', border: `1px solid ${colors.goldBorder}`, marginBottom: 24 }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: `${colors.gold}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Camera size={20} color={colors.gold} /></div>
      <div style={{ flex: 1, textAlign: 'left' }}><div style={{ fontFamily: fonts.headline, fontSize: 13, fontWeight: 700, color: colors.text }}>{t('photos.addPhoto')}</div><div style={{ ...mutedStyle, fontSize: 10 }}>{t('tab.photoProgress')}</div></div>
      <ChevronRight size={16} color={colors.textDim} />
    </button>
  </>
}
