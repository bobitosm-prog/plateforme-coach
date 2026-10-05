export type DailyEnergy = {
  status: 'off' | 'unsupported' | 'busy' | 'error' | 'ready'
  date?: string
  through?: number
  active?: number | null
  resting?: number | null
}
type Action = 'read' | 'connect' | 'disconnect'
function bridge() {
  return typeof window === 'undefined' ? undefined : (window as Window & {
    webkit?: {messageHandlers?: {moovxDailyEnergy?: {postMessage: (body: unknown) => Promise<unknown>}}}
  }).webkit?.messageHandlers?.moovxDailyEnergy
}
export function hasDailyEnergyBridge() { return !!bridge() }
export function energyTotal(value: DailyEnergy): number | null {
  return value.status === 'ready' && typeof value.active === 'number' && Number.isFinite(value.active) && value.active >= 0
    && typeof value.resting === 'number' && Number.isFinite(value.resting) && value.resting >= 0
    ? value.active + value.resting : null
}
export async function dailyEnergy(action: Action, account: string, date: string): Promise<DailyEnergy> {
  const handler = bridge()
  if (!handler) return {status:'unsupported'}
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const result = await Promise.race([
      handler.postMessage({action,account,date}),
      new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('timeout')),action==='connect'?120000:15000)}),
    ]) as DailyEnergy
    if (!result || !['off','unsupported','busy','error','ready'].includes(result.status)) return {status:'error'}
    if (result.status === 'ready' && (result.date !== date || !Number.isFinite(result.through))) return {status:'error'}
    return result
  } catch { return {status:'error'} }
  finally { if(timer) clearTimeout(timer) }
}
