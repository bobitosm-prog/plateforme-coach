'use client'
import { useState } from 'react'
import TypedConfirmDialog from '../../ui/TypedConfirmDialog'
import { useTranslations } from 'next-intl'
import { Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { RED, FONT_ALT } from '../../../../lib/design-tokens'

export default function DeleteAccountSection({ session }: { session: { user: { id: string } } }) {
  const t = useTranslations('profile.delete')
  const [showModal, setShowModal] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)

  const confirmWord = t('confirmWord')

  async function deleteAccount() {
    if (confirmText !== confirmWord) return
    setDeleting(true)
    try {
      const res = await fetch('/api/delete-account', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: session.user.id }),
      })
      if (res.ok) {
        await supabase.auth.signOut()
        window.location.href = '/login'
      }
      else { const { error } = await res.json(); alert(`Erreur : ${error || t('errorGeneric')}`); setDeleting(false) }
    } catch { alert(t('errorNetwork')); setDeleting(false) }
  }

  return (
    <>
      <button onClick={() => setShowModal(true)} style={{ width: '100%', background: 'transparent', border: `1px solid ${RED}`, borderRadius: 12, padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer', marginTop: 24 }}>
        <Trash2 size={16} color={RED} />
        <span style={{ fontSize: '0.82rem', fontFamily: FONT_ALT, fontWeight: 600, color: RED }}>{t('button')}</span>
      </button>
      <TypedConfirmDialog
        open={showModal}
        title={t('title')}
        warning={t('warning')}
        instruction={t.rich('confirmPrompt', { word: confirmWord, bold: chunks => <strong style={{ color: RED }}>{chunks}</strong> })}
        inputLabel={t.rich('confirmPrompt', { word: confirmWord, bold: chunks => chunks })}
        placeholder={t('placeholder')}
        value={confirmText}
        expectedValue={confirmWord}
        confirmLabel={t('submit')}
        busyLabel={t('deleting')}
        cancelLabel={t('cancel')}
        busy={deleting}
        onValueChange={setConfirmText}
        onConfirm={deleteAccount}
        onCancel={() => { setShowModal(false); setConfirmText('') }}
      />
    </>
  )
}
