export default function DashboardServerFallback() {
  return (
    <div
      aria-label="Chargement de MoovX"
      role="status"
      style={{
        alignItems: 'center',
        background: '#0D0B08',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        height: '100dvh',
        justifyContent: 'center',
      }}
    >
      <img
        alt="MoovX"
        height={80}
        src="/logo-moovx-96.png"
        style={{ borderRadius: 20, filter: 'drop-shadow(0 0 30px rgba(212,168,67,0.3))' }}
        width={80}
      />
      <span
        aria-hidden="true"
        style={{
          animation: 'spin 0.8s linear infinite',
          border: '3px solid #222',
          borderRadius: '50%',
          borderTopColor: '#D4A843',
          height: 32,
          width: 32,
        }}
      />
    </div>
  )
}
