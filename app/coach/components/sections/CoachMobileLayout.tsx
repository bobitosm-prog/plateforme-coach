'use client'

import type React from 'react'
import dynamic from 'next/dynamic'
import { format } from 'date-fns'
import { Activity, Calendar, Check, Clock, Dumbbell, Home, LogOut, MessageCircle, Plus, Users, X } from 'lucide-react'
import { cache } from '@/lib/cache'
import { BG_BASE, BG_CARD_2, BORDER, FONT_ALT, FONT_BODY, FONT_DISPLAY, GOLD, GOLD_DIM, GOLD_RULE, GREEN, RADIUS_CARD, RED, TEXT_MUTED, TEXT_PRIMARY } from '@/lib/design-tokens'
import { SESSION_COLORS, SESSION_TYPES, WP_DAYS, WP_HOURS, WP_MINS, WP_MONTHS, WP_YEARS } from '../../hooks/useCoachDashboard'
import BugReport from '../../../components/BugReport'
import CoachSectionFallback from './CoachSectionFallback'
import CoachSessionWheelPicker from './CoachSessionWheelPicker'
import type { CoachPageLayoutProps, CoachSection } from './coach-page-types'

const ClientsList = dynamic(() => import('../ClientsList'), { loading: CoachSectionFallback })
const CoachCalendar = dynamic(() => import('../CoachCalendar'), { loading: CoachSectionFallback })
const CoachMessages = dynamic(() => import('../CoachMessages'), { loading: CoachSectionFallback })
const CoachAliments = dynamic(() => import('../CoachAliments'), { loading: CoachSectionFallback })
const CoachProfile = dynamic(() => import('../CoachProfile'), { loading: CoachSectionFallback })
const CoachPrograms = dynamic(() => import('../CoachPrograms'), { loading: CoachSectionFallback })
const CoachAnalytics = dynamic(() => import('../CoachAnalytics'), { loading: CoachSectionFallback })
const SessionDetailModal = dynamic(() => import('../SessionDetailModal'), { loading: CoachSectionFallback })

export default function CoachMobileLayout({ h, isMobile, revMonth, setRevMonth, revYear, setRevYear, inviteEmail, setInviteEmail, inviteSending, inviteSent, createdInvitationId, sendInviteEmail, revokeCreatedInvitation }: CoachPageLayoutProps) {


/* ══════════════════════════════════════════════════════════
   MOBILE LAYOUT (<1024px) — original code below
══════════════════════════════════════════════════════════ */
return (
  <div style={{ minHeight: '100vh', background: BG_BASE, color: TEXT_PRIMARY, fontFamily: FONT_BODY, overflowX: 'hidden', maxWidth: '100vw', paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}>

    {/* ── GLASS BAR HEADER ── */}
    <div style={{ padding: '12px 14px 0', position: 'sticky', top: 0, zIndex: 50 }}>
      <div className="stitch-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: 18 }}>
        {/* Left: Messages */}
        <button onClick={() => h.setSection(s => s === 'messages' ? 'accueil' : 'messages')} style={{ width: 38, height: 38, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: h.section === 'messages' ? GOLD_DIM : 'transparent', border: h.section === 'messages' ? `1px solid ${GOLD_RULE}` : '1px solid transparent', cursor: 'pointer', position: 'relative', zIndex: 3 }}>
          <MessageCircle size={19} color={h.section === 'messages' ? GOLD : TEXT_MUTED} strokeWidth={1.5} />
          {h.totalUnread > 0 && <div style={{ position: 'absolute', top: 7, right: 7, width: 7, height: 7, borderRadius: '50%', background: RED, border: '2px solid rgba(20,18,9,0.8)' }} />}
        </button>
        {/* Center: Logo pill PRO */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: GOLD_DIM, border: `1px solid ${GOLD_DIM}`, borderRadius: 14, padding: '6px 14px', zIndex: 3 }}>
          <span style={{ fontFamily: FONT_DISPLAY, fontSize: 18, letterSpacing: 4, background: 'linear-gradient(135deg, #E8C97A, #D4A843, #8B6914)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1 }}>MOOVX</span>
          <span style={{ fontFamily: FONT_ALT, fontSize: 8, fontWeight: 700, letterSpacing: 2, color: '#0D0B08', padding: '2px 6px', background: GOLD, borderRadius: 4 }}>PRO</span>
        </div>
        {/* Right: Profil + Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, zIndex: 3 }}>
          <button onClick={() => h.setSection('profil')} style={{ width: 34, height: 34, borderRadius: '50%', border: h.section === 'profil' ? `1.5px solid ${GOLD}` : `1.5px solid ${GOLD_RULE}`, background: GOLD_DIM, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontFamily: FONT_DISPLAY, fontSize: 14, color: GOLD }}>
            {h.coachInitials}
          </button>
          <button onClick={() => { cache.clearAll(); h.supabase.auth.signOut().then(() => { window.location.href = '/login' }) }} style={{ width: 34, height: 34, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: '1px solid transparent', cursor: 'pointer' }}>
            <LogOut size={16} color={TEXT_MUTED} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>

    {/* ── Stripe warning banner ── */}
    {h.coachProfile && !h.coachProfile.stripe_onboarding_complete && (
      <div style={{ background: GOLD_DIM, borderBottom: `1px solid ${GOLD_RULE}`, padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <span style={{ color: GOLD, fontSize: 13, fontFamily: FONT_BODY }}>{h.coachProfile?.stripe_account_id ? 'Configuration Stripe incomplète' : 'Stripe non connecté'} — configure Stripe pour recevoir les paiements</span>
        <button onClick={h.handleStripeConnect} disabled={h.stripeConnecting}
          style={{ background: GOLD, color: BG_BASE, border: 'none', padding: '5px 14px', borderRadius: 12, fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: FONT_ALT }}>
          {h.stripeConnecting ? 'Connexion...' : 'Configurer'}
        </button>
      </div>
    )}

    {/* ══════════════ NEW SESSION MODAL ══════════════ */}
    {h.showNewSession && (
      <div className="modal-bg" onClick={() => h.setShowNewSession(false)}>
        <div className="modal-box" onClick={e => e.stopPropagation()}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: `1px solid ${BORDER}` }}>
            <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: '1.4rem', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_PRIMARY, margin: 0 }}>Nouvelle séance</h2>
            <button onClick={() => h.setShowNewSession(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: TEXT_MUTED, padding: 4 }}><X size={18} /></button>
          </div>
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="form-label">Client *</label>
              <select value={h.nsClientId} onChange={e => h.setNsClientId(e.target.value)} className="form-input" style={{ cursor: 'pointer' }}>
                <option value="">Sélectionner un client…</option>
                {h.clients.map(c => <option key={c.client_id} value={c.client_id}>{c.profiles?.full_name ?? c.client_id}</option>)}
              </select>
            </div>
            {(() => {
              const [yr, mo, da] = h.nsDate.split('-')
              const moDisp = WP_MONTHS[parseInt(mo) - 1] ?? WP_MONTHS[0]
              return (
                <div>
                  <label className="form-label">Date</label>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '4px 0', background: BG_BASE, borderRadius: 2 }}>
                    <CoachSessionWheelPicker width={56} label="Jour" items={WP_DAYS} value={da} onChange={d => h.setNsDate(`${yr}-${mo}-${d}`)} />
                    <CoachSessionWheelPicker width={68} label="Mois" items={WP_MONTHS} value={moDisp} onChange={m => { const n = String(WP_MONTHS.indexOf(m) + 1).padStart(2,'0'); h.setNsDate(`${yr}-${n}-${da}`) }} />
                    <CoachSessionWheelPicker width={68} label="Année" items={WP_YEARS} value={yr} onChange={y => h.setNsDate(`${y}-${mo}-${da}`)} />
                  </div>
                </div>
              )
            })()}
            {(() => {
              const [hS, mS] = h.nsStartTime.split(':')
              const [hE, mE] = h.nsEndTime.split(':')
              const mSR = WP_MINS.reduce((p, c) => Math.abs(+c - +mS) < Math.abs(+p - +mS) ? c : p)
              const mER = WP_MINS.reduce((p, c) => Math.abs(+c - +mE) < Math.abs(+p - +mE) ? c : p)
              return (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label className="form-label">Début</label>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 6, background: BG_BASE, borderRadius: 12, padding: '4px 0' }}>
                      <CoachSessionWheelPicker width={60} label="H" items={WP_HOURS} value={hS.padStart(2,'0')} onChange={hv => h.setNsStartTime(`${hv}:${mS}`)} />
                      <CoachSessionWheelPicker width={60} label="Min" items={WP_MINS} value={mSR} onChange={m => h.setNsStartTime(`${hS}:${m}`)} />
                    </div>
                  </div>
                  <div>
                    <label className="form-label">Fin</label>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 6, background: BG_BASE, borderRadius: 12, padding: '4px 0' }}>
                      <CoachSessionWheelPicker width={60} label="H" items={WP_HOURS} value={hE.padStart(2,'0')} onChange={hv => h.setNsEndTime(`${hv}:${mE}`)} />
                      <CoachSessionWheelPicker width={60} label="Min" items={WP_MINS} value={mER} onChange={m => h.setNsEndTime(`${hE}:${m}`)} />
                    </div>
                  </div>
                </div>
              )
            })()}
            {h.nsStartTime && h.nsEndTime && (() => {
              const start = new Date(`2000-01-01T${h.nsStartTime}`); const end = new Date(`2000-01-01T${h.nsEndTime}`)
              const mins = Math.round((end.getTime() - start.getTime()) / 60000)
              return mins > 0 ? <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: TEXT_MUTED, fontSize: '0.78rem' }}><Clock size={13} /><span>{mins} min</span></div> : null
            })()}
            <div>
              <label className="form-label">Type de séance</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {SESSION_TYPES.map(t => {
                  const color = SESSION_COLORS[t]; const active = h.nsType === t
                  return <button key={t} onClick={() => h.setNsType(t)} className="type-chip" style={{ background: active ? `${color}22` : 'transparent', borderColor: active ? color : BORDER, color: active ? color : TEXT_MUTED }}>{t}</button>
                })}
              </div>
            </div>
            <div>
              <label className="form-label">Notes (optionnel)</label>
              <textarea value={h.nsNotes} onChange={e => h.setNsNotes(e.target.value)} rows={3} placeholder="Objectifs, exercices prévus…" className="form-input" style={{ resize: 'vertical', minHeight: 80 }} />
            </div>
            <div>
              <label className="form-label">Lieu</label>
              <input type="text" value={h.nsLocation} onChange={e => h.setNsLocation(e.target.value)} placeholder="Ex: Salle de sport, Parc, Zoom…" className="form-input" />
            </div>
            <button onClick={h.saveNewSession} disabled={!h.nsClientId || !h.nsDate || h.nsSaving === 'saving'}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: h.nsSaving === 'done' ? GREEN : GOLD, color: BG_BASE, border: 'none', borderRadius: 12, padding: '13px 20px', fontFamily: FONT_ALT, fontSize: '1rem', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', cursor: 'pointer', opacity: (!h.nsClientId || !h.nsDate) ? 0.5 : 1, transition: 'background 200ms',  }}>
              {h.nsSaving === 'done' ? <><Check size={16} /> Enregistré !</> : h.nsSaving === 'saving' ? 'Enregistrement…' : <><Plus size={16} /> Créer la séance</>}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ══════════════ SESSION DETAIL MODAL ══════════════ */}
    {h.selectedSession && (
      <SessionDetailModal session={h.selectedSession} clients={h.clients} onClose={() => h.setSelectedSession(null)} onDelete={h.deleteSession} />
    )}

    {/* ══ CALENDAR SECTION ══ */}
    {h.section === 'calendar' && (
      <CoachCalendar
        calWeekOffset={h.calWeekOffset} setCalWeekOffset={h.setCalWeekOffset}
        scheduledSessions={h.scheduledSessions} clients={h.clients}
        setSelectedSession={h.setSelectedSession}
        setShowNewSession={h.setShowNewSession} setNsDate={h.setNsDate}
        setSection={h.setSection}
      />
    )}

    {/* ══ MESSAGES SECTION (client list when section=messages, chat overlay always when selectedClient) ══ */}
    {h.section === 'messages' && !h.selectedClient && (h.messageListState.status === 'idle' || h.messageListState.status === 'loading') && <CoachSectionFallback />}
    {h.section === 'messages' && !h.selectedClient && h.messageListState.status === 'error' && (
      <div className="section-pad" style={{ padding: 24, color: TEXT_MUTED }}>
        <p>Messages indisponibles.</p>
        <button onClick={h.retryLastMessages} style={{ background: GOLD, color: BG_BASE, border: 0, borderRadius: 8, padding: '8px 14px', cursor: 'pointer' }}>Réessayer</button>
      </div>
    )}
    {(h.selectedClient || (h.section === 'messages' && (h.messageListState.status === 'success' || h.messageListState.status === 'empty'))) && (
      <CoachMessages
        clients={h.clients} selectedClient={h.selectedClient}
        setSelectedClient={h.setSelectedClient} openChat={h.openChat}
        chatMessages={h.chatMessages} msgInput={h.msgInput}
        setMsgInput={h.setMsgInput} sendMessage={h.sendMessage}
        unreadCounts={h.unreadCounts} lastMessages={h.lastMessages} supabase={h.supabase} session={h.session}
        msgEndRef={h.msgEndRef}
      />
    )}

    {/* ══ ACCUEIL SECTION ══ */}
    {h.section === 'accueil' && (
      <div className="section-pad" style={{ padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Bloc 1 — Agenda du jour */}
        <div className="sidebar-card">
          <h2 className="section-title">Ton planning aujourd&apos;hui</h2>
          {(() => {
            const todayStr = format(new Date(), 'yyyy-MM-dd')
            const todaySessions = h.scheduledSessions.filter(s => format(new Date(s.scheduled_at), 'yyyy-MM-dd') === todayStr)
            if (todaySessions.length === 0) {
              return <p style={{ fontSize: '0.9rem', color: TEXT_MUTED, fontFamily: FONT_BODY }}>Aucune séance aujourd&apos;hui</p>
            }
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {todaySessions.map(s => {
                  const clientName = h.clients.find(c => c.client_id === s.client_id)?.profiles?.full_name ?? 'Client'
                  const dt = new Date(s.scheduled_at)
                  return (
                    <div key={s.id} onClick={() => h.setSelectedSession(s)}
                      style={{ background: BG_CARD_2, borderLeft: `2px solid ${GOLD}`, borderRadius: RADIUS_CARD, padding: '10px 14px', cursor: 'pointer', border: `1px solid ${BORDER}`, borderLeftWidth: 2, borderLeftColor: GOLD }}>
                      <div style={{ fontFamily: FONT_ALT, fontSize: '0.75rem', fontWeight: 700, color: GOLD, textTransform: 'uppercase', letterSpacing: '1.5px' }}>{s.session_type}</div>
                      <div style={{ fontSize: '0.88rem', color: TEXT_PRIMARY, fontFamily: FONT_BODY, fontWeight: 500, marginTop: 2 }}>{clientName}</div>
                      <div style={{ fontSize: '0.75rem', color: TEXT_MUTED, fontFamily: FONT_BODY, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={11} />{format(dt, 'HH:mm')} · {s.duration_minutes}min
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </div>

        {/* ═══ INVITER UN CLIENT ═══ */}
        <div className="sidebar-card">
          <h2 className="section-title">Inviter un client</h2>

          {/* Invitation par email */}
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="email"
              placeholder="email@client.com"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              style={{
                flex: 1, background: BG_BASE, border: `1px solid ${BORDER}`,
                borderRadius: 12, padding: '10px 14px',
                fontFamily: FONT_BODY, fontSize: '0.85rem', color: TEXT_PRIMARY,
                outline: 'none',
              }}
              onKeyDown={e => { if (e.key === 'Enter') sendInviteEmail() }}
            />
            <button onClick={sendInviteEmail} disabled={!inviteEmail.includes('@') || inviteSending} style={{
              padding: '10px 16px', borderRadius: 12, border: 'none',
              background: inviteSent ? 'rgba(74,222,128,0.15)' : GOLD,
              color: inviteSent ? GREEN : BG_BASE,
              fontFamily: FONT_ALT, fontSize: '0.78rem', fontWeight: 700,
              letterSpacing: 1, cursor: 'pointer', whiteSpace: 'nowrap',
              opacity: !inviteEmail.includes('@') ? 0.5 : 1,
            }}>
              {inviteSent ? '✓ Envoyé' : inviteSending ? '...' : 'Inviter'}
            </button>
            {createdInvitationId && <button onClick={revokeCreatedInvitation} style={{ padding: '10px 12px', borderRadius: 12, border: `1px solid ${BORDER}`, background: 'transparent', color: TEXT_MUTED, fontFamily: FONT_ALT, cursor: 'pointer' }}>Révoquer</button>}
          </div>
        </div>

        {/* Bloc 2 — Chiffre d'affaires */}
        <div className="sidebar-card">
          <h2 className="section-title">Chiffre d&apos;affaires</h2>
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 8, marginBottom: 16 }}>
            <select value={revMonth} onChange={e => setRevMonth(Number(e.target.value))}
              style={{ flex: 1, maxWidth: isMobile ? 'none' : 130, background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '8px 12px', fontFamily: FONT_BODY, fontSize: '0.85rem', color: TEXT_PRIMARY, cursor: 'pointer', outline: 'none' }}>
              {WP_MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <select value={revYear} onChange={e => setRevYear(Number(e.target.value))}
              style={{ width: 'auto', background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '8px 12px', fontFamily: FONT_BODY, fontSize: '0.85rem', color: TEXT_PRIMARY, cursor: 'pointer', outline: 'none' }}>
              {WP_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          {(() => {
            const startDate = new Date(revYear, revMonth, 1)
            const endDate = new Date(revYear, revMonth + 1, 0, 23, 59, 59)
            const startIso = startDate.toISOString()
            const endIso = endDate.toISOString()
            let total = 0
            let count = 0
            for (const p of h.allPayments) {
              if (p.paid_at && p.paid_at >= startIso && p.paid_at <= endIso) {
                total += p.amount || 0
                count++
              }
            }
            const formatted = Math.round(total).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'")
            return (
              <div>
                <div style={{ fontFamily: FONT_DISPLAY, fontSize: isMobile ? '1.6rem' : '2.4rem', fontWeight: 700, color: GOLD, lineHeight: 1 }}>
                  CHF {formatted}
                </div>
                <div style={{ fontFamily: FONT_BODY, fontSize: '0.78rem', color: TEXT_MUTED, marginTop: 8 }}>
                  {count} paiement{count !== 1 ? 's' : ''}
                </div>
              </div>
            )
          })()}
        </div>

        {/* Bloc 3 — Messages non lus (seulement si > 0) */}
        {h.totalUnread > 0 && (
          <div className="sidebar-card" style={{ cursor: 'pointer' }} onClick={() => h.setSection('messages')}>
            <h2 className="section-title">Messages</h2>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: isMobile ? '1.4rem' : '2rem', fontWeight: 700, color: RED, lineHeight: 1 }}>
              {h.totalUnread}
            </div>
            <div style={{ fontFamily: FONT_BODY, fontSize: '0.78rem', color: TEXT_MUTED, marginTop: 8 }}>
              message{h.totalUnread !== 1 ? 's' : ''} non lu{h.totalUnread !== 1 ? 's' : ''}
            </div>
          </div>
        )}
      </div>
    )}

    {/* ══ DASHBOARD / CLIENTS SECTION ══ */}
    {h.section === 'dashboard' && (
      <div className="section-pad" style={{ padding: '16px 14px' }}>
        <ClientsList
          filtered={h.filtered} loading={h.loading}
          search={h.search} setSearch={h.setSearch}
          showInvite={h.showInvite} setShowInvite={h.setShowInvite}
          unreadCounts={h.unreadCounts} setSection={h.setSection}
          openChat={h.openChat} setShowNewSession={h.setShowNewSession}
          coachInitials={h.coachInitials}
          scheduledSessions={h.scheduledSessions} clients={h.clients}
          setSelectedSession={h.setSelectedSession}
          SESSION_COLORS={SESSION_COLORS}
          lastSessionByClient={h.lastSessionByClient}
          sessionsThisWeekByClient={h.sessionsThisWeekByClient}
        />
      </div>
    )}

    {/* ══ ALIMENTS SECTION ══ */}
    {h.section === 'suivi' && (
      <CoachAnalytics coachId={h.session?.user?.id || null} />
    )}

    {h.section === 'programs' && (
      <CoachPrograms session={h.session} clients={h.clients} />
    )}

    {h.section === 'aliments' && (
      <CoachAliments
        foodList={h.foodList} foodFilter={h.foodFilter} setFoodFilter={h.setFoodFilter}
        foodSearchQ={h.foodSearchQ} setFoodSearchQ={h.setFoodSearchQ}
        foodLoading={h.foodLoading} loadFoods={h.loadFoods}
        showAddFood={h.showAddFood} setShowAddFood={h.setShowAddFood}
        newFood={h.newFood} setNewFood={h.setNewFood}
        saveNewFood={h.saveNewFood} deleteFood={h.deleteFood}
      />
    )}

    {/* ══ PROFIL SECTION ══ */}
    {h.section === 'profil' && (
      <CoachProfile
        coachName={h.coachName} coachInitials={h.coachInitials}
        session={h.session} coachProfile={h.coachProfile}
        setSection={h.setSection} supabaseSignOut={() => { cache.clearAll(); h.supabase.auth.signOut().then(() => { window.location.href = '/login' }) }}
      />
    )}

    <BugReport session={h.session} profile={h.coachProfile} />

    {/* ── BOTTOM NAV ── */}
    <nav className="bottom-nav" aria-label="Navigation principale">
      <div className="bottom-nav-inner" style={{ justifyContent: 'center', gap: 0, padding: '10px 12px' }}>
      {([
        { key: 'accueil', icon: <Home size={20} strokeWidth={1.5} />, label: 'Accueil' },
        { key: 'dashboard', icon: <Users size={20} strokeWidth={1.5} />, label: 'Clients' },
        { key: 'suivi', icon: <Activity size={20} strokeWidth={1.5} />, label: 'Suivi' },
        { key: 'programs', icon: <Dumbbell size={20} strokeWidth={1.5} />, label: 'Progr.' },
        { key: 'messages', icon: <MessageCircle size={20} strokeWidth={1.5} />, label: 'Messages', badge: h.totalUnread },
        { key: 'calendar', icon: <Calendar size={20} strokeWidth={1.5} />, label: 'Agenda' },
      ] as { key: string; icon: React.ReactNode; label: string; badge?: number }[]).map(tab => (
        <button key={tab.key} className={`bottom-nav-btn${h.section === tab.key ? ' active' : ''}`}
          onClick={() => h.setSection(tab.key as CoachSection)} aria-label={tab.label} style={{ flex: 1 }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {tab.icon}
            {tab.badge && tab.badge > 0 ? <span className="nav-badge">{tab.badge > 9 ? '9+' : tab.badge}</span> : null}
          </div>
          <span className="bottom-nav-label">{tab.label}</span>
          {h.section === tab.key && <div style={{ width: 3, height: 3, borderRadius: '50%', background: GOLD }} />}
        </button>
      ))}
      </div>
    </nav>
  </div>
)
}
