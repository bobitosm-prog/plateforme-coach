// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { hasWatchWorkoutBridge, watchWorkout } from '@/lib/training/watch-workout'
afterEach(()=>{delete (window as any).webkit;vi.useRealTimers()})
it('is a no-op on PWA and builds without the native bridge',async()=>{
 expect(hasWatchWorkoutBridge()).toBe(false)
 expect(await watchWorkout('sync','session')).toEqual({enabled:false,status:'unsupported'})
})
it('sends only action and stable session ID, never health samples or account data',async()=>{
 const postMessage=vi.fn().mockResolvedValue({enabled:true,status:'running'})
 ;(window as any).webkit={messageHandlers:{moovxWatchWorkout:{postMessage}}}
 await watchWorkout('sync','draft-uuid');await watchWorkout('finish','draft-uuid')
 expect(postMessage.mock.calls).toEqual([[{action:'sync',id:'draft-uuid'}],[{action:'finish',id:'draft-uuid'}]])
})
it('a rejected or stalled watch does not block the iPhone session',async()=>{
 vi.useFakeTimers()
 ;(window as any).webkit={messageHandlers:{moovxWatchWorkout:{postMessage:()=>new Promise(()=>{})}}}
 const result=watchWorkout('sync','id');await vi.advanceTimersByTimeAsync(8000)
 expect((await result).status).toBe('unavailable')
 ;(window as any).webkit.messageHandlers.moovxWatchWorkout.postMessage=()=>Promise.reject(new Error('Disconnected'))
 expect((await watchWorkout('finish','id')).status).toBe('unavailable')
})
