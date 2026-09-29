'use client'
import { Check } from 'lucide-react'
import { ICON_MAP } from './iconMap'
import styles from '../../../OnboardingV2Content.module.css'

interface OptionCardProps {
  iconName: string
  label: string
  selected: boolean
  onClick: () => void
}

export default function OptionCard({ iconName, label, selected, onClick }: OptionCardProps) {
  const Icon = ICON_MAP[iconName]
  return (
    <button type="button" className={styles.optionCard} aria-pressed={selected} onClick={onClick}>
      <span className={styles.optionIcon} aria-hidden="true">{Icon && <Icon size={22} />}</span>
      <span className={styles.optionLabel}>{label}</span>
      <span className={styles.optionCheck} aria-hidden="true">{selected && <Check size={18} />}</span>
    </button>
  )
}
