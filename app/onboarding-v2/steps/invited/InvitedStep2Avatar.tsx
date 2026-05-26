'use client'
import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Camera, Upload } from 'lucide-react'
import { colors, fonts, cardStyle, radii, btnSecondary } from '@/lib/design-tokens'

interface InvitedStep2AvatarProps {
  avatarUrl: string | null
  onUpload: (file: File) => Promise<void>
}

export default function InvitedStep2Avatar({
  avatarUrl,
  onUpload,
}: InvitedStep2AvatarProps) {
  const t = useTranslations('onboarding_v2')
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      await onUpload(file)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 24,
        paddingTop: 16,
      }}
    >
      {/* Avatar circle */}
      <div
        onClick={() => fileRef.current?.click()}
        style={{
          width: 140,
          height: 140,
          borderRadius: '50%',
          border: `2px dashed ${avatarUrl ? colors.gold : colors.goldBorder}`,
          background: avatarUrl ? 'none' : 'rgba(230,195,100,0.04)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          overflow: 'hidden',
          transition: 'border-color 0.2s',
        }}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="Avatar"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <Camera size={40} color={colors.textDim} />
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        style={{ display: 'none' }}
      />

      {/* Upload button */}
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        style={{
          ...btnSecondary,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '12px 24px',
          opacity: uploading ? 0.5 : 1,
        }}
      >
        <Upload size={16} />
        {uploading ? t('avatar.uploading') : t('avatar.choosePhoto')}
      </button>

      <p
        style={{
          fontFamily: fonts.body,
          fontSize: 13,
          color: colors.textDim,
          textAlign: 'center',
          maxWidth: 260,
        }}
      >
        {t('avatar.hint')}
      </p>
    </div>
  )
}
