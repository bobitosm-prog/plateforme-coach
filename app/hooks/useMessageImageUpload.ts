'use client'

import { useState } from 'react'

const MAX_DIMENSION = 1080
const JPEG_QUALITY = 0.8
const MAX_FILE_SIZE = 2 * 1024 * 1024

async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height, 1)
      width = Math.round(width * ratio)
      height = Math.round(height * ratio)
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas context unavailable')); return }
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error('Compression failed')),
        'image/jpeg',
        JPEG_QUALITY
      )
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')) }
    img.src = url
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useMessageImageUpload(supabase: any) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const uploadImage = async (file: File): Promise<string | null> => {
    setUploading(true)
    setError(null)
    try {
      if (!file.type.startsWith('image/')) throw new Error('Le fichier doit être une image')
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Utilisateur non authentifié')
      const compressed = await compressImage(file)
      if (compressed.size > MAX_FILE_SIZE) throw new Error('Image trop grande après compression (max 2MB)')
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2, 10)}.jpg`
      const { error: uploadError } = await supabase.storage.from('message-media').upload(path, compressed, { contentType: 'image/jpeg', cacheControl: '3600', upsert: false })
      if (uploadError) throw new Error(uploadError.message)
      return path
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur upload'
      setError(msg)
      console.error('[useMessageImageUpload]', msg)
      return null
    } finally {
      setUploading(false)
    }
  }

  return { uploadImage, uploading, error }
}
