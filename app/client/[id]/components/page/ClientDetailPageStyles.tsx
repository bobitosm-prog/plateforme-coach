import {
  colors, BG_BASE, BG_CARD, BG_CARD_2, BORDER, GOLD, GOLD_DIM, GOLD_RULE,
  GREEN, TEXT_PRIMARY, TEXT_MUTED, RADIUS_CARD, FONT_DISPLAY, FONT_ALT, FONT_BODY,
} from '@/lib/design-tokens'

export default function ClientDetailPageStyles() {
  return (
    <style>{`
      *,*::before,*::after{box-sizing:border-box;}
      body{margin:0;font-family:${FONT_BODY};background:${BG_BASE};color:${TEXT_PRIMARY};overscroll-behavior-y:none;overflow-x:hidden;max-width:100vw;}
      h1,h2,h3,h4{font-family:${FONT_DISPLAY};}
      @keyframes spin{to{transform:rotate(360deg)}}
      @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
      @keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
      .card{background:${BG_CARD};border:1px solid ${BORDER};border-radius:${RADIUS_CARD}px;padding:16px;}
      .metric-card{background:${BG_CARD};border:1px solid ${BORDER};border-radius:${RADIUS_CARD}px;padding:14px;}
      .section-title{font-family:${FONT_ALT};font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${TEXT_MUTED};margin-bottom:12px;}
      .btn-primary{display:inline-flex;align-items:center;justify-content:center;gap:8px;background:${GOLD};color:#050505;padding:12px 20px;border-radius:0;font-family:${FONT_ALT};font-size:.95rem;font-weight:800;letter-spacing:.04em;border:none;cursor:pointer;transition:opacity 200ms,transform 150ms;min-height:44px;}
      .btn-primary:active{transform:scale(0.97);opacity:.9;}
      .btn-secondary{display:inline-flex;align-items:center;justify-content:center;gap:8px;background:transparent;color:${GOLD};border:1.5px solid ${GOLD_RULE};padding:10px 16px;border-radius:0;font-family:${FONT_ALT};font-size:.9rem;font-weight:700;letter-spacing:.04em;cursor:pointer;transition:background 200ms,color 200ms;min-height:44px;}
      .btn-secondary:active{background:${GOLD};color:#050505;}
      .btn-ghost{display:inline-flex;align-items:center;gap:6px;background:transparent;color:${TEXT_MUTED};border:1px solid ${GOLD_RULE};padding:10px 12px;border-radius:0;font-family:${FONT_BODY};font-size:.875rem;font-weight:500;cursor:pointer;transition:background 150ms,color 150ms;min-height:44px;}
      .btn-ghost:active{background:${BG_CARD_2};color:${TEXT_PRIMARY};}
      .badge{display:inline-flex;align-items:center;padding:3px 9px;border-radius:0;font-family:${FONT_ALT};font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;}
      .badge-active{background:rgba(212,168,67,.15);color:${GOLD};border:1px solid rgba(212,168,67,.3);}
      .badge-warning{background:${GOLD_DIM};color:${GOLD};border:1px solid ${GOLD_RULE};}
      .badge-inactive{background:rgba(138,133,128,.08);color:${TEXT_MUTED};border:1px solid rgba(138,133,128,.12);}
      .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;z-index:100;opacity:0;pointer-events:none;transition:opacity 200ms ease;}
      .modal-overlay.open{opacity:1;pointer-events:all;}
      .modal{background:${BG_CARD};border:1px solid ${BORDER};border-radius:${RADIUS_CARD}px;max-width:480px;width:92%;transform:translateY(12px);transition:transform 200ms ease;overflow:hidden;}
      .modal-overlay.open .modal{transform:translateY(0);}
      .toast-el{position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:${BG_CARD};border:1px solid ${BORDER};border-left:3px solid ${GREEN};color:${TEXT_PRIMARY};padding:11px 16px;border-radius:${RADIUS_CARD}px;font-family:${FONT_BODY};font-size:.85rem;font-weight:500;display:flex;align-items:center;gap:8px;z-index:300;animation:slideUp 200ms ease;box-shadow:0 8px 32px rgba(0,0,0,.5);white-space:nowrap;}
      .col-hdr{font-family:${FONT_ALT};font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${TEXT_MUTED};margin-bottom:3px;}
      .bottom-nav{position:fixed;bottom:0;left:0;right:0;z-index:50;padding:12px 14px;padding-bottom:calc(12px + env(safe-area-inset-bottom, 0px));}
      .bottom-nav>div{background:rgba(13,11,8,0.75);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border:1px solid rgba(212,168,67,0.15);border-radius:18px;box-shadow:0 -2px 16px rgba(0,0,0,0.3),inset 0 1px 0 rgba(232,201,122,0.08);padding:8px 12px;max-width:420px;margin:0 auto;}
      .nav-tab{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:8px 4px;border:none;background:transparent;cursor:pointer;transition:color 150ms;min-height:44px;}
      .day-chip{flex-shrink:0;display:inline-flex;align-items:center;padding:8px 14px;border-radius:0;border:none;cursor:pointer;font-family:${FONT_ALT};font-size:.82rem;font-weight:700;letter-spacing:.05em;transition:all 150ms ease;min-height:44px;}
      .ex-row-m{display:flex;flex-direction:column;gap:7px;padding:12px 0;border-bottom:1px solid ${BORDER};}
      .ex-row-m:last-child{border-bottom:none;}
      .food-row-m{display:flex;flex-direction:column;gap:6px;padding:10px 0;border-bottom:1px solid ${BORDER};}
      .desktop-sidebar-client{display:none;}
      .desktop-header-client{display:none;}
      .desktop-tabs{display:none;}
      @media(min-width:768px){
        .mobile-header-client{display:none !important;}
        .desktop-sidebar-client{display:flex !important;flex-direction:column;width:280px;min-height:100vh;border-right:1px solid ${BORDER};padding:24px;flex-shrink:0;position:sticky;top:0;height:100vh;overflow-y:auto;}
        .desktop-header-client{display:flex !important;align-items:center;gap:12px;padding:16px 32px;border-bottom:1px solid ${BORDER};position:sticky;top:0;z-index:40;background:${BG_BASE};}
        .desktop-tabs{display:flex !important;gap:4px;padding:0 32px;border-bottom:1px solid ${BORDER};background:${BG_BASE};}
        .desktop-tabs button{padding:12px 16px;border:none;background:transparent;cursor:pointer;font-family:${FONT_ALT};font-size:.85rem;font-weight:700;letter-spacing:.04em;color:${TEXT_MUTED};border-bottom:2px solid transparent;transition:all 150ms;}
        .desktop-tabs button.dt-active{color:${GOLD};border-bottom-color:${GOLD};}
        .main-client-content{max-width:100% !important;padding:16px 14px 40px !important;margin:0 !important;}
        .client-page-root{flex-direction:row !important;}
        .bottom-nav{display:none !important;}
      }
      .food-row-m:last-child{border-bottom:none;}
      input[type=number]::-webkit-inner-spin-button{opacity:.4;}
      input[type=range]{-webkit-appearance:none;appearance:none;height:4px;border-radius:0;background:${BORDER};outline:none;}
      input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:20px;height:20px;border-radius:0;background:${GOLD};cursor:pointer;border:2px solid ${BG_BASE};box-shadow:0 2px 8px ${colors.goldRule};}
      ::-webkit-scrollbar{display:none;}
    `}</style>
  )
}
