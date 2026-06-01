/**
 * Consume the SSE stream from /api/generate-custom-program and return the program.
 *
 * The endpoint streams heartbeat 'progress' events during generation (to keep the
 * connection alive on Vercel edge — non-streamed long responses get cut, status '---'),
 * then a final 'done' event with the program, or an 'error' event.
 *
 * Errors before the stream (auth 401, rate limit 429, etc.) arrive as JSON (res not ok).
 *
 * Usage (replaces `const data = await res.json(); data.program`):
 *   const program = await consumeProgramStream(res)
 */
export async function consumeProgramStream(res: Response): Promise<any> {
  // Errors before the stream are plain JSON (non-2xx)
  if (!res.ok) {
    let msg = `HTTP ${res.status}`
    try {
      const err = await res.json()
      if (err?.error) msg = err.error
    } catch {
      // ignore parse failure
    }
    throw new Error(msg)
  }
  if (!res.body) throw new Error('No response body')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let program: any = null
  let streamError: string | null = null
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      try {
        const parsed = JSON.parse(line.slice(6))
        if (parsed.type === 'done') program = parsed.program
        else if (parsed.type === 'error') streamError = parsed.error
        // type 'progress' = heartbeat, ignore
      } catch {
        // ignore partial JSON chunks
      }
    }
  }

  if (streamError) throw new Error(streamError)
  return program
}
