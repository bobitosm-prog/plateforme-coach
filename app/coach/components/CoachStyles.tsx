'use client'
import {
  BG_BASE, BG_CARD, BG_CARD_2, BORDER, GOLD, GOLD_DIM, GOLD_RULE,
  RED, TEXT_PRIMARY, TEXT_MUTED, TEXT_DIM, RADIUS_CARD,
  FONT_DISPLAY, FONT_ALT, FONT_BODY,
} from '../../../lib/design-tokens'

export default function CoachStyles() {
  return (
    <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: ${BG_BASE}; }
        ::-webkit-scrollbar-thumb { background: ${BORDER}; border-radius: 1px; }
        .wheel-col::-webkit-scrollbar { display: none; }
        .stat-card { background: rgba(20,18,9,0.6); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(212,168,67,0.15); border-radius: ${RADIUS_CARD}px; padding: 24px; transition: all 200ms ease; cursor: default; box-shadow: 0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(232,201,122,0.06); position: relative; overflow: hidden; }
        .stat-card:hover { border-color: rgba(212,168,67,0.3); box-shadow: 0 8px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(232,201,122,0.12); }
        .sidebar-card { background: rgba(20,18,9,0.6); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(212,168,67,0.15); border-radius: ${RADIUS_CARD}px; padding: 24px; box-shadow: 0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(232,201,122,0.06); }
        .section-title { font-family: ${FONT_ALT}; font-size: 1.15rem; font-weight: 800; letter-spacing: 3px; text-transform: uppercase; color: ${TEXT_PRIMARY}; margin: 0 0 16px 0; }
        .data-table { width: 100%; border-collapse: collapse; }
        .data-table thead th { font-family: ${FONT_ALT}; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 3px; color: ${GOLD}; padding: 10px 16px; text-align: left; background: ${GOLD_DIM}; border-bottom: 1px solid ${BORDER}; }
        .data-table tbody tr { border-bottom: 1px solid ${BORDER}; transition: background 150ms ease; cursor: pointer; }
        .data-table tbody tr:hover { background: ${BG_CARD_2}; }
        .data-table tbody td { padding: 14px 16px; font-family: ${FONT_BODY}; font-size: 14px; font-weight: 400; color: ${TEXT_PRIMARY}; }
        .badge { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 2px; font-family: ${FONT_ALT}; font-size: 0.72rem; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; }
        .badge-active { background: rgba(212,168,67,0.12); color: ${GOLD}; }
        .badge-warning { background: ${GOLD_DIM}; color: ${GOLD}; }
        .badge-inactive { background: rgba(138,133,128,0.12); color: ${TEXT_MUTED}; }
        .avatar-circle { width: 34px; height: 34px; border-radius: 50%; background: ${GOLD}; display: flex; align-items: center; justify-content: center; font-family: ${FONT_DISPLAY}; font-weight: 700; font-size: 0.85rem; color: ${BG_BASE}; flex-shrink: 0; }
        .btn-primary { display: flex; align-items: center; gap: 8px; background: ${GOLD}; color: ${BG_BASE}; padding: 11px 20px; border-radius: 12px; font-family: ${FONT_ALT}; font-size: 0.95rem; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; border: none; cursor: pointer; transition: opacity 200ms ease, transform 200ms ease; width: 100%; justify-content: center; ; }
        .btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
        .btn-primary-orange { background: ${GOLD}; color: ${BG_BASE}; }
        .btn-secondary { display: flex; align-items: center; gap: 8px; background: transparent; color: ${GOLD}; border: 2px solid ${GOLD}; padding: 9px 20px; border-radius: 12px; font-family: ${FONT_ALT}; font-size: 0.95rem; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; cursor: pointer; transition: background 200ms ease, color 200ms ease; width: 100%; justify-content: center; }
        .btn-secondary:hover { background: ${GOLD}; color: ${BG_BASE}; }
        .btn-ghost { display: flex; align-items: center; gap: 6px; background: transparent; color: ${TEXT_MUTED}; border: none; padding: 8px 12px; border-radius: 12px; font-family: ${FONT_BODY}; font-size: 0.875rem; font-weight: 500; cursor: pointer; transition: background 150ms ease, color 150ms ease; white-space: nowrap; }
        .btn-ghost:hover { background: ${BG_CARD_2}; color: ${TEXT_PRIMARY}; }
        .divider { border: none; border-top: 1px solid ${BORDER}; margin: 16px 0; }
        .search-input { background: ${BG_BASE}; border: 1px solid ${BORDER}; border-radius: 12px; padding: 7px 12px 7px 32px; font-family: ${FONT_BODY}; font-size: 0.85rem; color: ${TEXT_PRIMARY}; width: 180px; transition: border-color 200ms ease; outline: none; }
        .search-input:focus { border-color: ${GOLD}; }
        .invite-panel { background: ${GOLD_DIM}; border: 1px solid ${GOLD_RULE}; border-radius: ${RADIUS_CARD}px; padding: 16px; margin-top: 12px; }
        .client-chat-row { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-bottom: 1px solid ${BORDER}; cursor: pointer; transition: background 150ms; }
        .client-chat-row:hover { background: ${BG_CARD_2}; }
        .client-chat-row.active { background: ${GOLD_DIM}; border-left: 2px solid ${GOLD}; }
        .msg-input { flex: 1; background: ${BG_BASE}; border: 1px solid ${BORDER}; border-radius: 12px; padding: 10px 18px; font-family: ${FONT_BODY}; font-size: 0.9rem; color: ${TEXT_PRIMARY}; outline: none; transition: border-color 200ms; }
        .msg-input:focus { border-color: ${GOLD}; }
        @media (max-width: 640px) { .hide-sm { display: none !important; } }
        @media(max-width:768px){
          .data-table th,.data-table td{padding:10px 8px;font-size:0.75rem}
          .section-pad{padding:16px!important}
        }
        @media (max-width: 1024px) { .lg-grid { grid-template-columns: 1fr !important; } }
        @media (max-width: 767px) { .stats-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 1px !important; } }
        /* .client-cards-m responsive rules moved to globals.css */
        .client-card-m { background: ${BG_CARD}; border: 1px solid ${BORDER}; border-radius: ${RADIUS_CARD}px; cursor: pointer; transition: border-color 150ms; overflow: hidden; }
        .client-card-m:active { border-color: ${GOLD}; }
        .client-card-m-inner { display: flex; align-items: center; gap: 12px; padding: 14px 16px; }
        .avatar-circle-lg { width: 46px; height: 46px; border-radius: 50%; background: ${GOLD}; display: flex; align-items: center; justify-content: center; font-family: ${FONT_DISPLAY}; font-weight: 700; font-size: 1.05rem; color: ${BG_BASE}; flex-shrink: 0; }
        .client-card-info { flex: 1; min-width: 0; }
        .client-card-name { font-family: ${FONT_BODY}; font-weight: 600; font-size: 0.95rem; color: ${TEXT_PRIMARY}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .client-card-sub { font-family: ${FONT_BODY}; font-size: 0.72rem; color: ${TEXT_MUTED}; margin-top: 4px; }
        .client-card-actions { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
        .client-card-msg-btn { position: relative; background: transparent; border: none; cursor: pointer; padding: 8px; color: ${TEXT_MUTED}; display: flex; align-items: center; justify-content: center; min-width: 44px; min-height: 44px; border-radius: 12px; transition: color 150ms; }
        .client-card-msg-btn:active { color: ${GOLD}; }
        .msg-badge { position: absolute; top: 4px; right: 4px; min-width: 16px; height: 16px; background: ${RED}; border-radius: 8px; font-size: 0.6rem; font-weight: 700; color: #fff; display: flex; align-items: center; justify-content: center; padding: 0 3px; }
        .bottom-nav { display: block; position: fixed; bottom: 0; left: 0; right: 0; padding: 12px 14px; padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px)); z-index: 100; }
        .bottom-nav-inner { display: flex; background: rgba(13,11,8,0.7); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border: 1px solid rgba(212,168,67,0.08); border-radius: 18px; box-shadow: 0 -2px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(232,201,122,0.04); }
        .section-pad { padding-bottom: calc(80px + env(safe-area-inset-bottom, 0px)) !important; }
        .bottom-nav-btn { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; background: transparent; border: none; cursor: pointer; padding: 4px 8px; color: ${TEXT_MUTED}; transition: color 150ms; position: relative; min-height: 44px; justify-content: center; }
        .bottom-nav-btn.active { color: ${GOLD}; }
        .bottom-nav-label { font-family: ${FONT_ALT}; font-size: 0.68rem; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; }
        .nav-badge { position: absolute; top: 2px; right: calc(50% - 20px); min-width: 16px; height: 16px; background: ${RED}; border-radius: 8px; font-size: 0.6rem; font-weight: 700; color: #fff; display: flex; align-items: center; justify-content: center; padding: 0 3px; }
        .chat-fullscreen { position: fixed; inset: 0; background: ${BG_BASE}; z-index: 200; display: flex; flex-direction: column; overflow: hidden; width: 100vw; height: 100vh; }
        .modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,0.65); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 16px; }
        .modal-box { background: ${BG_CARD}; border: 1px solid ${BORDER}; border-radius: ${RADIUS_CARD}px; width: 100%; max-width: 480px; max-height: 90vh; overflow-y: auto; box-shadow: 0 24px 48px rgba(0,0,0,0.4); }
        .form-label { font-family: ${FONT_ALT}; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: ${TEXT_MUTED}; display: block; margin-bottom: 6px; }
        .form-input { width: 100%; background: ${BG_BASE}; border: 1px solid ${BORDER}; border-radius: 12px; padding: 10px 14px; font-family: ${FONT_BODY}; font-size: 0.9rem; color: ${TEXT_PRIMARY}; outline: none; transition: border-color 200ms; }
        .form-input:focus { border-color: ${GOLD}; }
        .type-chip { border-radius: 12px; padding: 7px 14px; font-family: ${FONT_ALT}; font-size: 0.82rem; font-weight: 700; letter-spacing: 1px; cursor: pointer; border: 2px solid transparent; transition: all 150ms; }
        /* Bottom nav 6 tabs — responsive */
        @media (max-width: 419px) {
          .bottom-nav { padding-left: 6px !important; padding-right: 6px !important; }
          .bottom-nav-inner { padding: 8px 4px !important; }
          .bottom-nav-btn { padding: 4px 1px !important; min-width: 0; gap: 2px !important; }
          .bottom-nav-label {
            font-size: 0.5rem !important;
            letter-spacing: 0.2px !important;
            max-width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        }
        /* <360px — icons only, label only for active tab */
        @media (max-width: 359px) {
          .bottom-nav-label { display: none; }
          .bottom-nav-btn.active .bottom-nav-label { display: block; }
        }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
  )
}
