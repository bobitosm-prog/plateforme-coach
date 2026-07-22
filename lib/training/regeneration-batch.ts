export async function runTrainingRegenerationBatches<T>(input: {
  items: readonly T[]
  concurrency: number
  signal: AbortSignal
  process: (item: T) => Promise<void>
}): Promise<void> {
  if (!Number.isInteger(input.concurrency) || input.concurrency < 1) {
    throw new TypeError('concurrency must be a positive integer')
  }

  for (let index = 0; index < input.items.length; index += input.concurrency) {
    if (input.signal.aborted) break
    const batch = input.items.slice(index, index + input.concurrency)
    const started: Promise<void>[] = []
    for (const item of batch) {
      if (input.signal.aborted) break
      started.push(input.process(item))
    }
    await Promise.all(started)
  }
}
