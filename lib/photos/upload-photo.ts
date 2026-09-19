'use client'

/** Server-side metadata removal; never fall back to uploading the raw file. */
export async function uploadPhoto(file: File, bucket: 'avatars' | 'progress-photos'): Promise<string> {
  if (file.size > 4_000_000) throw new Error('Photo trop volumineuse (maximum 4 Mo).')
  const response = await fetch(`/api/photos/upload?bucket=${bucket}`, {
    method: 'POST', body: file, headers: { 'Content-Type': 'application/octet-stream' },
  })
  const result = await response.json()
  if (!response.ok || typeof result.path !== 'string') throw new Error(result.error || 'Envoi de la photo impossible.')
  return result.path
}
