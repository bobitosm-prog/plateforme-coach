---
name: frontend-design
description: Create distinctive, production-grade frontend interfaces with high design quality.
---

This skill guides creation of distinctive, production-grade frontend interfaces that avoid generic "AI slop" aesthetics.

## Design Thinking

Before coding, commit to a BOLD aesthetic direction:
- **Purpose**: What problem does this interface solve? Who uses it?
- **Tone**: Pick an extreme: brutally minimal, maximalist chaos, retro-futuristic, organic/natural, luxury/refined, playful/toy-like, editorial/magazine, brutalist/raw, art deco/geometric, soft/pastel, industrial/utilitarian
- **Differentiation**: What makes this UNFORGETTABLE?

## Frontend Aesthetics Guidelines

- **Typography**: Choose distinctive, characterful fonts. NEVER use generic fonts (Inter, Roboto, Arial). Pair a display font with a refined body font.
- **Color & Theme**: Dominant colors with sharp accents. Use CSS variables. No timid, evenly-distributed palettes.
- **Motion**: Staggered reveals on load, scroll-triggered animations, surprising hover states. CSS-only for HTML, Motion library for React.
- **Spatial Composition**: Asymmetry. Overlap. Diagonal flow. Grid-breaking elements. Generous negative space OR controlled density.
- **Backgrounds & Visual Details**: Gradient meshes, noise textures, geometric patterns, layered transparencies, dramatic shadows, custom cursors, grain overlays.

NEVER use: overused fonts (Inter, Roboto, Space Grotesk), purple gradients on white, predictable layouts, cookie-cutter components.

Match complexity to vision. Maximalist = elaborate animations. Minimalist = precision spacing and subtle details. The key is intentionality.

## MoovX Specific Context

### Brand Direction
**Swiss Precision × Athletic Editorial** — luxury, sobre, premium.
Palette : noir/charbon dominant, accent doré (GOLD), texte blanc.
Mobile-first impératif. Pas de flashy, pas de ludique enfantin.

### Design System Tokens

Tous les styles UI viennent de `lib/design-tokens.ts`. **TOUJOURS
chercher un token existant avant de créer un style inline.** Tokens
clés :

| Token | Usage |
|---|---|
| `cardStyle` | Container card standard (surface + border + shadow) |
| `titleStyle` | Titre tiny GOLD uppercase letter-spaced (11px, 0.15em) |
| `titleLineStyle` | Ligne décorative or à côté des titres |
| `cardTitleAbove` | titleStyle + marginBottom 8 |
| `subtitleStyle` | Sous-titre 12px muted uppercase |
| `statStyle` | Big stat number 28px text-primary |
| `statSmallStyle` | Small stat 18px GOLD |
| `mutedStyle` | Timestamps, dates 12px text-dim |
| `bodyStyle` | Body 14px text-muted |
| `labelStyle` | Label clickable 12px GOLD uppercase |
| `badgeStyle` | Pill GOLD background goldDim |
| `btnPrimary` | Gradient gold uppercase letter-spaced |
| `pageTitleStyle` | Page title 24px uppercase letter-spaced |

### MoovX UI Patterns

#### Card avec titre AU-DESSUS (pas dans la card)

```tsx
<div className="flex items-center gap-3 mb-2">
  <span style={titleStyle}>SECTION TITLE</span>
  <div style={titleLineStyle} />
</div>
<div style={cardStyle}>...</div>
```

Pattern omniprésent dans l'app (Nutrition, Training, Profile).
La ligne or qui s'étire à droite du titre = signature MoovX.

#### Wrappers layout critique

Sur wrappers `fixed` ou `absolute`, Tailwind `max-w-*` est unreliable.
Préférer inline style :

```tsx
style={{
  maxWidth: 512,
  marginLeft: 'auto',
  marginRight: 'auto',
  paddingLeft: 20,
  paddingRight: 20
}}
```

### Decisions Design Senior (MoovX)

- **Pas d'icônes décoratives** type Trophy, Award sur écrans premium.
  Apple Fitness, Whoop, Strava ne l'utilisent pas. Typographie + data
  viz suffisent.
- **Volume = stat hero motivante** dans les récaps training (vs Durée
  ou Sets qui sont plus stables). Permet narrative "j'ai soulevé 2.5
  tonnes cette semaine".
- **Loi de Hick** : top 3 items max dans listes/podium, jamais 10.
- **Premium sur mobile ≠ éditorial magazine.** Les cards stylées avec
  padding interne ET externe sont essentielles pour la hiérarchie
  visuelle. Pas de "tout aligné à gauche sans cards".
- **Signature éditoriale luxe** : titre avec point final + couleur
  accent ("Séance terminée." avec le `.` en GOLD). Ref Hermès,
  Apple Watch.

### Tests UI

- Mobile iPhone = cible #1. **Toujours tester sur iPhone Safari**
  AVANT de valider, pas seulement sur desktop ou simulateur.
- Hard refresh impératif sur iPhone (pull-to-refresh long, ou ferme
  l'onglet + rouvre).
