'use client'
import { useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Camera } from 'lucide-react'
import { colors, fonts, btnSecondary } from '@/lib/design-tokens'

interface SoloStep9PhotoBodyProps {
  photoUrl: string | null
  onUpload: (file: File) => Promise<void>
  uploading: boolean
}

export default function SoloStep9PhotoBody({ photoUrl, onUpload, uploading }: SoloStep9PhotoBodyProps) {
  const t = useTranslations('onboarding_v2')
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) onUpload(file)
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 20,
        paddingTop: 16,
      }}
    >
      {/* Warning hint */}
      <p
        style={{
          fontFamily: fonts.body,
          fontSize: 13,
          color: colors.textDim,
          textAlign: 'center',
          maxWidth: 280,
          fontStyle: 'italic',
        }}
      >
        {t('solo.step9.warning')}
      </p>

      {/* Photo area */}
      <div
        onClick={() => fileRef.current?.click()}
        style={{
          width: 200,
          height: 200,
          borderRadius: 16,
          border: `2px dashed ${photoUrl ? colors.gold : colors.goldBorder}`,
          background: photoUrl ? 'none' : 'rgba(230,195,100,0.04)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          overflow: 'hidden',
          transition: 'border-color 0.2s',
        }}
      >
        {photoUrl ? (
          <img
            src={photoUrl}
            alt="Body"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{ textAlign: 'center' }}>
            <Camera size={36} color={colors.textDim} />
            <p style={{ fontFamily: fonts.body, fontSize: 13, color: colors.textDim, marginTop: 8 }}>
              {t('solo.step9.choosePhoto')}
            </p>
          </div>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        style={{ display: 'none' }}
      />

      {/* Change button (visible only when photo set) */}
      {photoUrl && (
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          style={{
            ...btnSecondary,
            padding: '10px 20px',
            opacity: uploading ? 0.5 : 1,
          }}
        >
          {uploading ? '...' : t('solo.step9.change')}
        </button>
      )}
    </div>
  )
}
