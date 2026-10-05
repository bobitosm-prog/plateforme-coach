export type WatchWorkoutStatus = { enabled: boolean; status: string }
type WatchAction = 'sync' | 'status' | 'enable' | 'disable' | 'finish' | 'discard'
function bridge() {
  return typeof window === 'undefined' ? undefined : (window as Window & {webkit?: {messageHandlers?: {moovxWatchWorkout?: {postMessage: (body: unknown) => Promise<WatchWorkoutStatus>}}}}).webkit?.messageHandlers?.moovxWatchWorkout
}
export function hasWatchWorkoutBridge() { return !!bridge() }
/** Never write HealthKit records from the web/iPhone: the Watch is the sole writer. */
export async function watchWorkout(action: WatchAction, draftId: string): Promise<WatchWorkoutStatus> {
  const handler = bridge()
  if (!handler) return {enabled:false,status:'unsupported'}
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      handler.postMessage({action,id:draftId}),
      new Promise<WatchWorkoutStatus>(resolve=>{timer=setTimeout(()=>resolve({enabled:true,status:'unavailable'}),8000)}),
    ])
  } catch { return {enabled:true,status:'unavailable'} }
  finally { if(timer)clearTimeout(timer) }
}
