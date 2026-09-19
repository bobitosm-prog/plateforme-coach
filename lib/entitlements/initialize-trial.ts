/** Only the database may grant the one-time trial; never write its date client-side. */
export async function initializeTrial(client: {
  rpc: (name: 'set_initial_trial') => PromiseLike<{ data: unknown; error: unknown }>
}): Promise<boolean> {
  try {
    const { data, error } = await client.rpc('set_initial_trial')
    if (error || !data || typeof data !== 'object') return false
    const result = data as { set?: unknown; reason?: unknown }
    return result.set === true || (result.set === false && (
      result.reason === 'trial_already_set' || result.reason === 'already_has_access'
    ))
  } catch {
    return false
  }
}
