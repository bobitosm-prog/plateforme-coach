'use client'
import Link from 'next/link'
import { useState } from 'react'
import {
  LayoutDashboard, Users, DollarSign, ScrollText,
  LogOut, Menu, X, ExternalLink
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

const NAV = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Comptes', icon: Users },
  { href: '/admin/revenue', label: 'Revenue', icon: DollarSign },
  { href: '/admin/logs', label: 'Logs', icon: ScrollText },
] as const

interface Props {
  pathname: string
  email: string
}

export function AdminSidebar({ pathname, email }: Props) {
  const [open, setOpen] = useState(false)

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin'
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setOpen(!open)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-[#1A150E] border border-amber-900/40 text-zinc-300 shadow-lg shadow-black/40 backdrop-blur"
        aria-label="Toggle navigation"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Backdrop mobile */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-30"
          onClick={() => setOpen(false)}
        />
      )}

      <aside className={`
        fixed top-0 left-0 h-screen w-60 z-40
        bg-[#0A0805] border-r border-amber-900/15
        flex flex-col
        transition-transform duration-200 ease-out
        ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Brand */}
        <div className="px-6 py-7 border-b border-amber-900/10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-400 flex items-center justify-center text-[#0D0B08] font-bold text-sm">
              M
            </div>
            <div>
              <div className="text-zinc-100 font-semibold text-sm leading-tight">MoovX</div>
              <div className="text-zinc-500 text-[10px] uppercase tracking-wider">Admin Console</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(href)
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
                  transition-all duration-150
                  ${active
                    ? 'bg-amber-400/10 text-amber-400 shadow-[inset_0_0_0_1px_rgba(251,191,36,0.15)]'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.02]'
                  }
                `}
              >
                <Icon size={16} strokeWidth={2} />
                <span className="font-medium">{label}</span>
                {active && (
                  <div className="ml-auto w-1 h-1 rounded-full bg-amber-400" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Footer user */}
        <div className="border-t border-amber-900/10 p-3 space-y-1">
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.02] transition"
          >
            <ExternalLink size={16} strokeWidth={2} />
            <span>App principale</span>
          </Link>

          <button
            onClick={async () => {
              await supabase.auth.signOut()
              window.location.href = '/login'
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-400 hover:text-rose-400 hover:bg-rose-500/5 transition"
          >
            <LogOut size={16} strokeWidth={2} />
            <span>Déconnexion</span>
          </button>

          <div className="px-3 pt-3 mt-1 border-t border-amber-900/10">
            <div className="text-[10px] uppercase tracking-wider text-zinc-600 mb-1">Connecté</div>
            <div className="text-xs text-zinc-300 truncate" title={email}>{email}</div>
          </div>
        </div>
      </aside>
    </>
  )
}
