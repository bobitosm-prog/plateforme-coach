'use client'
import { aiConsentCopy, aiLocale } from './consent-copy'

/** Native modal supplies focus trapping and blocks background interaction on iPhone too. */
export function showAiConsentDialog(): Promise<boolean> {
  const locale = aiLocale()
  const copy = aiConsentCopy[locale]
  return new Promise(resolve => {
    const previousFocus = document.activeElement as HTMLElement | null
    const dialog = document.createElement('dialog')
    dialog.setAttribute('aria-labelledby', 'moovx-ai-consent-title')
    dialog.setAttribute('aria-describedby', 'moovx-ai-consent-intro')
    dialog.style.cssText = 'position:fixed;inset:0;margin:auto;width:calc(100% - 24px);max-width:480px;max-height:calc(100dvh - 48px);box-sizing:border-box;overflow:auto;padding:24px;border:1px solid #645631;border-radius:24px;background:#1d1b17;color:#f7f4ec;font:16px/1.5 system-ui;overscroll-behavior:contain;'
    const style = document.createElement('style')
    style.textContent = 'dialog[data-ai-consent]::backdrop{background:rgba(0,0,0,.78)}dialog[data-ai-consent] button:focus-visible,dialog[data-ai-consent] a:focus-visible{outline:3px solid #e8c563;outline-offset:3px}'
    dialog.dataset.aiConsent = 'true'
    dialog.append(style)
    const heading = document.createElement('h2')
    heading.id = 'moovx-ai-consent-title'
    heading.textContent = copy.title
    heading.style.cssText = 'margin:0 0 12px;font-size:24px;color:#e8c563;line-height:1.2'
    dialog.append(heading)
    for (const [index, text] of [copy.intro, copy.data, copy.purpose, copy.choice].entries()) {
      const p = document.createElement('p')
      p.textContent = text
      p.style.margin = '0 0 14px'
      if (index === 0) p.id = 'moovx-ai-consent-intro'
      dialog.append(p)
    }
    for (const [label, href] of [[copy.privacy, `/${locale}/privacy`], [copy.provider, 'https://privacy.claude.com/']]) {
      const a = document.createElement('a')
      a.textContent = label
      a.href = href
      a.target = '_blank'
      a.rel = 'noopener noreferrer'
      a.style.cssText = 'display:block;color:#e8c563;margin:10px 0;text-decoration:underline;min-height:32px'
      dialog.append(a)
    }
    let finished = false
    const finish = (accepted: boolean) => {
      if (finished) return
      finished = true
      dialog.close()
      dialog.remove()
      previousFocus?.focus({ preventScroll: true })
      resolve(accepted)
    }
    for (const [label, accepted] of [[copy.accept, true], [copy.later, false]] as const) {
      const button = document.createElement('button')
      button.type = 'button'
      button.textContent = label
      button.style.cssText = `display:block;width:100%;min-height:48px;margin-top:12px;padding:12px;border-radius:14px;border:1px solid #e8c563;font:600 16px/1.4 system-ui;cursor:pointer;background:${accepted ? '#e8c563' : 'transparent'};color:${accepted ? '#15130d' : '#e8c563'}`
      button.onclick = () => finish(accepted)
      dialog.append(button)
    }
    dialog.addEventListener('cancel', event => { event.preventDefault(); finish(false) })
    document.body.append(dialog)
    dialog.showModal()
    // Start at the explanation, never with the positive choice preselected.
    heading.tabIndex = -1
    heading.focus()
  })
}
