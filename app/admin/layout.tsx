'use client'
import './admin.css'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { ADMIN_EMAIL } from '@/lib/constants'
import { AdminSidebar } from './_components/AdminSidebar'
import { Toaster } from 'sonner'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [status, setStatus] = useState<'loading' | 'denied' | 'ok'>('loading')
  const [email, setEmail] = useState<string>('')
  const [fullName, setFullName] = useState<string>('')

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!mounted) return
      if (!session) {
        router.replace('/login')
        return
      }
      const userEmail = session.user.email || ''
      setEmail(userEmail)

      const { data: prof } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', session.user.id)
        .single()
      setFullName(prof?.full_name || userEmail.split('@')[0])

      if (userEmail !== ADMIN_EMAIL) {
        setStatus('denied')
        return
      }
      setStatus('ok')
    })()
    return () => { mounted = false }
  }, [router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#131313' }}>
        <div className="flex items-center gap-3" style={{ color: '#99907e' }}>
          <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: '#d4a843', borderTopColor: 'transparent' }} />
          <span className="admin-label">Verification des acces</span>
        </div>
      </div>
    )
  }

  if (status === 'denied') {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: '#131313' }}>
        <div className="max-w-md text-center admin-card p-10">
          <div className="text-5xl mb-5">🔒</div>
          <h1 className="admin-headline text-3xl mb-3">Acces refuse</h1>
          <p style={{ color: '#99907e' }} className="text-sm mb-7">
            Cet espace est reserve a l'administrateur de la plateforme.
          </p>
          <a href="/" className="admin-btn-gold">
            Retour a l'accueil
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#131313', color: '#e5e2e1' }}>
      <AdminSidebar pathname={pathname} email={email} fullName={fullName} />
      <main className="admin-main">
        <div className="admin-container">
          {children}
        </div>
      </main>
      <Toaster
        position="top-right"
        theme="dark"
        toastOptions={{
          style: {
            background: '#0e0e0e',
            border: '1px solid rgba(201, 168, 76, 0.25)',
            color: '#e5e2e1',
          },
        }}
      />
    </div>
  )
}
