'use client'
import { useState, type ReactNode } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Heart, Flame, ChevronLeft, ChevronRight, X, Check } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import type { NutritionViewModel } from '@/lib/nutrition/nutrition-dashboard-model'
import { nutritionWeek } from '@/lib/nutrition/nutrition-week'
import { addNutritionDays } from '@/lib/nutrition/nutrition-date'
import { energyTotal } from '@/lib/health/daily-energy'
import { useDailyEnergy } from '@/app/hooks/useDailyEnergy'
import { RailOverlay } from '../ui/RailOverlay'
import homeStyles from '../home-v2/HomeV2.module.css'
import styles from './NutritionOverview.module.css'
export type NutritionPageTab = 'today' | 'plan' | 'meals' | 'recipes'
interface Props {
  userId: string
  recipesEnabled?: boolean
  model: NutritionViewModel
  selectedDate: string
  onDateChange: (date: string) => void
  historyStart: string
  mealCounts: Record<string, number>
  tab: NutritionPageTab
  onTabChange: (tab: NutritionPageTab) => void
  onRetry: () => void
  children: ReactNode
}
export default function NutritionOverview({
  userId,
  recipesEnabled = true,
  model,
  selectedDate,
  onDateChange,
  historyStart,
  mealCounts,
  tab,
  onTabChange,
  onRetry,
  children,
}: Props) {
  const t = useTranslations('nutrition_overview'),
    nt = useTranslations('nutrition_tab'),
    ht = useTranslations('daily_energy'),
    locale = useLocale()
  const [healthOpen, setHealthOpen] = useState(false)
  const health = useDailyEnergy(userId, selectedDate)
  const dates = nutritionWeek(selectedDate),
    today = model.day.localDateKey
  const format = (n: number | null | undefined) =>
    typeof n === 'number' && Number.isFinite(n)
      ? new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(n)
      : '—'
  const dayLabel = (d: string, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' }).format(
      new Date(d + 'T12:00:00Z'),
    )
  const consumed = ['ready', 'empty'].includes(model.consumed.state)
    ? model.consumed.data
    : null
  const total = health.data ? energyTotal(health.data) : null
  const difference =
    consumed && total !== null ? consumed.calories - total : null
  const connected = health.data?.status === 'ready'
  const scale = Math.max(consumed?.calories ?? 0, total ?? 0, 1)
  const tabs: { id: NutritionPageTab; label: string }[] = [
    { id: 'today', label: t('journal') },
    { id: 'plan', label: t('plan') },
    { id: 'meals', label: nt('v2.tools.savedMeals') },
    { id: 'recipes', label: nt('v2.tools.recipes') },
  ]
  function changeWeek(offset: number) {
    const start = addNutritionDays(dates[0], offset)
    onDateChange(
      start < historyStart ? historyStart : start > today ? today : start,
    )
  }
  return (
    <section className={styles.page} data-nutrition-v2>
      <header className={styles.header}>
        <h1 className={homeStyles.title}>
          {t('titleLead')} <br />
          <em>{t('titleAccent')}</em>
        </h1>
        <button
          className={styles.healthButton}
          onClick={() => setHealthOpen(true)}
        >
          <Heart size={21} aria-hidden="true" />
          <span>{t(connected ? 'healthConnected' : 'healthConnect')}</span>
        </button>
      </header>
      <div className={styles.dateRow}>
        <label className={styles.dateLabel}>
          {dayLabel(selectedDate, {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
          {selectedDate === today ? ' · ' + t('today') : ''}
          <input
            type="date"
            aria-label={t('chooseDate')}
            value={selectedDate}
            min={historyStart}
            max={today}
            onChange={(e) => {
              const value = e.target.value
              if (value >= historyStart && value <= today) onDateChange(value)
            }}
          />
        </label>
        <div className={styles.weekControls}>
          <button
            aria-label={t('previousWeek')}
            disabled={dates[0] <= historyStart}
            onClick={() => changeWeek(-7)}
          >
            <ChevronLeft size={17} />
          </button>
          <button
            aria-label={t('nextWeek')}
            disabled={dates[6] >= today}
            onClick={() => changeWeek(7)}
          >
            <ChevronRight size={17} />
          </button>
        </div>
      </div>
      <div className={styles.week} role="group" aria-label={t('calendar')}>
        {dates.map((date) => {
          const count = mealCounts[date] ?? 0
          const available = !model.loading && !model.errors.dailyLogs
          return (
            <button
              key={date}
              className={styles.day}
              disabled={date < historyStart || date > today}
              aria-pressed={date === selectedDate}
              aria-label={`${dayLabel(date, { weekday: 'long', day: 'numeric', month: 'long' })} · ${t(!available ? 'loading' : count >= 4 ? 'complete' : count ? 'partial' : 'empty')}`}
              onClick={() => onDateChange(date)}
            >
              <span>
                {dayLabel(date, { weekday: 'short' }).replace('.', '')}
              </span>
              <strong>{Number(date.slice(-2))}</strong>
              <span className={styles.dayStatus}>
                {date > today ? (
                  '·'
                ) : !available ? (
                  '—'
                ) : count >= 4 ? (
                  <Check size={17} aria-hidden="true" />
                ) : count ? (
                  '◐'
                ) : (
                  '○'
                )}
              </span>
            </button>
          )
        })}
      </div>
      <p className={styles.legend}>
        ✓ {t('complete')} · ◐ {t('partial')} · ○ {t('empty')}
      </p>
      <div className={styles.tabs} role="group" aria-label={nt('v2.title')}>
        {tabs.map((item) => (
          <button
            key={item.id}
            disabled={item.id === 'recipes' && !recipesEnabled}
            aria-pressed={tab === item.id}
            onClick={() => onTabChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {tab === 'today' && (
        <section
          className={styles.card}
          aria-label={t('balance')}
          aria-busy={model.loading || health.busy}
        >
          <h2>
            <Flame size={20} aria-hidden="true" />
            {t('balance')}
          </h2>
          {model.consumed.state === 'loading' ? (
            <p role="status">{t('loading')}</p>
          ) : model.consumed.state === 'error' ? (
            <div role="alert">
              <p>{t('foodError')}</p>
              <button className={styles.action} onClick={onRetry}>
                {t('retry')}
              </button>
            </div>
          ) : null}
          <div className={styles.metrics}>
            <div>
              <span>{t('consumed')}</span>
              <strong>{format(consumed?.calories)}</strong>
              <small>kcal · MoovX</small>
            </div>
            <div>
              <span>{t('spent')}</span>
              <strong>{format(total)}</strong>
              <small>kcal · {t('health')}</small>
            </div>
          </div>
          {consumed && total !== null && (
            <div className={styles.bars} aria-hidden="true">
              <div>
                <span
                  style={{ width: `${(consumed.calories / scale) * 100}%` }}
                />
              </div>
              <div>
                <span
                  className={styles.spentBar}
                  style={{ width: `${(total / scale) * 100}%` }}
                />
              </div>
            </div>
          )}
          {difference !== null && (
            <p className={styles.difference}>
              <span>{t('difference')}</span>
              <strong>
                {difference > 0 ? '+' : difference < 0 ? '−' : ''}
                {format(Math.abs(difference))} kcal
              </strong>
            </p>
          )}
          <div className={styles.macros}>
            {(['protein', 'carbs', 'fat'] as const).map((key) => (
              <div key={key}>
                <strong>{format(consumed?.[key])} g</strong>
                <span>{t(key)}</span>
              </div>
            ))}
          </div>
          {total !== null && health.data ? (
            <p className={styles.note}>
              {ht('breakdown', {
                active: format(health.data.active),
                resting: format(health.data.resting),
              })}
              <br />
              {ht('updated', {
                time: new Intl.DateTimeFormat(locale, {
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZone: 'Europe/Zurich',
                }).format(health.data.through),
              })}
              {selectedDate === today ? ' · ' + t('inProgress') : ''}
            </p>
          ) : (
            <p className={styles.note}>
              {t(
                !health.available
                  ? 'iphoneOnly'
                  : health.busy
                    ? 'loading'
                    : connected
                      ? 'missingHealth'
                      : health.data?.status === 'error'
                        ? 'healthError'
                        : 'connectHint',
              )}
            </p>
          )}
          <p className={styles.note}>{t('informative')}</p>
        </section>
      )}
      <div className={styles.content}>{children}</div>
      <Dialog.Root open={healthOpen} onOpenChange={setHealthOpen}>
        {healthOpen && (
          <RailOverlay>
            <Dialog.Overlay className={styles.backdrop} />
            <Dialog.Content className={styles.dialog}>
              <header>
                <Heart size={24} aria-hidden="true" />
                <Dialog.Close className={styles.close} aria-label={t('close')}>
                  <X size={22} />
                </Dialog.Close>
              </header>
              <Dialog.Title>{t('healthTitle')}</Dialog.Title>
              <Dialog.Description>{t('healthIntro')}</Dialog.Description>
              <div className={styles.permission}>
                <span>{t('activeEnergy')}</span>
                <strong>{t('read')}</strong>
              </div>
              <div className={styles.permission}>
                <span>{t('restEnergy')}</span>
                <strong>{t('read')}</strong>
              </div>
              <p>{t('healthSeparation')}</p>
              {!health.available ? (
                <p role="status">{t('iphoneOnly')}</p>
              ) : (
                <>
                  <p role="status">
                    {ht(
                      health.busy
                        ? 'loading'
                        : !health.data || health.data.status === 'off'
                          ? 'consent'
                          : connected
                            ? total === null
                              ? 'missing'
                              : 'estimate'
                            : 'error',
                    )}
                  </p>
                  <button
                    className={styles.action}
                    disabled={health.busy}
                    onClick={() =>
                      void health.request(
                        !health.data || health.data.status === 'off'
                          ? 'connect'
                          : 'read',
                      )
                    }
                  >
                    {ht(
                      !health.data || health.data.status === 'off'
                        ? 'connect'
                        : 'refresh',
                    )}
                  </button>
                  {health.data && health.data.status !== 'off' && (
                    <button
                      className={styles.disconnect}
                      disabled={health.busy}
                      onClick={() => void health.request('disconnect')}
                    >
                      {ht('disconnect')}
                    </button>
                  )}
                </>
              )}
              <p className={styles.note}>{ht('note')}</p>
            </Dialog.Content>
          </RailOverlay>
        )}
      </Dialog.Root>
    </section>
  )
}
