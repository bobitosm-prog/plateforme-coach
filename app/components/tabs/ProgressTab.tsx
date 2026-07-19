'use client'
import { de as deLocale } from 'date-fns/locale/de'
import { enUS } from 'date-fns/locale/en-US'
import { fr as frLocale } from 'date-fns/locale/fr'
import type { Locale } from 'date-fns'
import { useLocale, useTranslations } from 'next-intl'
import { useRef } from 'react'
import AnalyticsSection from '../AnalyticsSection'
import BodyAssessment from '../progress/BodyAssessment'
import { useHasSize } from '../ui/SizedChart'
import { ProgressBodyAnalysisSection } from './progression/ProgressBodyAnalysisSection'
import { ProgressEntryOverlays } from './progression/ProgressEntryOverlays'
import { ProgressExportButton } from './progression/ProgressExportButton'
import { ProgressMeasurementsSection } from './progression/ProgressMeasurementsSection'
import { ProgressOverviewSection } from './progression/ProgressOverviewSection'
import { ProgressPhotoCompareOverlay } from './progression/ProgressPhotoCompareOverlay'
import { ProgressPhotosSection } from './progression/ProgressPhotosSection'
import { ProgressRecordsSection } from './progression/ProgressRecordsSection'
import { ProgressWeightSection } from './progression/ProgressWeightSection'
import { ProgressWellnessSection } from './progression/ProgressWellnessSection'
import type { ProgressTabPublicProps } from './progression/progress-tab-types'
import { useProgressTabController } from './progression/useProgressTabController'
import type { ProgressSectionId } from './progression/types'

export default function ProgressTab(props: ProgressTabPublicProps) {
  const { photoRef, uploadProgressPhoto } = props
  const { rootRef, hasSize } = useHasSize()
  const t = useTranslations('progress')
  const locale = useLocale()
  const dateLocales: Record<string, Locale> = { fr: frLocale, en: enUS, de: deLocale }
  const dateLocale = dateLocales[locale] || frLocale
  const controller = useProgressTabController(props, t)
  const bodyUploadRef = useRef<HTMLInputElement>(null)
  const weightRef = useRef<HTMLDivElement>(null)
  const recordsRef = useRef<HTMLDivElement>(null)
  const photosRef = useRef<HTMLDivElement>(null)
  const measurementsRef = useRef<HTMLDivElement>(null)
  const wellnessRef = useRef<HTMLDivElement>(null)
  const chartsRef = useRef<HTMLDivElement>(null)
  const scrollToSection = (section: ProgressSectionId) => {
    controller.setActivePill(section)
    const refs = { poids: weightRef, records: recordsRef, photos: photosRef, mensurations: measurementsRef, bienetre: wellnessRef, graphiques: chartsRef }
    refs[section].current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  const latestMeasurement = props.measurements[0]
  const weightDelta = controller.summary.weightDelta ?? 0
  const gaining = props.profile?.objective === 'prise_masse' || props.profile?.objective === 'gain'
  const deltaPositive = gaining ? weightDelta > 0 : weightDelta < 0

  return <div ref={rootRef} style={{ padding: '20px 20px 120px', minHeight: '100vh', overflowX: 'hidden', maxWidth: '100%' }}>
    <ProgressOverviewSection sessions={props.wSessions.length} records={props.personalRecords.length} totalVolume={controller.summary.totalWeeklyVolume} streak={props.streak} activeSection={controller.activePill} onNavigate={scrollToSection} />

    <div ref={weightRef} style={{ scrollMarginTop: 20 }}><ProgressWeightSection period={controller.weightPeriod} points={controller.periodWeights} min={controller.pMin} max={controller.pMax} currentWeight={props.currentWeight} goalWeight={props.goalWeight} delta={weightDelta} deltaPositive={deltaPositive} onPeriodChange={controller.setWeightPeriod} onAddWeight={() => controller.setShowWeight(true)} /></div>
    <div ref={recordsRef} style={{ scrollMarginTop: 20 }}><ProgressRecordsSection records={controller.groupedRecords} limit={controller.recordsLimit} dateLocale={dateLocale} onLimitChange={controller.setRecordsLimit} /></div>

    {controller.showAssessment && <BodyAssessment supabase={props.supabase} session={props.session} profile={props.profile} onClose={() => controller.setShowAssessment(false)} onRefresh={props.onRefresh} />}
    <div ref={photosRef} style={{ scrollMarginTop: 20 }}><ProgressPhotosSection photos={props.progressPhotos} signedUrls={controller.signedUrls} onAdd={() => photoRef.current?.click()} onCompare={controller.openCompare} t={t} /></div>
    <ProgressBodyAnalysisSection analysis={controller.bodyAnalysis} loading={controller.bodyAnalysisLoading} stepLabel={controller.analysisStepLabel} uploadOpen={controller.showBodyUpload} photos={controller.bodyUploadPhotos} uploadRef={bodyUploadRef} onChooseAngle={controller.setBodyUploadTarget} onUpload={controller.uploadBodyPhoto} onAnalyze={controller.runBodyAnalysis} onCloseUpload={controller.closeBodyUpload} onOpenUpload={controller.openBodyUpload} onContactCoach={() => props.setModal('messages')} t={t} dateLocale={dateLocale} />

    <div ref={measurementsRef} style={{ scrollMarginTop: 20 }}><ProgressMeasurementsSection measurement={latestMeasurement} onAddMeasurement={() => controller.setShowMeasure(true)} /></div>
    <div ref={wellnessRef} style={{ scrollMarginTop: 20, marginTop: 24 }}><ProgressWellnessSection checkins={controller.checkinData} period={controller.checkinPeriod} locale={locale} now={controller.viewNow} hasSize={hasSize} onPeriodChange={controller.setCheckinPeriod} t={t} /></div>

    <div ref={chartsRef} style={{ scrollMarginTop: 20, marginTop: 24 }}>
      <AnalyticsSection personalRecords={props.personalRecords} weeklyCalories={props.weeklyCalories} weeklyWater={props.weeklyWater} weeklyVolume={props.weeklyVolume} weightHistoryFull={props.weightHistoryFull} weightHistory30={props.weightHistory30} wSessions={props.wSessions} calorieGoal={props.calorieGoal} goalWeight={props.goalWeight} waterGoal={props.waterGoal} streak={props.streak} currentWeight={props.currentWeight} />
    </div>
    <ProgressExportButton visible={controller.displayWeights.length > 0 || props.measurements.length > 0} onExport={controller.exportData} t={t} />

    <ProgressPhotoCompareOverlay open={controller.showCompare} photos={props.progressPhotos} indices={controller.compareIdx} signedUrls={controller.signedUrls} slider={controller.sliderValue} alignment={controller.alignment} aligning={controller.isAligning} error={controller.alignError} dateLocale={dateLocale} onClose={controller.closeCompare} onAlign={controller.alignPhotos} onReset={() => controller.setAlignment(null)} onIndicesChange={controller.setCompareIdx} onSliderChange={controller.setSliderValue} t={t} />
    <ProgressEntryOverlays showWeight={controller.showWeight} weight={controller.weightVal} weightDate={controller.weightDate} previousWeight={props.weightHistory30.at(-1)?.poids} savingWeight={controller.savingWeight} onWeightChange={controller.setWeightVal} onWeightDateChange={controller.setWeightDate} onCloseWeight={() => { controller.setShowWeight(false); controller.setWeightVal('') }} onSaveWeight={controller.saveWeight} showMeasure={controller.showMeasure} measureForm={controller.measureForm} measureDate={controller.measureDate} savingMeasure={controller.savingMeasure} onMeasureChange={(key, value) => controller.setMeasureForm(previous => ({ ...previous, [key]: value }))} onMeasureDateChange={controller.setMeasureDate} onCloseMeasure={() => { controller.setShowMeasure(false); controller.setMeasureForm({ waist: '', hips: '', chest: '', arms: '', thighs: '' }) }} onSaveMeasure={controller.saveMeasure} t={t} />
    <input ref={photoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={uploadProgressPhoto} />
  </div>
}
