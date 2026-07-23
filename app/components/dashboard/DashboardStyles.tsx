export default function DashboardStyles() {
  return (
    <style>{`
      @keyframes spin { to { transform: rotate(360deg) } }
      * { box-sizing: border-box; }
      input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
      .photo-cell:hover .photo-delete-btn { opacity: 1 !important; }
      .client-main-scroll { padding-bottom: calc(80px + env(safe-area-inset-bottom, 0px)); }
      @media (min-width: 768px) { .client-main-scroll { padding-bottom: 16px; } }
    `}</style>
  )
}
