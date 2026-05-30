'use client'

import { useTranslations } from 'next-intl'
import { LOCATION_OPTS, HOME_EQUIPMENT_OPTS } from '@/lib/onboarding-options'
import OptionStep from './shared/OptionStep'
import OptionCard from './shared/OptionCard'

interface SoloStep7EquipmentProps {
  /** Selected index in LOCATION_OPTS (0=home, 1=gym, 2=both, null=none yet) */
  locationIndex: number | null
  /** Array of selected home equipment ids (dumbbell/kettlebell/band) */
  homeEquipment: string[]
  /** Called when user picks a training location */
  onLocationSelect: (index: number) => void
  /** Called when user toggles a home equipment item */
  onHomeEquipmentToggle: (equipmentId: string) => void
}

export default function SoloStep7Equipment({
  locationIndex,
  homeEquipment,
  onLocationSelect,
  onHomeEquipmentToggle,
}: SoloStep7EquipmentProps) {
  const t = useTranslations('onboarding_v2')

  // Q2 visible only if user picked 'home' (index 0) or 'both' (index 2)
  const showHomeEquipment = locationIndex === 0 || locationIndex === 2

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Q1 — Where do you train? (always visible) */}
      <OptionStep
        options={LOCATION_OPTS}
        selectedIndex={locationIndex}
        onSelect={onLocationSelect}
        labelKey="solo.stepEquipment.location.options"
      />

      {/* Q2 — Home equipment (conditional) */}
      {showHomeEquipment && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: 1,
              opacity: 0.7,
              marginTop: 8,
            }}
          >
            {t('solo.stepEquipment.homeEquipmentLabel')}
          </div>

          {HOME_EQUIPMENT_OPTS.map((opt) => (
            <OptionCard
              key={opt.id}
              iconName={opt.icon}
              label={t(`solo.stepEquipment.homeEquipment.${opt.id}`)}
              selected={homeEquipment.includes(opt.id)}
              onClick={() => onHomeEquipmentToggle(opt.id)}
            />
          ))}

          <div
            style={{
              fontSize: 12,
              opacity: 0.6,
              fontStyle: 'italic',
              marginTop: 4,
            }}
          >
            {t('solo.stepEquipment.homeEquipmentHint')}
          </div>
        </div>
      )}
    </div>
  )
}
