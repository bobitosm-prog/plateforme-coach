export default function Privacy() {
  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#F0EDE8', fontFamily: "'Outfit', sans-serif", padding: '80px 24px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <h1 style={{ fontFamily: "'Bebas Neue'", fontSize: 48, color: '#C9A84C', letterSpacing: 2, marginBottom: 32 }}>POLITIQUE DE CONFIDENTIALITÉ</h1>
        <p style={{ color: '#8A8580', marginBottom: 16, lineHeight: 1.8 }}>Dernière mise à jour : Avril 2026</p>

        <h2 style={{ fontFamily: "'Barlow Condensed'", fontSize: 20, color: '#F0EDE8', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginTop: 40, marginBottom: 16 }}>1. DONNÉES COLLECTÉES</h2>
        <p style={{ color: '#8A8580', lineHeight: 1.8, marginBottom: 16 }}>MoovX collecte : email, nom, poids, mensurations, préférences alimentaires, historique d&apos;entraînement, photos de progression. Ces données sont nécessaires pour créer vos plans personnalisés.</p>

        <h2 style={{ fontFamily: "'Barlow Condensed'", fontSize: 20, color: '#F0EDE8', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginTop: 40, marginBottom: 16 }}>2. HÉBERGEMENT</h2>
        <p style={{ color: '#8A8580', lineHeight: 1.8, marginBottom: 16 }}>Vos données sont hébergées en Europe sur les serveurs Supabase. Les paiements sont traités par Stripe. Aucune donnée n&apos;est stockée sur nos propres serveurs.</p>

        <h2 style={{ fontFamily: "'Barlow Condensed'", fontSize: 20, color: '#F0EDE8', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginTop: 40, marginBottom: 16 }}>3. UTILISATION</h2>
        <p style={{ color: '#8A8580', lineHeight: 1.8, marginBottom: 16 }}>Vos données sont utilisées exclusivement pour générer vos plans nutritionnels et programmes d&apos;entraînement. Elles ne sont jamais vendues, partagées ou utilisées à des fins publicitaires.</p>

        <h2 style={{ fontFamily: "'Barlow Condensed'", fontSize: 20, color: '#F0EDE8', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginTop: 40, marginBottom: 16 }}>4. VOS DROITS (RGPD)</h2>
        <p style={{ color: '#8A8580', lineHeight: 1.8, marginBottom: 16 }}>Conformément au RGPD, vous avez le droit d&apos;accéder, modifier, exporter et supprimer vos données à tout moment. Utilisez la fonction Export dans votre profil ou contactez-nous à contact@moovx.ch.</p>

        <h2 style={{ fontFamily: "'Barlow Condensed'", fontSize: 20, color: '#F0EDE8', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginTop: 40, marginBottom: 16 }}>5. COOKIES</h2>
        <p style={{ color: '#8A8580', lineHeight: 1.8, marginBottom: 16 }}>MoovX utilise uniquement des cookies techniques nécessaires au fonctionnement de l&apos;application (authentification). Aucun cookie publicitaire ou de tracking.</p>

        <h2 style={{ fontFamily: "'Barlow Condensed'", fontSize: 20, color: '#F0EDE8', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginTop: 40, marginBottom: 16 }}>6. CONTACT</h2>
        <p style={{ color: '#8A8580', lineHeight: 1.8, marginBottom: 16 }}>Délégué à la protection des données : contact@moovx.ch<br />MoovX &middot; Genève, Suisse</p>

        <p style={{ color: '#3D3B38', marginTop: 60, fontSize: 13 }}>&copy; 2026 MoovX &middot; Genève, Suisse</p>
      </div>
    </div>
  )
}
