'use client'

import dynamic from 'next/dynamic'
import DeferredContentFallback from '../loading/DeferredContentFallback'

const deferredContent = () => <DeferredContentFallback />
const deferredOverlay = () => <DeferredContentFallback label="Ouverture…" overlay />

export const TrainingTab = dynamic(() => import('../tabs/TrainingTab'), { loading: deferredContent })
export const NutritionTab = dynamic(() => import('../tabs/NutritionTab'), { loading: deferredContent })
export const ProgressTab = dynamic(() => import('../tabs/ProgressTab'), { loading: deferredContent })
export const ProfileTab = dynamic(() => import('../tabs/ProfileTab'), { loading: deferredContent })
export const MessagesTab = dynamic(() => import('../tabs/MessagesTab'), { loading: deferredContent })
export const FeedbackTab = dynamic(() => import('../client/FeedbackTab'), { loading: deferredContent })
export const PreferencesSection = dynamic(() => import('../tabs/profile/PreferencesSection'), { loading: deferredContent })
export const AccountSection = dynamic(() => import('../tabs/profile/AccountSection'), { loading: deferredContent })
export const GoalsSection = dynamic(() => import('../tabs/profile/GoalsSection'), { loading: deferredContent })
export const AccountTab = dynamic(() => import('../tabs/AccountTab'), { loading: deferredContent })
export const WorkoutSessionWithCelebrations = dynamic(() => import('./WorkoutSessionWithCelebrations'), {
  loading: () => <DeferredContentFallback label="Préparation de la séance…" overlay />,
})
export const WeightModal = dynamic(() => import('../modals/WeightModal'), { loading: deferredOverlay })
export const MeasureModal = dynamic(() => import('../modals/MeasureModal'), { loading: deferredOverlay })
export const BmrModal = dynamic(() => import('../modals/BmrModal'), { loading: deferredOverlay })
export const ObjectiveModal = dynamic(() => import('../modals/ObjectiveModal'), { loading: deferredOverlay })
export const BarcodeScanner = dynamic(() => import('../BarcodeScanner'), {
  loading: () => <DeferredContentFallback label="Ouverture du scanner…" overlay />,
})
export const BadgeCelebration = dynamic(() => import('../BadgeCelebration'))
