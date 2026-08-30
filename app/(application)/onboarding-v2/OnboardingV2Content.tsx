'use client'
import { createBrowserClient } from '@supabase/ssr'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ChevronLeft } from 'lucide-react'
import { updateProfile, invalidateProfileCache } from '@/lib/profile-service'
import { cache } from '@/lib/cache'
import { calcMifflinStJeor } from '@/lib/design-tokens'
import { capitalizeFullName } from '@/lib/utils/capitalize-name'
import { fetchEffectiveEntitlementSnapshot } from '@/lib/entitlements/client-snapshot'
import { resolveActiveCoachForOnboarding } from '@/lib/coach-relations/onboarding-reader'
import { GOALS, GOAL_TO_OBJECTIVE, ACTIVITY_OPTS, NUTRITION_OPTS, EXPERIENCE_OPTS } from '@/lib/onboarding-options'
import SoloStep2Profile from './steps/solo/SoloStep2Profile'
import SoloStep3Body from './steps/solo/SoloStep3Body'
import SoloStep4Goal from './steps/solo/SoloStep4Goal'
import SoloStep5Activity from './steps/solo/SoloStep5Activity'
import SoloStep6Sessions from './steps/solo/SoloStep6Sessions'
import SoloStep7Nutrition from './steps/solo/SoloStep7Nutrition'
import SoloStep8Experience from './steps/solo/SoloStep8Experience'
import SoloStep9PhotoBody from './steps/solo/SoloStep9PhotoBody'
import SoloStep7Equipment from './steps/solo/SoloStep7Equipment'
import SoloStep11Preferences, { type MealPrefsState } from './steps/solo/SoloStep11Preferences'
import InvitedStep1Profile from './steps/invited/InvitedStep1Profile'
import InvitedStep2Avatar from './steps/invited/InvitedStep2Avatar'
import InvitedStep3Welcome from './steps/invited/InvitedStep3Welcome'
import styles from './OnboardingV2Content.module.css'

const SOLO_TOTAL_STEPS = 5
const COACH_MANAGED_TOTAL_STEPS = 3
type Flow = 'solo' | 'coachManaged'
type Answers = Record<string, unknown>
type Translate = (message: string, values?: Record<string, string | number>) => string
const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()

export default function OnboardingV2Content() {
  const onboardingT = useTranslations('onboarding_v2')
  const t: Translate = useCallback((message, values) =>
    (onboardingT as Translate)(message, values), [onboardingT])
  const router = useRouter()
  const supabase = useRef(createBrowserClient(url, key)).current
  const answersRef = useRef<Answers>({})
  const [flow,setFlow]=useState<Flow|null>(null); const [step,setStep]=useState(1)
  const [editingFromSummary,setEditingFromSummary]=useState(false)
  const [userId,setUserId]=useState<string|null>(null); const [loading,setLoading]=useState(true)
  const [saving,setSaving]=useState(false); const [error,setError]=useState<string|null>(null)
  const [firstName,setFirstName]=useState(''); const [birthDate,setBirthDate]=useState(''); const [gender,setGender]=useState<'male'|'female'|''>('')
  const [avatarUrl,setAvatarUrl]=useState<string|null>(null); const [coachName,setCoachName]=useState<string|null>(null)
  const [weight,setWeight]=useState(''); const [height,setHeight]=useState(''); const [goalWeight,setGoalWeight]=useState('')
  const [goal,setGoal]=useState<number|null>(null); const [activityLevel,setActivityLevel]=useState<number|null>(null)
  const [sessionsPerWeek,setSessionsPerWeek]=useState(3); const [nutrition,setNutrition]=useState<number|null>(null)
  const [experience,setExperience]=useState<number|null>(null); const [locationIndex,setLocationIndex]=useState<number|null>(null)
  const [homeEquipment,setHomeEquipment]=useState<string[]>([]); const [photoBodyUrl,setPhotoBodyUrl]=useState<string|null>(null)
  const [uploadingPhoto,setUploadingPhoto]=useState(false); const [advancedOpen,setAdvancedOpen]=useState(false)
  const [mealPrefs,setMealPrefs]=useState<MealPrefsState>({breakfast:[],snack:[],lunch:[],dinner:[]}); const [dislikedFoods,setDislikedFoods]=useState<string[]>([])
  const [restrictions,setRestrictions]=useState<'unanswered'|'none'|'some'>('unanswered'); const [restrictionDetails,setRestrictionDetails]=useState('')

  useEffect(()=>{ let mounted=true; void (async()=>{
    const {data:{session}}=await supabase.auth.getSession(); if(!session){router.replace('/login');return}
    const uid=session.user.id; setUserId(uid)
    const {data:p,error:e}=await supabase.from('profiles').select('full_name,birth_date,gender,avatar_url,current_weight,height,target_weight,objective,activity_level,dietary_type,training_location,home_equipment,meal_preferences,onboarding_answers').eq('id',uid).single()
    if(!mounted)return; if(e||!p){setError(t('redesign.errors.profile'));setLoading(false);return}
    try{await fetchEffectiveEntitlementSnapshot()}catch{setError(t('redesign.errors.profile'));setLoading(false);return}
    const relation=await resolveActiveCoachForOnboarding(supabase,uid); if(relation.kind==='denied'){setError(t('redesign.errors.profile'));setLoading(false);return}
    const nextFlow:Flow=relation.kind==='active'?'coachManaged':'solo'
    if(relation.kind==='active'){const {data:c}=await supabase.from('profiles').select('full_name').eq('id',relation.coachId).single();setCoachName(c?.full_name||null)}
    const a=p.onboarding_answers&&typeof p.onboarding_answers==='object'?p.onboarding_answers as Answers:{}; answersRef.current=a
    setFirstName(p.full_name?.split(' ')[0]||session.user.user_metadata?.full_name?.split(' ')[0]||'');setBirthDate(p.birth_date||'');setGender(p.gender==='male'||p.gender==='female'?p.gender:'');setAvatarUrl(p.avatar_url||null)
    setWeight(p.current_weight?String(p.current_weight):'');setHeight(p.height?String(p.height):'');setGoalWeight(p.target_weight?String(p.target_weight):'')
    const gi=GOALS.findIndex(o=>GOAL_TO_OBJECTIVE[o.id]===p.objective);setGoal(gi<0?null:gi)
    const ai=ACTIVITY_OPTS.findIndex(o=>o.dbLabel===p.activity_level);setActivityLevel(ai<0?null:ai)
    const ni=NUTRITION_OPTS.findIndex(o=>o.dbLabel===p.dietary_type);setNutrition(ni<0?null:ni)
    const ei=EXPERIENCE_OPTS.findIndex(o=>o.dbLabel===a.experience_level);setExperience(ei<0?null:ei)
    setSessionsPerWeek(typeof a.sessions_per_week==='number'?a.sessions_per_week:3);const li=['home','gym','both'].indexOf(p.training_location);setLocationIndex(li<0?null:li);setHomeEquipment(Array.isArray(p.home_equipment)?p.home_equipment:[])
    if(p.meal_preferences&&typeof p.meal_preferences==='object'){const m=p.meal_preferences as MealPrefsState&{disliked_foods?:string[];dietary_restrictions?:string};setMealPrefs({breakfast:m.breakfast||[],snack:m.snack||[],lunch:m.lunch||[],dinner:m.dinner||[]});setDislikedFoods(m.disliked_foods||[]);if(typeof m.dietary_restrictions==='string'){setRestrictions(m.dietary_restrictions?'some':'none');setRestrictionDetails(m.dietary_restrictions)}}
    const max=nextFlow==='solo'?SOLO_TOTAL_STEPS:COACH_MANAGED_TOTAL_STEPS;setStep(Math.min(max,Math.max(1,typeof a.onboarding_v2_step==='number'?a.onboarding_v2_step:1)));setFlow(nextFlow);setLoading(false)
  })();return()=>{mounted=false}},[router,supabase,t])

  const macros=useMemo(()=>{if(!weight||!height||!birthDate||!gender||activityLevel===null||goal===null)return null;const age=Math.floor((Date.now()-new Date(birthDate).getTime())/31557600000),w=Number(weight),h=Number(height);if(!w||!h||age<=0)return null;const tdee=Math.round(calcMifflinStJeor(w,h,age,gender)*([1.2,1.375,1.55,1.725][activityLevel]||1.55));const obj=GOAL_TO_OBJECTIVE[GOALS[goal].id],calorieGoal=tdee+(obj==='cut'?-400:obj==='mass'?300:0),protein=Math.round(w*2),fat=Math.round(calorieGoal*.25/9);return{tdee,calorieGoal,protein,fat,carbs:Math.round((calorieGoal-protein*4-fat*9)/4)}},[weight,height,birthDate,gender,activityLevel,goal])
  async function persist(fields:Record<string,unknown>,next?:number){if(!userId)return false;const a=next?{...answersRef.current,onboarding_v2_step:next}:answersRef.current;const {error:e}=await updateProfile(userId,{...fields,onboarding_answers:a},supabase);if(e)return false;answersRef.current=a;return true}
  async function save(){if(!flow||!userId)return false;const total=flow==='solo'?SOLO_TOTAL_STEPS:COACH_MANAGED_TOTAL_STEPS;const next=editingFromSummary?total:Math.min(step+1,total)
    if(flow==='coachManaged'){if(step===1)return persist({full_name:capitalizeFullName(firstName),birth_date:birthDate||null,gender:gender||null},next);if(step===2)return persist({},next);const ok=await persist({onboarding_completed:true,onboarding_completed_at:new Date().toISOString(),next_diagnostic_at:new Date(Date.now()+604800000).toISOString()});if(ok){invalidateProfileCache();cache.remove(`dashboard_${userId}`)}return ok}
    if(step===1&&goal!==null)return persist({objective:GOAL_TO_OBJECTIVE[GOALS[goal].id]},next)
    if(step===2){const w=Number(weight),h=Number(height),gw=Number(goalWeight);if(!w||!h||!gw)return false;const {error:e}=await supabase.from('weight_logs').upsert({user_id:userId,date:new Date().toISOString().slice(0,10),poids:w},{onConflict:'user_id,date'});if(e)return false;return persist({full_name:capitalizeFullName(firstName),birth_date:birthDate,gender,current_weight:w,start_weight:w,height:h,target_weight:gw},next)}
    if(step===3&&activityLevel!==null&&experience!==null&&locationIndex!==null){answersRef.current={...answersRef.current,sessions_per_week:sessionsPerWeek,experience_level:EXPERIENCE_OPTS[experience].dbLabel};return persist({activity_level:ACTIVITY_OPTS[activityLevel].dbLabel,training_location:['home','gym','both'][locationIndex],home_equipment:locationIndex===1?[]:homeEquipment},next)}
    if(step===4&&nutrition!==null&&restrictions!=='unanswered')return persist({dietary_type:NUTRITION_OPTS[nutrition].dbLabel,meal_preferences:{...mealPrefs,disliked_foods:dislikedFoods,dietary_restrictions:restrictions==='some'?restrictionDetails.trim():''}},next)
    if(step===5&&macros){const ok=await persist({tdee:macros.tdee,calorie_goal:macros.calorieGoal,protein_goal:macros.protein,carbs_goal:macros.carbs,fat_goal:macros.fat,onboarding_completed:true,onboarding_completed_at:new Date().toISOString(),next_diagnostic_at:new Date(Date.now()+604800000).toISOString(),needs_initial_generation:true});if(ok){invalidateProfileCache();cache.remove(`dashboard_${userId}`)}return ok}return false}
  async function next(){setSaving(true);setError(null);try{if(!await save()){setError(t('redesign.errors.save'));return}const total=flow==='solo'?SOLO_TOTAL_STEPS:COACH_MANAGED_TOTAL_STEPS;if(step===total){router.replace('/');return}if(editingFromSummary){setEditingFromSummary(false);setStep(total);return}setStep(s=>s+1)}finally{setSaving(false)}}
  function editStep(target:number){setEditingFromSummary(true);setStep(target);void persist({},target)}
  function back(){if(editingFromSummary){setEditingFromSummary(false);setStep(SOLO_TOTAL_STEPS);void persist({},SOLO_TOTAL_STEPS);return}const target=Math.max(1,step-1);setStep(target);void persist({},target)}
  async function upload(file:File,avatar=false){if(!userId)return;setUploadingPhoto(true);try{if(avatar){const path=`avatars/${userId}/${Date.now()}.${file.name.split('.').pop()||'jpg'}`;const {error:e}=await supabase.storage.from('avatars').upload(path,file,{upsert:true});if(e)throw e;const publicUrl=supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;if(!await persist({avatar_url:publicUrl}))throw new Error();setAvatarUrl(publicUrl)}else{const path=`${userId}/onboarding-${Date.now()}.${file.name.split('.').pop()||'jpg'}`;const {error:e}=await supabase.storage.from('progress-photos').upload(path,file);if(e)throw e;const {error:i}=await supabase.from('progress_photos').insert({user_id:userId,date:new Date().toISOString().slice(0,10),photo_url:path,view_type:'front'});if(i)throw i;const {data}=await supabase.storage.from('progress-photos').createSignedUrl(path,3600);setPhotoBodyUrl(data?.signedUrl||'')}}catch{setError(t('redesign.errors.photo'))}finally{setUploadingPhoto(false)}}
  function toggleFood(meal:keyof MealPrefsState,food:string){setMealPrefs(p=>({...p,[meal]:p[meal].includes(food)?p[meal].filter(x=>x!==food):[...p[meal],food]}))}
  if(loading)return <main className={styles.shell}><p role="status">{t('redesign.loading')}</p></main>;if(!flow)return <main className={styles.shell}><p role="alert">{error}</p></main>
  const total=flow==='solo'?SOLO_TOTAL_STEPS:COACH_MANAGED_TOTAL_STEPS, valid=flow==='coachManaged'?(step!==1||firstName.trim().length>=2):[goal!==null,firstName.trim().length>=2&&!!birthDate&&!!gender&&Number(weight)>0&&Number(height)>0&&Number(goalWeight)>0,activityLevel!==null&&experience!==null&&locationIndex!==null,nutrition!==null&&restrictions!=='unanswered'&&(restrictions==='none'||restrictionDetails.trim().length>0),!!macros][step-1]
  return <main className={styles.shell}><section className={styles.app}><header className={styles.header}><div><strong>MoovX</strong><span>{t('redesign.step',{current:step,total})}</span></div><ol aria-label={t('redesign.a11y.progress')}>{Array.from({length:total},(_,i)=><li key={i} aria-current={i+1===step?'step':undefined} className={i<step?styles.active:''}/>)}</ol></header><div className={styles.content}>
    {flow==='solo'&&step===1&&<><Title title={t('redesign.goal.title')} sub={t('redesign.goal.subtitle')}/><SoloStep4Goal selected={goal} onSelect={setGoal}/></>}
    {flow==='solo'&&step===2&&<><Title title={t('redesign.profile.title')} sub={t('redesign.profile.subtitle')}/><SoloStep2Profile {...{firstName,setFirstName,birthDate,setBirthDate,gender,setGender}}/><SoloStep3Body {...{weight,setWeight,height,setHeight,goalWeight,setGoalWeight}}/></>}
    {flow==='solo'&&step===3&&<><Title title={t('redesign.training.title')} sub={t('redesign.training.subtitle')}/><Group><SoloStep6Sessions sessions={sessionsPerWeek} setSessions={setSessionsPerWeek}/></Group><Group><SoloStep8Experience selected={experience} onSelect={setExperience}/></Group><Group><SoloStep5Activity selected={activityLevel} onSelect={setActivityLevel}/></Group><Group><SoloStep7Equipment locationIndex={locationIndex} homeEquipment={homeEquipment} onLocationSelect={setLocationIndex} onHomeEquipmentToggle={id=>setHomeEquipment(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id])}/></Group></>}
    {flow==='solo'&&step===4&&<><Title title={t('redesign.nutrition.title')} sub={t('redesign.nutrition.subtitle')}/><SoloStep7Nutrition selected={nutrition} onSelect={setNutrition}/><fieldset className={styles.restrictions}><legend>{t('redesign.nutrition.restrictions')}</legend><label><input type="radio" name="restrictions" checked={restrictions==='none'} onChange={()=>{setRestrictions('none');setRestrictionDetails('')}}/>{t('redesign.nutrition.none')}</label><label><input type="radio" name="restrictions" checked={restrictions==='some'} onChange={()=>setRestrictions('some')}/>{t('redesign.nutrition.some')}</label>{restrictions==='some'&&<label htmlFor="restriction-details"><span>{t('redesign.nutrition.details')}</span><input id="restriction-details" value={restrictionDetails} onChange={e=>setRestrictionDetails(e.target.value)}/></label>}</fieldset><button className={styles.disclosure} type="button" aria-expanded={advancedOpen} onClick={()=>setAdvancedOpen(v=>!v)}>{t('redesign.nutrition.advanced')}</button>{advancedOpen&&<SoloStep11Preferences mealPrefs={mealPrefs} dislikedFoods={dislikedFoods} onToggleFood={toggleFood} onAddDisliked={f=>setDislikedFoods(p=>p.includes(f)?p:[...p,f])} onRemoveDisliked={f=>setDislikedFoods(p=>p.filter(x=>x!==f))}/>}</>}
    {flow==='solo'&&step===5&&<><Title title={t('redesign.summary.title')} sub={t('redesign.summary.subtitle')}/><div className={styles.summary}><Summary label={t('redesign.goal.title')} value={goal===null?'—':t(`solo.step4.options.${GOALS[goal].id}`)} edit={()=>editStep(1)} t={t}/><Summary label={t('redesign.profile.title')} value={`${firstName} · ${weight} kg · ${height} cm`} edit={()=>editStep(2)} t={t}/><Summary label={t('redesign.training.title')} value={`${sessionsPerWeek} ${t('solo.step6.unit')}`} edit={()=>editStep(3)} t={t}/><Summary label={t('redesign.nutrition.title')} value={nutrition===null?'—':t(`solo.step7.options.${NUTRITION_OPTS[nutrition].id}`)} edit={()=>editStep(4)} t={t}/>{macros&&<div className={styles.macros}><strong>{t('redesign.summary.macros')}</strong><b>{macros.calorieGoal} kcal</b><span>{macros.protein}g · {macros.carbs}g · {macros.fat}g</span></div>}<SoloStep9PhotoBody photoUrl={photoBodyUrl} uploading={uploadingPhoto} onUpload={f=>upload(f)}/></div></>}
     {flow==='coachManaged'&&step===1&&<><Title title={t('redesign.profile.title')} sub={t('redesign.coach.profile')}/><InvitedStep1Profile {...{firstName,setFirstName,birthDate,setBirthDate,gender,setGender}}/></>}{flow==='coachManaged'&&step===2&&<><Title title={t('avatar.title')} sub={t('redesign.coach.optional')}/><InvitedStep2Avatar avatarUrl={avatarUrl} onUpload={f=>upload(f,true)}/></>}{flow==='coachManaged'&&step===3&&<InvitedStep3Welcome firstName={firstName} coachName={coachName}/>} {error&&<p className={styles.error} role="alert" aria-live="assertive">{error}</p>}</div><footer className={styles.nav}>{step>1&&<button type="button" className={styles.back} onClick={back} aria-label={t('redesign.back')}><ChevronLeft/></button>}<button type="button" className={styles.primary} disabled={!valid||saving} onClick={()=>void next()}>{saving?t('nav.saving'):step===total?t('redesign.finish'):t('nav.continue')}</button></footer></section></main>
}
function Title({title,sub}:{title:string;sub:string}){return <div className={styles.title}><h1>{title}</h1><p>{sub}</p></div>};function Group({children}:{children:React.ReactNode}){return <div className={styles.group}>{children}</div>}
function Summary({label,value,edit,t}:{label:string;value:string;edit:()=>void;t:Translate}){return <div className={styles.row}><div><strong>{label}</strong><p>{value}</p></div><button type="button" onClick={edit}>{t('redesign.edit')}</button></div>}
