import 'server-only'

const MODEL = 'gemini-3.1-flash-image-preview' // Nano Banana 2

export interface GeneratedImage {
  bytes: Uint8Array
  mimeType: string
}

/**
 * Génère une image via l'API Gemini (Nano Banana 2) à partir d'un prompt texte.
 * Retourne les octets bruts + le mime type. Clé lue côté serveur uniquement.
 */
export async function generateImage(prompt: string): Promise<GeneratedImage> {
  const apiKey = process.env.GEMINI_API_KEY?.trim()
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured')

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ['IMAGE'] },
      }),
    },
  )

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(`Gemini generateImage failed (${res.status}): ${body?.error?.message || res.statusText}`)
  }

  const data = await res.json() as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          inlineData?: { data?: string; mimeType?: string }
        }>
      }
    }>
  }
  const parts = data.candidates?.[0]?.content?.parts ?? []
  const inline = parts.find(part => part.inlineData)?.inlineData
  if (!inline?.data) {
    throw new Error('Gemini: aucune image dans la réponse')
  }
  return {
    bytes: new Uint8Array(Buffer.from(inline.data, 'base64')),
    mimeType: inline.mimeType || 'image/jpeg',
  }
}
