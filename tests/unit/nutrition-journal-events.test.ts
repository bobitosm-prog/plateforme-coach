// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { notifyNutritionJournalRefreshed, subscribeNutritionJournal } from '@/lib/nutrition/journal-events'

describe('journal invalidation', () => {
  it('refreshes another mounted consumer after each journal read, only for the same user', () => {
    const home = vi.fn()
    const unsubscribe = subscribeNutritionJournal('audit', home)
    notifyNutritionJournalRefreshed('someone-else')
    expect(home).not.toHaveBeenCalled()
    notifyNutritionJournalRefreshed('audit')
    notifyNutritionJournalRefreshed('audit')
    expect(home).toHaveBeenCalledTimes(2)
    unsubscribe()
    notifyNutritionJournalRefreshed('audit')
    expect(home).toHaveBeenCalledTimes(2)
  })
})
