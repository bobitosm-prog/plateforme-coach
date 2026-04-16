'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  BG_BASE, BG_CARD, BORDER, GOLD, GOLD_DIM, GOLD_RULE,
  TEXT_PRIMARY, TEXT_MUTED, TEXT_DIM,
  FONT_DISPLAY, FONT_ALT, FONT_BODY,
} from '../../../../lib/design-tokens'

interface StartProgramModalProps {
  programName: string
  onStart: (option: 'now' | 'monday' | 'custom', date?: string) => void
  onClose: () => void
}

function getNextMonday(): Date {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? 1 : 8 - day
  const next = new Date(d)
  next.setDate(d.getDate() + diff)
  next.setHours(0, 0, 0, 0)
  return next
}

function formatDateFr(d: Date): string {
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const btnBase: React.CSSProperties = {
  width: '100%', padding: '16px 20px', borderRadius: 14, cursor: 'pointer',
  fontFamily: FONT_DISPLAY, fontSize: 15, fontWeight: 700, letterSpacing: '0.05em',
  textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 4,
}

export default function StartProgramModal({ programName, onStart, onClose }: StartProgramModalProps) {
  const [showPicker, setShowPicker] = useState(false)
  const [pickerMonth, setPickerMonth] = useState(() => {
    const d = new Date()
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const today = new Date()
  const todayStr = toDateStr(today)
  const nextMonday = getNextMonday()
  const nextMondayStr = toDateStr(nextMonday)

  // Calendar grid
  const firstDay = new Date(pickerMonth.year, pickerMonth.month, 1)
  const startOffset = (firstDay.getDay() + 6) % 7 // Monday = 0
  const daysInMonth = new Date(pickerMonth.year, pickerMonth.month + 1, 0).getDate()
  const weeks: (number | null)[][] = []
  let week: (number | null)[] = Array(startOffset).fill(null)
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d)
    if (week.length === 7) { weeks.push(week); week = [] }
  }
  if (week.length > 0) { while (week.length < 7) week.push(null); weeks.push(week) }

  function isMonday(day: number): boolean {
    return new Date(pickerMonth.year, pickerMonth.month, day).getDay() === 1
  }
  function isFuture(day: number): boolean {
    const d = new Date(pickerMonth.year, pickerMonth.month, day)
    d.setHours(0, 0, 0, 0)
    const t = new Date(); t.setHours(0, 0, 0, 0)
    return d >= t
  }
  function isSelectable(day: number): boolean {
    return isMonday(day) && isFuture(day)
  }
  function dayStr(day: number): string {
    return toDateStr(new Date(pickerMonth.year, pickerMonth.month, day))
  }

  const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
  const dayHeaders = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 420, maxHeight: 'calc(100vh - 60px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      >
        <div style={{ padding: '24px 20px 0', flexShrink: 0 }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, color: TEXT_PRIMARY, letterSpacing: '0.08em' }}>QUAND COMMENCER ?</div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: TEXT_MUTED, marginTop: 4 }}>{programName}</div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 0' }}>
          <AnimatePresence mode="wait">
            {!showPicker ? (
              <motion.div key="options" initial={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* MAINTENANT */}
                <button onClick={() => onStart('now')} style={{ ...btnBase, background: GOLD, color: '#0D0B08', border: 'none' }}>
                  <span>MAINTENANT</span>
                  <span style={{ fontSize: 12, fontWeight: 400, fontFamily: FONT_BODY, opacity: 0.7 }}>
                    Aujourd'hui {formatDateFr(today)}
                  </span>
                </button>

                {/* LUNDI PROCHAIN */}
                <button onClick={() => onStart('monday', nextMondayStr)} style={{ ...btnBase, background: 'transparent', border: `1.5px solid ${GOLD_RULE}`, color: GOLD }}>
                  <span>LUNDI PROCHAIN</span>
                  <span style={{ fontSize: 12, fontWeight: 400, fontFamily: FONT_BODY, color: TEXT_MUTED }}>
                    {formatDateFr(nextMonday)}
                  </span>
                </button>

                {/* CHOISIR UNE DATE */}
                <button onClick={() => setShowPicker(true)} style={{ ...btnBase, background: 'transparent', border: `1.5px solid ${BORDER}`, color: TEXT_MUTED }}>
                  <span>CHOISIR UNE DATE</span>
                  <span style={{ fontSize: 12, fontWeight: 400, fontFamily: FONT_BODY, color: TEXT_DIM }}>
                    Seulement les lundis
                  </span>
                </button>
              </motion.div>
            ) : (
              <motion.div key="picker" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {/* Month navigation */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <button onClick={() => setPickerMonth(p => {
                    const m = p.month === 0 ? 11 : p.month - 1
                    return { year: p.month === 0 ? p.year - 1 : p.year, month: m }
                  })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: GOLD, padding: 8 }}>
                    <ChevronLeft size={20} />
                  </button>
                  <span style={{ fontFamily: FONT_DISPLAY, fontSize: 16, color: TEXT_PRIMARY, letterSpacing: '0.05em' }}>
                    {monthNames[pickerMonth.month]} {pickerMonth.year}
                  </span>
                  <button onClick={() => setPickerMonth(p => {
                    const m = p.month === 11 ? 0 : p.month + 1
                    return { year: p.month === 11 ? p.year + 1 : p.year, month: m }
                  })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: GOLD, padding: 8 }}>
                    <ChevronRight size={20} />
                  </button>
                </div>

                {/* Day headers */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
                  {dayHeaders.map((d, i) => (
                    <div key={i} style={{ textAlign: 'center', fontFamily: FONT_ALT, fontSize: 10, fontWeight: 700, color: GOLD, padding: 6, letterSpacing: '0.1em' }}>{d}</div>
                  ))}
                </div>

                {/* Calendar grid */}
                {weeks.map((w, wi) => (
                  <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
                    {w.map((day, di) => {
                      if (day === null) return <div key={di} />
                      const sel = isSelectable(day)
                      const picked = selectedDate === dayStr(day)
                      return (
                        <button
                          key={di}
                          disabled={!sel}
                          onClick={() => setSelectedDate(dayStr(day))}
                          style={{
                            padding: '10px 4px', textAlign: 'center', border: 'none', cursor: sel ? 'pointer' : 'default',
                            fontFamily: FONT_BODY, fontSize: 14, fontWeight: picked ? 700 : 400, borderRadius: 8,
                            background: picked ? GOLD : 'transparent',
                            color: picked ? '#0D0B08' : sel ? TEXT_PRIMARY : `${TEXT_PRIMARY}30`,
                          }}
                        >{day}</button>
                      )
                    })}
                  </div>
                ))}

                {/* Confirm selected date */}
                {selectedDate && (
                  <button onClick={() => onStart('custom', selectedDate)} style={{ width: '100%', padding: 16, marginTop: 16, background: GOLD, color: '#0D0B08', border: 'none', borderRadius: 14, fontFamily: FONT_DISPLAY, fontSize: 15, fontWeight: 700, letterSpacing: '0.05em', cursor: 'pointer' }}>
                    DÉMARRER LE {new Date(selectedDate + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }).toUpperCase()}
                  </button>
                )}

                {/* Back button */}
                <button onClick={() => { setShowPicker(false); setSelectedDate(null) }} style={{ width: '100%', padding: 12, marginTop: 8, background: 'none', border: 'none', color: TEXT_MUTED, fontFamily: FONT_BODY, fontSize: 13, cursor: 'pointer' }}>
                  ← Retour
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Cancel */}
        <div style={{ flexShrink: 0, padding: '16px 20px 32px', borderTop: `0.5px solid ${BORDER}` }}>
          <button onClick={onClose} style={{ width: '100%', padding: 14, background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: 14, color: TEXT_MUTED, fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.05em' }}>ANNULER</button>
        </div>
      </motion.div>
    </div>
  )
}
