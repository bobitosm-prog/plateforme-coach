'use client'

export const EXERCISE_MUSCLES: Record<string, string[]> = {
  'bench press': ['chest', 'front_delts', 'triceps'], 'developpe couche': ['chest', 'front_delts', 'triceps'],
  'incline press': ['upper_chest', 'front_delts', 'triceps'], 'developpe incline': ['upper_chest', 'front_delts', 'triceps'],
  'overhead press': ['front_delts', 'side_delts', 'triceps'], 'developpe militaire': ['front_delts', 'side_delts', 'triceps'],
  'dips': ['chest', 'triceps', 'front_delts'], 'lateral raise': ['side_delts'], 'elevations laterales': ['side_delts'],
  'pull up': ['lats', 'biceps'], 'tractions': ['lats', 'biceps'], 'tirage vertical': ['lats', 'biceps'],
  'barbell row': ['lats', 'traps', 'biceps'], 'rowing barre': ['lats', 'traps', 'biceps'], 'rowing haltere': ['lats', 'traps', 'biceps'],
  'deadlift': ['lower_back', 'glutes', 'hamstrings', 'traps'], 'souleve de terre': ['lower_back', 'glutes', 'hamstrings'],
  'squat': ['quads', 'glutes', 'lower_back'], 'leg press': ['quads', 'glutes'], 'leg extension': ['quads'],
  'leg curl': ['hamstrings'], 'hip thrust': ['glutes', 'hamstrings'], 'fente': ['quads', 'glutes', 'hamstrings'],
  'bicep curl': ['biceps'], 'curl barre': ['biceps'], 'tricep pushdown': ['triceps'], 'triceps poulie': ['triceps'],
  'crunch': ['abs'], 'planche': ['abs', 'lower_back'], 'mollets': ['calves'],
}

export function calculateMuscleStatus(recentSets: { exercise_name: string; created_at: string }[]): Record<string, number> {
  const now = Date.now()
  const status: Record<string, number> = {}
  const allMuscles = ['chest', 'upper_chest', 'front_delts', 'side_delts', 'rear_delts', 'triceps', 'biceps', 'lats', 'traps', 'lower_back', 'abs', 'quads', 'hamstrings', 'glutes', 'calves']
  allMuscles.forEach(m => { status[m] = 0 })
  for (const set of recentSets) {
    const name = (set.exercise_name || '').toLowerCase()
    const muscles = Object.entries(EXERCISE_MUSCLES).find(([k]) => name.includes(k))?.[1] || []
    const hoursAgo = (now - new Date(set.created_at).getTime()) / 3600000
    for (const m of muscles) {
      if (hoursAgo < 24) status[m] = Math.max(status[m], 2)
      else if (hoursAgo < 48) status[m] = Math.max(status[m], 1)
    }
  }
  return status
}

const SC = {
  0: { fill: '#4ade80', opacity: 0.6, label: 'Frais' },
  1: { fill: '#D4A843', opacity: 0.7, label: 'Recupere' },
  2: { fill: '#EF4444', opacity: 0.7, label: 'Fatigue' },
} as const

export default function MuscleHeatMap({ muscleStatus }: { muscleStatus: Record<string, number> }) {
  const g = (m: string) => SC[(muscleStatus[m] ?? 0) as keyof typeof SC]

  return (
    <div style={{ background: '#141209', border: '1px solid rgba(212,168,67,0.25)', borderRadius: 16, padding: 18, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <span style={{ fontFamily: "'Bebas Neue'", fontSize: 18, letterSpacing: 3, color: '#F5EDD8' }}>RECUPERATION MUSCULAIRE</span>
        <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(212,168,67,0.25), transparent)' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
        {/* FRONT */}
        <div style={{ textAlign: 'center' }}>
          <svg viewBox="0 0 200 420" width="140" height="294" style={{ filter: 'drop-shadow(0 0 8px rgba(212,168,67,0.05))' }}>
            <g stroke="rgba(212,168,67,0.15)" strokeWidth="1" fill="none">
              <ellipse cx="100" cy="30" rx="22" ry="26"/>
              <rect x="90" y="56" width="20" height="14" rx="4"/>
              <path d="M65,70 L60,72 L55,85 L52,130 L55,175 L60,185 L80,190 L100,192 L120,190 L140,185 L145,175 L148,130 L145,85 L140,72 L135,70 Z"/>
              <path d="M55,85 L42,90 L32,120 L28,155 L25,180 L28,185 L32,182 L36,155 L42,125 L50,100"/>
              <path d="M145,85 L158,90 L168,120 L172,155 L175,180 L172,185 L168,182 L164,155 L158,125 L150,100"/>
              <path d="M75,190 L70,220 L65,270 L62,320 L60,360 L58,400 L65,410 L72,405 L70,360 L72,320 L75,270 L80,220 L85,195"/>
              <path d="M125,190 L130,220 L135,270 L138,320 L140,360 L142,400 L135,410 L128,405 L130,360 L128,320 L125,270 L120,220 L115,195"/>
            </g>
            <ellipse cx="82" cy="100" rx="18" ry="12" fill={g('chest').fill} opacity={g('chest').opacity}/>
            <ellipse cx="118" cy="100" rx="18" ry="12" fill={g('chest').fill} opacity={g('chest').opacity}/>
            <ellipse cx="58" cy="82" rx="8" ry="10" fill={g('front_delts').fill} opacity={g('front_delts').opacity}/>
            <ellipse cx="142" cy="82" rx="8" ry="10" fill={g('front_delts').fill} opacity={g('front_delts').opacity}/>
            <ellipse cx="42" cy="120" rx="7" ry="16" fill={g('biceps').fill} opacity={g('biceps').opacity}/>
            <ellipse cx="158" cy="120" rx="7" ry="16" fill={g('biceps').fill} opacity={g('biceps').opacity}/>
            <rect x="82" y="118" width="36" height="50" rx="6" fill={g('abs').fill} opacity={g('abs').opacity}/>
            <ellipse cx="80" cy="230" rx="14" ry="35" fill={g('quads').fill} opacity={g('quads').opacity}/>
            <ellipse cx="120" cy="230" rx="14" ry="35" fill={g('quads').fill} opacity={g('quads').opacity}/>
            <ellipse cx="72" cy="340" rx="8" ry="25" fill={g('calves').fill} opacity={g('calves').opacity}/>
            <ellipse cx="128" cy="340" rx="8" ry="25" fill={g('calves').fill} opacity={g('calves').opacity}/>
            <text x="100" y="104" textAnchor="middle" fill="rgba(245,237,216,0.7)" fontSize="8" fontFamily="Barlow Condensed" fontWeight="600">PECS</text>
            <text x="100" y="146" textAnchor="middle" fill="rgba(245,237,216,0.7)" fontSize="8" fontFamily="Barlow Condensed" fontWeight="600">ABS</text>
            <text x="80" y="234" textAnchor="middle" fill="rgba(245,237,216,0.7)" fontSize="7" fontFamily="Barlow Condensed" fontWeight="600">QUAD</text>
            <text x="120" y="234" textAnchor="middle" fill="rgba(245,237,216,0.7)" fontSize="7" fontFamily="Barlow Condensed" fontWeight="600">QUAD</text>
          </svg>
          <div style={{ fontFamily: "'Barlow Condensed'", fontSize: 10, fontWeight: 700, letterSpacing: 3, color: '#8A8070', marginTop: 4 }}>FACE</div>
        </div>
        {/* BACK */}
        <div style={{ textAlign: 'center' }}>
          <svg viewBox="0 0 200 420" width="140" height="294" style={{ filter: 'drop-shadow(0 0 8px rgba(212,168,67,0.05))' }}>
            <g stroke="rgba(212,168,67,0.15)" strokeWidth="1" fill="none">
              <ellipse cx="100" cy="30" rx="22" ry="26"/>
              <rect x="90" y="56" width="20" height="14" rx="4"/>
              <path d="M65,70 L60,72 L55,85 L52,130 L55,175 L60,185 L80,190 L100,192 L120,190 L140,185 L145,175 L148,130 L145,85 L140,72 L135,70 Z"/>
              <path d="M55,85 L42,90 L32,120 L28,155 L25,180 L28,185 L32,182 L36,155 L42,125 L50,100"/>
              <path d="M145,85 L158,90 L168,120 L172,155 L175,180 L172,185 L168,182 L164,155 L158,125 L150,100"/>
              <path d="M75,190 L70,220 L65,270 L62,320 L60,360 L58,400 L65,410 L72,405 L70,360 L72,320 L75,270 L80,220 L85,195"/>
              <path d="M125,190 L130,220 L135,270 L138,320 L140,360 L142,400 L135,410 L128,405 L130,360 L128,320 L125,270 L120,220 L115,195"/>
            </g>
            <path d="M78,70 L100,65 L122,70 L115,90 L100,85 L85,90 Z" fill={g('traps').fill} opacity={g('traps').opacity}/>
            <ellipse cx="58" cy="82" rx="8" ry="10" fill={g('rear_delts').fill} opacity={g('rear_delts').opacity}/>
            <ellipse cx="142" cy="82" rx="8" ry="10" fill={g('rear_delts').fill} opacity={g('rear_delts').opacity}/>
            <ellipse cx="75" cy="120" rx="15" ry="22" fill={g('lats').fill} opacity={g('lats').opacity}/>
            <ellipse cx="125" cy="120" rx="15" ry="22" fill={g('lats').fill} opacity={g('lats').opacity}/>
            <ellipse cx="42" cy="120" rx="7" ry="16" fill={g('triceps').fill} opacity={g('triceps').opacity}/>
            <ellipse cx="158" cy="120" rx="7" ry="16" fill={g('triceps').fill} opacity={g('triceps').opacity}/>
            <rect x="82" y="145" width="36" height="25" rx="6" fill={g('lower_back').fill} opacity={g('lower_back').opacity}/>
            <ellipse cx="82" cy="188" rx="16" ry="12" fill={g('glutes').fill} opacity={g('glutes').opacity}/>
            <ellipse cx="118" cy="188" rx="16" ry="12" fill={g('glutes').fill} opacity={g('glutes').opacity}/>
            <ellipse cx="80" cy="240" rx="12" ry="30" fill={g('hamstrings').fill} opacity={g('hamstrings').opacity}/>
            <ellipse cx="120" cy="240" rx="12" ry="30" fill={g('hamstrings').fill} opacity={g('hamstrings').opacity}/>
            <ellipse cx="72" cy="340" rx="8" ry="25" fill={g('calves').fill} opacity={g('calves').opacity}/>
            <ellipse cx="128" cy="340" rx="8" ry="25" fill={g('calves').fill} opacity={g('calves').opacity}/>
            <text x="100" y="82" textAnchor="middle" fill="rgba(245,237,216,0.7)" fontSize="8" fontFamily="Barlow Condensed" fontWeight="600">TRAPS</text>
            <text x="75" y="124" textAnchor="middle" fill="rgba(245,237,216,0.7)" fontSize="7" fontFamily="Barlow Condensed" fontWeight="600">LATS</text>
            <text x="125" y="124" textAnchor="middle" fill="rgba(245,237,216,0.7)" fontSize="7" fontFamily="Barlow Condensed" fontWeight="600">LATS</text>
            <text x="100" y="160" textAnchor="middle" fill="rgba(245,237,216,0.7)" fontSize="7" fontFamily="Barlow Condensed" fontWeight="600">LOMBAIRES</text>
            <text x="100" y="192" textAnchor="middle" fill="rgba(245,237,216,0.7)" fontSize="7" fontFamily="Barlow Condensed" fontWeight="600">FESSIERS</text>
            <text x="80" y="244" textAnchor="middle" fill="rgba(245,237,216,0.7)" fontSize="7" fontFamily="Barlow Condensed" fontWeight="600">ISCH</text>
            <text x="120" y="244" textAnchor="middle" fill="rgba(245,237,216,0.7)" fontSize="7" fontFamily="Barlow Condensed" fontWeight="600">ISCH</text>
          </svg>
          <div style={{ fontFamily: "'Barlow Condensed'", fontSize: 10, fontWeight: 700, letterSpacing: 3, color: '#8A8070', marginTop: 4 }}>DOS</div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 14 }}>
        {Object.values(SC).map(v => (
          <div key={v.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: v.fill, opacity: v.opacity }} />
            <span style={{ fontFamily: "'DM Sans'", fontSize: 11, color: '#8A8070' }}>{v.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
