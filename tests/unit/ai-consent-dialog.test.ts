// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { showAiConsentDialog } from '@/lib/ai/consent-dialog'
beforeEach(() => {
  document.body.innerHTML = '<button id="launch">Athena</button>'
  document.documentElement.lang = 'fr'
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) { this.open = true })
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) { this.open = false })
})
describe('consent dialog interaction', () => {
  it('shows the provider, data, purpose, choice, and correct privacy links', async () => {
    const result = showAiConsentDialog()
    const modal = document.querySelector('dialog')!
    expect(modal.open).toBe(true)
    expect(modal.textContent).toContain('Anthropic')
    expect(modal.textContent).toContain('santé')
    expect(modal.textContent).toContain('manuelles')
    expect(modal.querySelector('a')?.getAttribute('href')).toBe('/fr/privacy')
    expect(document.activeElement?.tagName).toBe('H2')
    ;(modal.querySelector('button') as HTMLButtonElement).click()
    expect(await result).toBe(true); expect(document.querySelector('dialog')).toBeNull()
  })
  it('Escape refuses, removes the overlay, and returns focus', async () => {
    const launch = document.getElementById('launch')!; launch.focus()
    const result = showAiConsentDialog()
    document.querySelector('dialog')!.dispatchEvent(new Event('cancel', { cancelable: true }))
    expect(await result).toBe(false)
    expect(document.activeElement).toBe(launch)
    expect(document.querySelector('dialog')).toBeNull()
  })
  it.each(['en', 'de'])('localizes the explanation and both actions in %s', async locale => {
    document.documentElement.lang = locale
    const result = showAiConsentDialog()
    const modal = document.querySelector('dialog')!
    expect(modal.querySelectorAll('button')).toHaveLength(2)
    ;(modal.querySelectorAll('button')[1] as HTMLButtonElement).click()
    expect(await result).toBe(false)
  })
})
