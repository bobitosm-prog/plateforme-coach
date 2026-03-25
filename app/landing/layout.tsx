export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#050505', minHeight: '100vh', overflowX: 'hidden' }}>
      {children}
    </div>
  )
}
