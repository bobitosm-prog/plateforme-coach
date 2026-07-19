import { Sparkles, X } from 'lucide-react'
import { format, type Locale } from 'date-fns'
import { RailOverlay } from '../../ui/RailOverlay'
import { colors, fonts } from '../../../../lib/design-tokens'
import type { Alignment } from '../../../../lib/photo-align'
import type { ProgressPhoto, ProgressTranslate } from './progress-tab-types'

export function ProgressPhotoCompareOverlay({ open, photos, indices, signedUrls, slider, alignment, aligning, error, dateLocale, onClose, onAlign, onReset, onIndicesChange, onSliderChange, t }: {
  readonly open: boolean; readonly photos: readonly ProgressPhoto[]; readonly indices: readonly [number, number]; readonly signedUrls: Readonly<Record<string, string>>; readonly slider: number; readonly alignment: { readonly before: Alignment; readonly after: Alignment } | null; readonly aligning: boolean; readonly error: string | null; readonly dateLocale: Locale; readonly onClose: () => void; readonly onAlign: () => void; readonly onReset: () => void; readonly onIndicesChange: (indices: [number, number]) => void; readonly onSliderChange: (value: number) => void; readonly t: ProgressTranslate
}) {
  if (!open || photos.length < 2) return null
  const before = photos[indices[0]], after = photos[indices[1]]
  if (!before || !after) return null
  const beforeUrl = signedUrls[before.id] ?? '', afterUrl = signedUrls[after.id] ?? ''
  const transform = alignment ? `scale(${alignment.after.zoom}) translate(${alignment.after.x}%, ${alignment.after.y}%)` : 'none'
  return <RailOverlay><div data-no-tab-swipe="true" style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px' }}><div><span style={{ color: colors.error }}>{t('tab.before')} : {date(before, dateLocale)}</span> <span style={{ color: colors.success }}>{t('tab.after')} : {date(after, dateLocale)}</span></div><div><button onClick={onAlign} disabled={aligning}><Sparkles size={12} />{aligning ? t('tab.analyzingShort') : 'ALIGNER'}</button>{alignment && <button onClick={onReset}>RESET</button>}<button onClick={onClose}><X size={16} /></button></div></div>
    {error && <div style={{ color: colors.error, textAlign: 'center' }}>{error}</div>}
    <div style={{ display: 'flex', gap: 8, padding: '8px 16px' }}>{[0, 1].map(index => <select key={index} value={indices[index]} onChange={event => { const next: [number, number] = [...indices]; next[index] = Number(event.target.value); onIndicesChange(next) }} style={{ flex: 1, background: '#111', color: '#fff' }}>{photos.map((photo, photoIndex) => <option key={photo.id} value={photoIndex}>{date(photo, dateLocale) || `Photo ${photoIndex + 1}`}</option>)}</select>)}</div>
    <div style={{ flex: 1, position: 'relative', overflow: 'hidden', fontFamily: fonts.body }}><img src={afterUrl} alt="Apres" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', transform }} /><img src={beforeUrl} alt="Avant" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', clipPath: `inset(0 ${100 - slider}% 0 0)` }} /><div style={{ position: 'absolute', left: `${slider}%`, top: 0, bottom: 0, width: 2, background: colors.gold }} /><input type="range" min={0} max={100} value={slider} onChange={event => onSliderChange(Number(event.target.value))} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0 }} /><div style={{ position: 'absolute', bottom: 12, left: 12 }}>AVANT</div><div style={{ position: 'absolute', bottom: 12, right: 12 }}>APRES</div></div>
  </div></RailOverlay>
}

function date(photo: ProgressPhoto, locale: Locale) { return photo.date ? format(new Date(photo.date), 'd MMM yyyy', { locale }) : '' }
