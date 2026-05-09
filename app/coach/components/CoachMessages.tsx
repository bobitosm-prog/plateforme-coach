'use client'

import {
  BG_BASE, BORDER,
} from '../../../lib/design-tokens'
import { useIsMobile } from '../../hooks/useIsMobile'
import ConversationList from './ConversationList'
import ConversationPanel from './ConversationPanel'
import type { ClientRow } from '../hooks/useCoachDashboard'

interface CoachMessagesProps {
  clients: ClientRow[]
  selectedClient: ClientRow | null
  setSelectedClient: (c: ClientRow | null) => void
  openChat: (c: ClientRow) => void
  chatMessages: any[]
  msgInput: string
  setMsgInput: (v: string) => void
  sendMessage: (imageUrl?: string | null) => void
  unreadCounts: Record<string, number>
  lastMessages: Map<string, { content: string; image_url: string | null; created_at: string }>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
  session: any
  msgEndRef: React.RefObject<HTMLDivElement | null>
}

export default function CoachMessages({
  clients, selectedClient, setSelectedClient, openChat,
  chatMessages, msgInput, setMsgInput, sendMessage,
  unreadCounts, lastMessages, supabase, session,
  msgEndRef,
}: CoachMessagesProps) {
  const isMobile = useIsMobile(1024)

  // ── Mobile: original behavior (list OR overlay, never both) ──
  if (isMobile) {
    return (
      <>
        {!selectedClient && (
          <div className="section-pad" style={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <ConversationList
              clients={clients}
              openChat={openChat}
              unreadCounts={unreadCounts}
              lastMessages={lastMessages}
            />
          </div>
        )}
        {selectedClient && (
          <ConversationPanel
            selectedClient={selectedClient}
            setSelectedClient={setSelectedClient}
            chatMessages={chatMessages}
            msgInput={msgInput}
            setMsgInput={setMsgInput}
            sendMessage={sendMessage}
            supabase={supabase}
            session={session}
            msgEndRef={msgEndRef}
            isMobile
          />
        )}
      </>
    )
  }

  // ── Desktop: 2-column layout (sidebar + panel side by side) ──
  return (
    <div style={{
      display: 'flex',
      height: 'calc(100dvh - 64px)',
      maxHeight: 'calc(100dvh - 64px)',
      background: BG_BASE,
      overflow: 'hidden',
    }}>
      {/* Sidebar — conversation list */}
      <div style={{
        width: 320, flexShrink: 0, minHeight: 0,
        borderRight: `1px solid ${BORDER}`,
        overflow: 'hidden',
      }}>
        <ConversationList
          clients={clients}
          openChat={openChat}
          unreadCounts={unreadCounts}
          lastMessages={lastMessages}
          selectedClientId={selectedClient?.client_id}
        />
      </div>

      {/* Main panel — conversation or empty state */}
      <div style={{ flex: 1, minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
        <ConversationPanel
          selectedClient={selectedClient}
          setSelectedClient={setSelectedClient}
          chatMessages={chatMessages}
          msgInput={msgInput}
          setMsgInput={setMsgInput}
          sendMessage={sendMessage}
          supabase={supabase}
          session={session}
          msgEndRef={msgEndRef}
          isMobile={false}
        />
      </div>
    </div>
  )
}
