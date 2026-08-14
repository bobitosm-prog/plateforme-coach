import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { CampaignDialog } from '../../app/admin/campaigns/_components/CampaignDialog'

describe('admin Modal consumer contract', () => {
  it('preserves the campaign creation form and its accessible dialog shell', () => {
    const html = renderToStaticMarkup(
      <CampaignDialog
        open
        mode="create"
        campaign={null}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    expect(html).toContain('role="dialog"')
    expect(html).toContain('aria-modal="true"')
    expect(html).toContain('Nouvelle campagne')
    expect(html).toContain('placeholder="Ex: Beta Geneve Juin 2026"')
    expect(html).toContain('value=""')
    expect(html).toContain('value="60"')
    expect(html).toContain('value="20"')
    expect(html).toContain('Annuler')
    expect(html).toContain('Creer')
  })
})
