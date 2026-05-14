'use client'
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
      <div className="min-h-screen bg-[#0D0B08] flex items-center justify-center">
        <div className="flex items-center gap-3 text-zinc-400">
          <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Vérification des accès…</span>
        </div>
      </div>
    )
  }

  if (status === 'denied') {
    return (
      <div className="min-h-screen bg-[#0D0B08] flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-semibold text-zinc-100 mb-2">Accès refusé</h1>
          <p className="text-zinc-400 mb-6">
            Cet espace est réservé à l'administrateur de la plateforme.
          </p>
          <a
            href="/"
            className="inline-block px-5 py-2.5 rounded-xl bg-amber-400 text-[#0D0B08] font-medium hover:bg-amber-300 transition"
          >
            Retour à l'accueil
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0D0B08] text-zinc-100">
      <AdminSidebar pathname={pathname} email={email} />
      <main className="lg:pl-60 min-h-screen">
        <div className="px-6 lg:px-10 pt-16 lg:pt-10 pb-10 max-w-[1400px]">
          {children}
        </div>
      </main>
      <Toaster
        position="top-right"
        theme="dark"
        toastOptions={{
          style: {
            background: '#1A150E',
            border: '1px solid rgba(180, 83, 9, 0.2)',
            color: '#fafafa',
          },
        }}
      />
    </div>
  )
}
