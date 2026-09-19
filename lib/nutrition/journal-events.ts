/** Same-page invalidation only: no food or health data in the event payload. */
const EVENT = 'moovx:nutrition-journal-refreshed'

export function notifyNutritionJournalRefreshed(userId: string): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(EVENT, { detail: { userId } }))
}

export function subscribeNutritionJournal(userId: string, refresh: () => void): () => void {
  const listener = (event: Event) => {
    if ((event as CustomEvent).detail?.userId === userId) refresh()
  }
  window.addEventListener(EVENT, listener)
  return () => window.removeEventListener(EVENT, listener)
}
