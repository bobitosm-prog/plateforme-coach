import { aiFailure } from './errors'
import type { AiCancellationSignal, AiResult, AiTimeoutScheduler } from './types'

export async function runAiOperation<T>(options: {
  operation: () => Promise<AiResult<T>>
  scheduler: AiTimeoutScheduler
  timeoutMs: number
  correlationId: string
  requestedModel: string
  cancellation?: AiCancellationSignal
}): Promise<AiResult<T>> {
  if (options.cancellation?.aborted) return aiFailure({ code: 'cancelled', retryable: false, correlationId: options.correlationId, requestedModel: options.requestedModel })

  let settled = false
  let unsubscribe: () => void = () => undefined
  let timeoutHandle: unknown

  const terminal = new Promise<AiResult<T>>(resolve => {
    const finish = (result: AiResult<T>) => {
      if (settled) return
      settled = true
      resolve(result)
    }
    timeoutHandle = options.scheduler.schedule(() => finish(aiFailure({ code: 'timeout', retryable: true, correlationId: options.correlationId, requestedModel: options.requestedModel })), options.timeoutMs)
    unsubscribe = options.cancellation?.subscribe(() => finish(aiFailure({ code: 'cancelled', retryable: false, correlationId: options.correlationId, requestedModel: options.requestedModel }))) ?? unsubscribe
    options.operation().then(finish, () => finish(aiFailure({ code: 'unexpected_error', retryable: false, correlationId: options.correlationId, requestedModel: options.requestedModel })))
  })

  const result = await terminal
  options.scheduler.cancel(timeoutHandle)
  unsubscribe()
  return result
}
