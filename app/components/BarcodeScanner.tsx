'use client'
import { useState, useRef, useEffect } from 'react'
import { X, Camera, Search, Plus } from 'lucide-react'

const GOLD = '#D4A843'
const BG = '#0A0A0A'
const CARD = '#1A1A1A'
const BORDER = '#2A2A2A'
const TEXT = '#F8FAFC'
const MUTED = '#6B7280'

const NUTRI_COLORS: Record<string, string> = { a: '#038141', b: '#85BB2F', c: '#FECB02', d: '#EE8100', e: '#E63E11' }

interface BarcodeScannerProps {
  supabase: any
  userId: string
  onProductAdded: () => void
  onClose: () => void
  defaultMealType?: string
  continuousMode?: boolean // "Scanne ton frigo" — scan multiple items, auto-save to preferences
}

export default function BarcodeScanner({ supabase, userId, onProductAdded, onClose, defaultMealType, continuousMode }: BarcodeScannerProps) {
  const scannerRef = useRef<any>(null)
  const [scanning, setScanning] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const [scanCount, setScanCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [product, setProduct] = useState<any>(null)
  const [quantity, setQuantity] = useState(100)
  const [mealType, setMealType] = useState(defaultMealType || 'dejeuner')
  const [saving, setSaving] = useState(false)
  const mountedRef = useRef(true)

  // Auto-start on mount
  useEffect(() => {
    mountedRef.current = true
    startCamera()
    return () => { mountedRef.current = false; stopCamera() }
  }, [])

  async function startCamera() {
    setError('')
    try {
      const { Html5Qrcode } = await import('html5-qrcode')
      const scanner = new Html5Qrcode('barcode-reader', { verbose: false })
      scannerRef.current = scanner

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 280, height: 150 }, aspectRatio: 1.333 },
        (decodedText: string) => {
          scanner.stop().catch(() => {})
          scannerRef.current = null
          if (mountedRef.current) { setScanning(false); lookupProduct(decodedText) }
        },
        () => {} // scan in progress
      )
      if (mountedRef.current) setScanning(true)
    } catch (err: any) {
      const msg = String(err?.message || err || '')
      if (msg.includes('NotAllowed') || msg.includes('Permission')) {
        setError("Autorise l'accès à la caméra dans les réglages de ton navigateur.")
      } else if (msg.includes('NotFound') || msg.includes('Requested device not found')) {
        setError('Aucune caméra détectée sur cet appareil.')
      } else {
        setError("Impossible d'ouvrir la caméra. Saisis le code manuellement.")
      }
    }
  }

  function stopCamera() {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {})
      scannerRef.current = null
    }
    setScanning(false)
  }

  async function lookupProduct(code: string) {
    const cleanCode = code.replace(/\D/g, '').trim()
    if (!cleanCode) { setError('Code-barres invalide'); return }
    setLoading(true); setError(''); setProduct(null)
    try {
      // Check if already in custom_foods (may fail if barcode column doesn't exist yet)
      try {
        const { data: existing } = await supabase.from('custom_foods').select('*').eq('user_id', userId).eq('barcode', cleanCode).limit(1).maybeSingle()
        if (existing?.name) {
          setProduct({ name: existing.name, brand: existing.brand || '', image_url: existing.image_url, barcode: cleanCode, per_100g: { calories: existing.calories_per_100g, proteins: existing.proteins_per_100g, carbs: existing.carbs_per_100g, fat: existing.fats_per_100g }, _existingId: existing.id })
          setLoading(false); return
        }
      } catch {} // barcode column may not exist yet

      const res = await fetch(`/api/food-barcode?code=${cleanCode}`)
      const data = await res.json()
      if (data.found) {
        setProduct(data.product)
      } else {
        setError(`Produit non trouvé pour le code ${cleanCode}. Vérifie le code-barres.`)
      }
    } catch (e) {
      setError('Erreur de connexion. Vérifie ta connexion internet.')
    }
    setLoading(false)
  }

  async function addToMeal() {
    if (!product || saving) return
    setSaving(true)
    const p = product.per_100g
    const cal = Math.round((p.calories / 100) * quantity)
    const prot = Math.round((p.proteins / 100) * quantity * 10) / 10
    const gluc = Math.round((p.carbs / 100) * quantity * 10) / 10
    const lip = Math.round((p.fat / 100) * quantity * 10) / 10

    // Save to custom_foods
    if (!product._existingId) {
      try {
        await supabase.from('custom_foods').upsert({
          user_id: userId, name: product.name, brand: product.brand,
          calories_per_100g: p.calories, proteins_per_100g: p.proteins,
          carbs_per_100g: p.carbs, fats_per_100g: p.fat,
          barcode: product.barcode, image_url: product.image_url,
        }, { onConflict: 'user_id,barcode', ignoreDuplicates: true })
      } catch {} // barcode column may not exist
    }

    if (continuousMode) {
      // In continuous mode: save to preferences, DON'T add to daily_food_logs
      // Increment scan count if already exists
      try {
        await supabase.rpc('increment_scan_count', { p_user_id: userId, p_barcode: product.barcode }).catch(() => {})
      } catch {}
      setSaving(false)
      setScanCount(prev => prev + 1)
      setProduct(null)
      setQuantity(100)
      // Restart scanner
      startCamera()
    } else {
      // Normal mode: add to daily_food_logs and close
      await supabase.from('daily_food_logs').insert({
        user_id: userId, date: new Date().toISOString().split('T')[0],
        meal_type: mealType,
        custom_name: `${product.name}${product.brand ? ` (${product.brand})` : ''} ${quantity}g`,
        calories: cal, protein: prot, carbs: gluc, fat: lip,
        quantity_g: quantity,
      })
      // Save to community_foods for future searches (upsert by name)
      const p100 = product.per_100g
      const { data: existing } = await supabase.from('community_foods').select('id').eq('name', product.name).maybeSingle()
      if (!existing) {
        await supabase.from('community_foods').insert({
          name: product.name, brand: product.brand || null,
          calories_per_100g: Math.round(p100.calories), protein_per_100g: Math.round(p100.proteins * 10) / 10,
          carbs_per_100g: Math.round(p100.carbs * 10) / 10, fat_per_100g: Math.round(p100.fat * 10) / 10,
          barcode: product.barcode || null, created_by: userId,
        }).then(() => {}).catch(() => {}) // silently ignore if fails
      }
      setSaving(false)
      onProductAdded()
    }
  }

  // ── Product found view ──
  if (product) {
    const p = product.per_100g
    const cal = Math.round((p.calories / 100) * quantity)
    const prot = Math.round((p.proteins / 100) * quantity * 10) / 10
    const gluc = Math.round((p.carbs / 100) * quantity * 10) / 10
    const lip = Math.round((p.fat / 100) * quantity * 10) / 10

    return (
      <div style={{ position: 'fixed', inset: 0, background: BG, zIndex: 1100, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
          <div>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.1rem', fontWeight: 700, color: TEXT }}>PRODUIT TROUVÉ</span>
            {continuousMode && scanCount > 0 && <span style={{ marginLeft: 8, fontSize: '0.72rem', color: GOLD, fontWeight: 600 }}>{scanCount} scanné{scanCount > 1 ? 's' : ''}</span>}
          </div>
          <button onClick={() => { stopCamera(); onClose() }} style={{ width: 32, height: 32, borderRadius: '50%', background: '#222', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} color={MUTED} /></button>
        </div>

        <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Product info */}
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            {product.image_url && <img src={product.image_url} alt="Photo du produit scanné" style={{ width: 64, height: 64, borderRadius: 12, objectFit: 'cover', background: '#fff' }} />}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: TEXT }}>{product.name}</div>
              {product.brand && <div style={{ fontSize: '0.78rem', color: MUTED }}>{product.brand}</div>}
              <div style={{ fontSize: '0.65rem', color: MUTED, marginTop: 2 }}>Code : {product.barcode}</div>
            </div>
            {product.nutriscore && (
              <div style={{ width: 32, height: 32, borderRadius: 8, background: NUTRI_COLORS[product.nutriscore] || '#666', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: '1rem', textTransform: 'uppercase' }}>{product.nutriscore}</div>
            )}
          </div>

          {/* Macros per 100g */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {[
              { l: 'Kcal', v: p.calories, c: GOLD },
              { l: 'Prot', v: `${p.proteins}g`, c: '#3B82F6' },
              { l: 'Gluc', v: `${p.carbs}g`, c: '#F59E0B' },
              { l: 'Lip', v: `${p.fat}g`, c: '#22C55E' },
            ].map(m => (
              <div key={m.l} style={{ background: CARD, borderRadius: 10, padding: '8px 4px', textAlign: 'center' }}>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.2rem', fontWeight: 700, color: m.c }}>{m.v}</div>
                <div style={{ fontSize: '0.55rem', color: MUTED, fontWeight: 700, textTransform: 'uppercase' }}>{m.l}/100g</div>
              </div>
            ))}
          </div>

          {/* Quantity */}
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: MUTED, fontSize: '0.9rem', flex: 1 }}>Quantité</span>
            <input type="number" value={quantity} onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 0))} inputMode="numeric"
              style={{ background: 'transparent', color: TEXT, fontSize: '1.4rem', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, textAlign: 'right', width: 80, outline: 'none', border: 'none' }} />
            <span style={{ color: GOLD, fontWeight: 700 }}>g</span>
          </div>

          {/* Calculated macros */}
          <div style={{ background: `${GOLD}10`, border: `1px solid ${GOLD}20`, borderRadius: 14, padding: '12px 16px' }}>
            <div style={{ fontSize: '0.65rem', color: MUTED, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Pour {quantity}g :</div>
            <div style={{ display: 'flex', justifyContent: 'space-around' }}>
              {[['Kcal', cal], ['Prot', `${prot}g`], ['Gluc', `${gluc}g`], ['Lip', `${lip}g`]].map(([n, v]) => (
                <div key={n as string} style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.4rem', fontWeight: 700, color: GOLD }}>{v}</div>
                  <div style={{ fontSize: '0.6rem', color: MUTED, textTransform: 'uppercase' }}>{n}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Meal type */}
          <div style={{ display: 'flex', gap: 6 }}>
            {[['petit_dejeuner', 'Matin'], ['dejeuner', 'Midi'], ['collation', 'Collation'], ['diner', 'Dîner']].map(([id, label]) => (
              <button key={id} onClick={() => setMealType(id)} style={{ flex: 1, padding: '8px 4px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.68rem', fontWeight: 700, background: mealType === id ? `${GOLD}20` : BG, color: mealType === id ? GOLD : MUTED }}>{label}</button>
            ))}
          </div>

          {/* Actions */}
          <button onClick={addToMeal} disabled={saving} style={{ width: '100%', padding: '16px', borderRadius: 14, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${GOLD}, #D4AF37)`, color: '#000', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Ajout...' : continuousMode ? '✓ Ajouter et scanner suivant' : 'Ajouter au repas'}
          </button>
          <button onClick={() => { setProduct(null); setError(''); startCamera() }} style={{ width: '100%', padding: '12px', borderRadius: 14, border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
            Scanner un autre produit
          </button>
        </div>
      </div>
    )
  }

  // ── Scanner view ──
  return (
    <div style={{ position: 'fixed', inset: 0, background: BG, zIndex: 1100, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.1rem', fontWeight: 700, color: TEXT }}>{scanning ? 'POINTE VERS LE CODE-BARRES' : 'SCANNER UN ALIMENT'}</span>
        <button onClick={() => { stopCamera(); onClose() }} style={{ width: 32, height: 32, borderRadius: '50%', background: '#222', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} color={MUTED} /></button>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px', gap: 16, overflowY: 'auto' }}>
        {/* Camera scanner (html5-qrcode renders here) */}
        <div style={{ width: '100%', maxWidth: 400, margin: '0 auto', borderRadius: 16, overflow: 'hidden', background: '#111', minHeight: scanning ? 300 : 0 }}>
          <div id="barcode-reader" />
        </div>

        {/* Status messages */}
        {!scanning && !error && !loading && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ width: 60, height: 60, borderRadius: 16, background: `${GOLD}15`, border: `2px solid ${GOLD}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <div style={{ width: 24, height: 24, border: `3px solid ${GOLD}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            </div>
            <p style={{ fontSize: '0.82rem', color: MUTED }}>Activation de la caméra...</p>
          </div>
        )}

        {scanning && (
          <p style={{ fontSize: '0.78rem', color: GOLD, textAlign: 'center', margin: 0, fontWeight: 500 }}>Pointe la caméra vers le code-barres du produit</p>
        )}

        {error && (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <p style={{ fontSize: '0.82rem', color: '#EF4444', marginBottom: 10 }}>{error}</p>
            <button onClick={() => { stopCamera(); startCamera() }} style={{ padding: '10px 24px', borderRadius: 12, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${GOLD}, #D4AF37)`, color: '#000', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.85rem', fontWeight: 700 }}>
              Réessayer
            </button>
          </div>
        )}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 0' }}>
            <div style={{ width: 20, height: 20, border: `2px solid ${GOLD}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <span style={{ fontSize: '0.82rem', color: MUTED }}>Recherche du produit...</span>
          </div>
        )}

        {/* Manual input — always visible */}
        <div style={{ width: '100%', maxWidth: 400, margin: '0 auto' }}>
          <div style={{ fontSize: '0.75rem', color: TEXT, fontWeight: 600, textAlign: 'center', marginBottom: 8 }}>
            {scanning ? 'Ou saisir le code manuellement :' : 'Saisis le code-barres (13 chiffres) :'}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={manualCode} onChange={e => setManualCode(e.target.value.replace(/\D/g, '').slice(0, 14))} placeholder="3017620422003" inputMode="numeric"
              style={{ flex: 1, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '12px 14px', color: TEXT, fontSize: '0.9rem', outline: 'none', letterSpacing: '0.1em', textAlign: 'center' }}
              onKeyDown={e => { if (e.key === 'Enter' && manualCode.length >= 4) { stopCamera(); lookupProduct(manualCode) } }} />
            <button onClick={() => { if (manualCode.length >= 4) { stopCamera(); lookupProduct(manualCode) } }} disabled={manualCode.length < 8 || loading}
              style={{ padding: '12px 16px', borderRadius: 12, border: 'none', cursor: manualCode.length >= 4 ? 'pointer' : 'default', background: manualCode.length >= 4 ? GOLD : '#222', color: manualCode.length >= 4 ? '#000' : MUTED, fontWeight: 700 }}>
              <Search size={18} />
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        #barcode-reader { border: none !important; }
        #barcode-reader video { border-radius: 12px !important; }
        #barcode-reader__scan_region { border-radius: 12px !important; overflow: hidden !important; }
        #barcode-reader__dashboard { background: transparent !important; border: none !important; }
        #barcode-reader__dashboard_section { display: none !important; }
        #barcode-reader__dashboard_section_csr { display: none !important; }
        #barcode-reader__status_span { color: ${MUTED} !important; font-size: 0.72rem !important; }
      `}</style>
    </div>
  )
}
