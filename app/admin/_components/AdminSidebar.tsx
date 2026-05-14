'use client'
import Link from 'next/link'
import { useState } from 'react'
import {
  LayoutGrid, Users, DollarSign, ScrollText, MessageSquare,
  LogOut, Menu, X, ExternalLink
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

const NAV = [
  { href: '/admin', label: 'Overview', icon: LayoutGrid },
  { href: '/admin/users', label: 'Comptes', icon: Users },
  { href: '/admin/revenue', label: 'Revenue', icon: DollarSign },
  { href: '/admin/feedback', label: 'Feedback', icon: MessageSquare },
  { href: '/admin/logs', label: 'Logs', icon: ScrollText },
] as const

interface Props {
  pathname: string
  email: string
  fullName: string
}

export function AdminSidebar({ pathname, email, fullName }: Props) {
  const [open, setOpen] = useState(false)
  const isActive = (href: string) => href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)

  const initials = fullName
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'A'

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setOpen(!open)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 rounded-xl"
        style={{
          background: '#0e0e0e',
          border: '1px solid rgba(201, 168, 76, 0.25)',
          color: '#d4a843',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        }}
        aria-label="Toggle navigation"
      >
        {open ? <X size={18} /> : <Menu size={18} />}
      </button>

      {open && (
        <div
          className="lg:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-30"
          onClick={() => setOpen(false)}
        />
      )}

      <aside className={`
        admin-sidebar transition-transform duration-200 ease-out
        ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Brand header */}
        <div className="px-6 pt-7 pb-5">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #e6c364 0%, #c9a84c 100%)',
                boxShadow: '0 4px 14px rgba(212, 168, 67, 0.25)',
              }}
            >
              <span className="font-bold" style={{ color: '#0d0b08', fontSize: '1.1rem', fontFamily: 'var(--font-display)' }}>
                M
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="admin-headline" style={{ fontSize: '1.4rem' }}>
                MOOVX
              </span>
              <span
                className="px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider"
                style={{
                  background: 'rgba(212, 168, 67, 0.12)',
                  color: '#d4a843',
                  border: '1px solid rgba(212, 168, 67, 0.2)',
                }}
              >
                ADMIN
              </span>
            </div>
          </div>
        </div>

        {/* User card */}
        <div className="mx-4 mb-5 px-4 py-3.5 rounded-xl admin-card-flat">
          <div className="flex items-center gap-3 min-w-0">
            <div className="admin-avatar w-10 h-10" style={{ fontSize: '0.85rem' }}>
              {initials}
            </div>
            <div className="min-w-0">
              <div className="admin-headline text-sm truncate" title={fullName}>
                {fullName}
              </div>
              <div className="admin-label" style={{ fontSize: '0.55rem' }}>
                ADMIN · ROOT
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2 space-y-0.5 overflow-y-auto">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(href)
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`admin-nav-item ${active ? 'admin-nav-item-active' : ''}`}
              >
                <Icon size={16} strokeWidth={1.8} />
                <span>{label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="border-t p-3 space-y-0.5" style={{ borderColor: 'rgba(201, 168, 76, 0.08)' }}>
          <Link href="/" className="admin-nav-item" style={{ margin: 0 }}>
            <ExternalLink size={16} strokeWidth={1.8} />
            <span>App principale</span>
          </Link>

          <button
            onClick={async () => {
              await supabase.auth.signOut()
              window.location.href = '/login'
            }}
            className="admin-nav-item w-full"
            style={{ margin: 0 }}
          >
            <LogOut size={16} strokeWidth={1.8} />
            <span>Deconnexion</span>
          </button>

          <div className="px-4 pt-3 mt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
            <div className="admin-label" style={{ fontSize: '0.55rem' }}>Connecte</div>
            <div className="text-xs truncate mt-0.5" style={{ color: '#d0c5b2' }} title={email}>
              {email}
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
