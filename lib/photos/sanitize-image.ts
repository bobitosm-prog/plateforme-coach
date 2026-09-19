import 'server-only'
import sharp from 'sharp'

export class ImageValidationError extends Error {
  constructor(public readonly status: number) { super('Image unavailable') }
}

/** Decode then re-encode: no EXIF/GPS, XMP, IPTC, original filename or camera data.
 * Apply orientation before stripping it. Animated inputs use their first frame.
 */
export async function sanitizeImage(input: Buffer, maxBytes = 5_000_000) {
  if (!input.length || input.length > maxBytes) throw new ImageValidationError(413)
  try {
    const image = sharp(input, { limitInputPixels: 40_000_000, failOn: 'warning', pages: 1 })
    const metadata = await image.metadata()
    if (!['jpeg', 'png', 'webp', 'gif'].includes(metadata.format || '')) throw new ImageValidationError(415)
    const bytes = await image.rotate().resize(2048, 2048, { fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#ffffff' }).jpeg({ quality: 88 }).timeout({ seconds: 8 }).toBuffer()
    if (bytes.length > maxBytes) throw new ImageValidationError(413)
    return bytes
  } catch (error) {
    if (error instanceof ImageValidationError) throw error
    throw new ImageValidationError(415)
  }
}
