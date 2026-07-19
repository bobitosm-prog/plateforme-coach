import { Download } from 'lucide-react'
import { colors, fonts, radii } from '../../../../lib/design-tokens'
import type { ProgressTranslate } from './progress-tab-types'

export function ProgressExportButton({ visible, onExport, t }: { readonly visible: boolean; readonly onExport: () => void; readonly t: ProgressTranslate }) {
  if (!visible) return null
  return <button onClick={onExport} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: 14, borderRadius: radii.button, background: 'transparent', border: `1px solid ${colors.goldBorder}`, color: colors.textMuted, fontFamily: fonts.headline, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', cursor: 'pointer', textTransform: 'uppercase' }}><Download size={14} /> {t('tab.exportData')}</button>
}
