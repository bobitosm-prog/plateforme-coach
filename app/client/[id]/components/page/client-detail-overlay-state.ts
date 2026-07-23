import type { ClientProgramTemplate } from './client-detail-page-types'

export type ClientDetailOverlayState = {
  readonly editOpen: boolean
  readonly showExDbModal: boolean
  readonly showAiModal: boolean
  readonly toast: string | null
}

export function hasOpenClientDetailOverlay(
  detail: ClientDetailOverlayState,
  pendingTemplate: ClientProgramTemplate | null,
) {
  return Boolean(
    detail.editOpen
    || detail.showExDbModal
    || detail.showAiModal
    || detail.toast
    || pendingTemplate,
  )
}
