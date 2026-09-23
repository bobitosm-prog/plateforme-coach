'use client'
import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Camera, ScanBarcode, Trash2 } from 'lucide-react'
import { RailOverlay } from '../ui/RailOverlay'
import TrainingSheet from '../training-v2/TrainingSheet'
import BarcodeScanner from '../BarcodeScanner'
import { normalizeFoodItem } from '../../../lib/utils/food'
import { draftFood, draftNutrients, mealDraftRows, persistMealDraft, type MealDraftFood } from '../../../lib/nutrition/meal-draft'
import styles from './MealComposer.module.css'

interface Props {
  supabase: any; userId: string; date: string; mealType: string; mealLabel: string
  plannedFoods: Record<string, any>[]; initialFoods?: Record<string, any>[]
  photoEnabled: boolean; onClose: () => void; onSaved: () => Promise<void>
}

export default function MealComposer({supabase, userId, date, mealType, mealLabel, plannedFoods, initialFoods, photoEnabled, onClose, onSaved}: Props) {
  const t = useTranslations('nutrition_tab.composer')
  const [foods, setFoods] = useState<MealDraftFood[]>([])
  const [query, setQuery] = useState('')
  const [source, setSource] = useState('recent')
  const [recent, setRecent] = useState<any[]>([])
  const [favorites, setFavorites] = useState<any[]>([])
  const [saved, setSaved] = useState<any[]>([])
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [readError, setReadError] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [locked, setLocked] = useState(false)
  const [retry, setRetry] = useState(0)
  const [scanner, setScanner] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [discard, setDiscard] = useState(false)
  const submission = useRef<ReturnType<typeof mealDraftRows> | null>(null)
  const busy = useRef(false)
  const alive = useRef(true)
  const photoInput = useRef<HTMLInputElement>(null)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  const initialized = useRef(false)
  useEffect(() => { if (!initialized.current) { initialized.current = true; if (initialFoods?.length) add(initialFoods) } }, [])

  function add(items: Record<string, any>[]) {
    if (locked || busy.current) return
    try { const next = items.map(draftFood); setFoods(current => [...current, ...next]); setError(null) }
    catch { setError(t('invalid')) }
  }

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setReadError(false)
    Promise.all([
      supabase.from('daily_food_logs').select('custom_name,quantity_g,calories,protein,carbs,fat').eq('user_id',userId).order('created_at',{ascending:false}).limit(30).abortSignal(controller.signal),
      supabase.from('saved_meals').select('id,name,foods').eq('user_id',userId).order('created_at',{ascending:false}).limit(100).abortSignal(controller.signal),
      supabase.from('profiles').select('liked_foods').eq('id',userId).single().abortSignal(controller.signal),
      supabase.from('food_items').select('id,name,energy_kcal,proteins,carbohydrates,fat,source').eq('source','fitness').limit(200).abortSignal(controller.signal),
    ]).then(([logs, meals, profile, catalog]: any[]) => {
      if (controller.signal.aborted) return
      setReadError([logs,meals,profile,catalog].some(result=>result.error))
      setRecent((logs.data ?? []).filter((food:any,index:number,list:any[])=>list.findIndex(item=>item.custom_name===food.custom_name)===index))
      setSaved(meals.data ?? [])
      const liked = Array.isArray(profile.data?.liked_foods) ? profile.data.liked_foods : []
      setFavorites((catalog.data ?? []).filter((food:any)=>liked.includes(food.id) || liked.includes(food.name)).map(fromCatalog))
      setLoading(false)
    }).catch(()=> { if (!controller.signal.aborted) {setReadError(true);setLoading(false)} })
    return () => controller.abort()
  }, [supabase,userId,retry])

  function fromCatalog(food:any) {
    const item = normalizeFoodItem(food)
    return {name:item.nom,quantity_g:100,calories:item.calories,protein:item.proteines,carbs:item.glucides,fat:item.lipides}
  }

  useEffect(() => {
    const controller = new AbortController()
    setResults([])
    setSearching(query.trim().length >= 2)
    if (query.trim().length < 2) return
    const timer = setTimeout(async()=> {
      try {
      const {data,error} = await supabase.from('food_items').select('id,name,energy_kcal,proteins,carbohydrates,fat,source')
        .ilike('name',`%${query.trim().replace(/[%_]/g,'')}%`).order('name').limit(30).abortSignal(controller.signal)
      if (!controller.signal.aborted) { setResults((data ?? []).map(fromCatalog)); if (error) setError(t('searchError')) }
      } catch { if (!controller.signal.aborted) setError(t('searchError')) }
      finally { if (!controller.signal.aborted) setSearching(false) }
    },300)
    return ()=> {clearTimeout(timer);controller.abort()}
  },[query,supabase,t])

  async function analyze(file?: File) {
    if (!file || analyzing || locked) return
    if (file.size > 5_000_000 || !['image/jpeg','image/png','image/webp'].includes(file.type)) {setError(t('photoInvalid'));return}
    setAnalyzing(true);setError(null)
    try {
      const image = await new Promise<string>((resolve,reject)=> {const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=reject;reader.readAsDataURL(file)})
      const response = await fetch('/api/analyze-meal-photo',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image})})
      if (!response.ok) throw new Error('PHOTO_FAILED')
      const result=await response.json()
      if (!Array.isArray(result.foods) || !result.foods.length) throw new Error('PHOTO_INVALID')
      if (alive.current) add(result.foods)
    } catch {if (alive.current) setError(t('photoError'))}
    finally {if (alive.current) setAnalyzing(false)}
  }

  async function save() {
    if (busy.current || analyzing) return
    busy.current=true;setSaving(true);setError(null)
    try {
      submission.current ??= mealDraftRows(foods,userId,date,mealType)
      setLocked(true)
      await persistMealDraft(supabase,submission.current)
    } catch {setError(t(submission.current ? 'saveError' : 'invalid'));setSaving(false);busy.current=false;return}
    // Refresh is not part of the write: never offer a second insertion if refresh fails.
    try { await onSaved() } catch { /* The confirmed write succeeded; the parent retries its refresh on close. */ }
    finally { if (alive.current) {setSaving(false);busy.current=false;onClose()} }
  }

  function close() { if (busy.current) return; if (foods.length) setDiscard(true); else onClose() }
  const totals=foods.reduce((sum,food)=> {const n=draftNutrients(food);return {calories:sum.calories+n.calories,protein:sum.protein+n.protein,carbs:sum.carbs+n.carbs,fat:sum.fat+n.fat}}, {calories:0,protein:0,carbs:0,fat:0})
  const valid=foods.length>0 && foods.every(food=>Number.isFinite(food.quantity) && food.quantity>0)

  return <RailOverlay><div className={styles.sheet}>{scanner ? <BarcodeScanner supabase={supabase} userId={userId} defaultMealType={mealType} onProductAdded={()=>{}} onClose={()=>setScanner(false)} onSelected={food=>{add([food]);setScanner(false)}} /> :
    <TrainingSheet viewportContained title={mealLabel} description={`${date} · ${t('draft')}`} onClose={close}>
      <div className={styles.body}>
        {discard ? <div role="alert"><p>{t(locked ? 'uncertainClose' : 'discard')}</p><button onClick={()=>setDiscard(false)}>{t('keep')}</button> <button onClick={onClose}>{t('close')}</button></div> : <>
        <div className={styles.search}>
          <input aria-label={t('search')} placeholder={t('search')} value={query} disabled={locked} onChange={event=>setQuery(event.target.value)} />
          <button type="button" disabled={locked || analyzing} aria-label={t('barcode')} onClick={()=>setScanner(true)}><ScanBarcode size={18}/></button>
          {photoEnabled && <button type="button" disabled={locked || analyzing} aria-label={t('photo')} onClick={()=>photoInput.current?.click()}><Camera size={18}/></button>}
          <input ref={photoInput} hidden type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={event=>{void analyze(event.target.files?.[0]);event.target.value=''}} />
        </div>
        {analyzing && <p role="status">{t('analyzing')}</p>}
        {photoEnabled && <p className={styles.muted}>{t('photoHint')}</p>}
        {query.trim().length < 2 && <div className={styles.sources}>{['recent','favorites','saved','plan'].map(key=><button key={key} disabled={locked} aria-pressed={source===key} onClick={()=>setSource(key)}>{t(key)}</button>)}</div>}
        {loading && <p role="status">{t('loading')}</p>}
        {readError && <p role="status">{t('readError')} <button onClick={()=>setRetry(value=>value+1)}>{t('retry')}</button></p>}
        <div className={styles.choices}>
          {searching && <p role="status">{t('loading')}</p>}
          {!searching && query.trim().length >= 2 && !results.length && <p role="status">{t('emptySource')}</p>}
          {query.trim().length>=2 ? results.map((food,index)=><button key={index} disabled={locked || analyzing} onClick={()=>add([food])}>{food.name}<span>+</span></button>) :
            source==='plan' ? (plannedFoods.length ? <button disabled={locked || analyzing} onClick={()=>add(plannedFoods)}>{t('usePlan')}<span>+</span></button> : <p className={styles.muted}>{t('noPlan')}</p>) :
            source==='saved' ? saved.map(meal=><button key={meal.id} disabled={locked || analyzing} onClick={()=>add(meal.foods ?? [])}>{meal.name}<span>+</span></button>) :
            (source==='recent' ? recent : favorites).map((food,index)=><button key={index} disabled={locked || analyzing} onClick={()=>add([food])}>{food.custom_name ?? food.name}<span>+</span></button>)}
          {!loading && !query && ((source==='recent'&&!recent.length)||(source==='favorites'&&!favorites.length)||(source==='saved'&&!saved.length)) && <p className={styles.muted}>{t('emptySource')}</p>}
        </div>
        <h3>{t('selection',{count:foods.length})}</h3>
        {!foods.length && <p className={styles.muted}>{t('empty')}</p>}
        <ul className={styles.draft}>{foods.map(food=><li key={food.id}>
          <div>{food.name}<small>{Number.isFinite(food.quantity) ? draftNutrients(food).calories : '—'} kcal</small></div>
          <label>{t('grams')}<input aria-label={`${t('quantity')} — ${food.name}`} type="number" min="0.1" step="0.1" value={Number.isFinite(food.quantity)?food.quantity:''} disabled={locked || analyzing} onChange={event=>setFoods(current=>current.map(item=>item.id===food.id ? {...item,quantity:event.target.value===''?NaN:Number(event.target.value)} : item))}/></label>
          <button disabled={locked || analyzing} aria-label={`${t('remove')} — ${food.name}`} onClick={()=>setFoods(current=>current.filter(item=>item.id!==food.id))}><Trash2 size={16}/></button>
        </li>)}</ul>
        {error && <p className={styles.error} role="alert">{error}</p>}
        <div className={styles.footer}>
          <div aria-live="polite">{valid ? `${totals.calories} kcal · P ${totals.protein.toFixed(1)} g · G ${totals.carbs.toFixed(1)} g · L ${totals.fat.toFixed(1)} g` : '—'}</div>
          <button disabled={!valid || saving || analyzing} onClick={()=>void save()}>{saving?t('saving'):locked?t('retry'):t('confirm')}</button>
        </div>
        </>}
      </div>
    </TrainingSheet>}
  </div></RailOverlay>
}
