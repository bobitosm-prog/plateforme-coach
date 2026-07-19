import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import CoachSectionFallback from '@/app/coach/components/sections/CoachSectionFallback'
import CoachSessionWheelPicker from '@/app/coach/components/sections/CoachSessionWheelPicker'

describe('coach page lazy section presentation', () => {
  it('renders a stable accessible fallback while a section chunk loads', () => {
    const html = renderToStaticMarkup(<CoachSectionFallback />)
    expect(html).toContain('aria-label="Chargement de la section"')
    expect(html).toContain('min-height:240px')
  })

  it('renders the session wheel options and its label with minimal data', () => {
    const html = renderToStaticMarkup(<CoachSessionWheelPicker label="Jour" items={['01', '02']} value="01" onChange={() => undefined} />)
    expect(html).toContain('Jour')
    expect(html).toContain('01')
    expect(html).toContain('02')
  })
})
