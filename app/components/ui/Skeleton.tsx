'use client'

export function Skeleton({ width = '100%', height = 20, radius = 8, style = {} }: {
  width?: string | number
  height?: number
  radius?: number
  style?: React.CSSProperties
}) {
  return (
    <div style={{
      width, height, borderRadius: radius,
      background: 'linear-gradient(90deg, #141209 25%, #1A1712 50%, #141209 75%)',
      backgroundSize: '200% 100%',
      animation: 'skeletonPulse 1.5s ease-in-out infinite',
      ...style,
    }} />
  )
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div style={{ background: '#141209', border: '1px solid rgba(212,168,67,0.15)', borderRadius: 16, padding: 18, marginBottom: 12 }}>
      <Skeleton width="40%" height={14} style={{ marginBottom: 8 }} />
      <Skeleton width="70%" height={20} style={{ marginBottom: 12 }} />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} width={`${85 - i * 15}%`} height={12} style={{ marginBottom: 6 }} />
      ))}
    </div>
  )
}

export function SkeletonRing() {
  return (
    <div style={{ width: 110, height: 110, borderRadius: '50%', border: '8px solid #1A1712', background: '#141209', animation: 'skeletonPulse 1.5s ease-in-out infinite', flexShrink: 0 }} />
  )
}

export function SkeletonStatGrid() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, flex: 1, minWidth: 0 }}>
      {[1, 2, 3, 4].map(i => (
        <div key={i} style={{ background: '#1A1712', borderRadius: 10, padding: '10px 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Skeleton width={30} height={30} radius={8} />
          <div><Skeleton width={40} height={16} style={{ marginBottom: 4 }} /><Skeleton width={30} height={8} /></div>
        </div>
      ))}
    </div>
  )
}
