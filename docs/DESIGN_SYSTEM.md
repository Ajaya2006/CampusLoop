# CampusLoop — Design System

CampusLoop is a marketplace, not an admin template. The visual language is calm, trustworthy and student-friendly: generous white surfaces, one confident violet accent, soft borders, restrained shadows and short, purposeful motion.

---

## 1. Brand

| Item | Value |
| --- | --- |
| Name | CampusLoop |
| Tagline | Buy. Sell. Connect. |
| Personality | Modern, youthful, trustworthy, minimal, professional, student-friendly |
| Logo | Rounded violet tile with a looped "C" glyph; wordmark in Plus Jakarta Sans ExtraBold; small uppercase tagline |
| Voice | Direct, human, never salesy. Explain consequences ("This cannot be undone") and avoid blame. |

---

## 2. Colour tokens

### Core palette

| Token | Hex | Usage |
| --- | --- | --- |
| `brand.500` | `#6D4AFF` | Primary actions, active navigation, focus rings, brand moments |
| `brand.50` | `#F1EEFF` | Tinted surfaces, active nav background, icon tiles |
| `brand.100` | `#E4DEFF` | Decorative fills |
| `brand.200` | `#CBC0FF` | Tinted borders |
| `brand.300` | `#AC9BFF` | Hover accents |
| `brand.400` | `#8C74FF` | Gradient mid-stop |
| `brand.600` | `#5B38E8` | Primary hover |
| `brand.700` | `#4A2BC4` | Primary active, text on tint |
| `brand.800` | `#3A219B` | Darker text on tint |
| `brand.900` | `#2A1870` | Dark accent surfaces |
| `accent` | `#3B82F6` | Secondary/information, charts |
| `success` | `#20B486` | Verified, completed, approved |
| `warning` | `#F59E0B` | Pending, caution, ratings |
| `danger` | `#EF4444` | Errors, destructive actions, rejected |

### Semantic surfaces (CSS variables, theme-aware)

| Token | Light | Dark |
| --- | --- | --- |
| `canvas` | `#F7F8FC` | `#0D0D14` |
| `surface` | `#FFFFFF` | `#161721` |
| `elevated` | `#FFFFFF` | `#1C1D2A` |
| `ink` | `#171725` | `#F0F1F7` |
| `muted` | `#667085` | `#969EB4` |
| `line` | `#E7E8EF` | `#2C2E3F` |

Implemented as RGB channel variables in `src/styles/index.css` so Tailwind opacity modifiers work (`bg-surface/90`, `border-line/80`). Dark mode uses the `.dark` class on `<html>`, toggled by `ThemeProvider`; the preference is persisted in `localStorage`.

### Usage ratios

- 70–80% neutral canvas/surface.
- 10–15% ink/muted text.
- ≤10% brand violet.
- Semantic colour only to communicate state, never decoration.

---

## 3. Typography

| Role | Family | Implementation |
| --- | --- | --- |
| Body and UI | Inter | `font-sans` (loaded from Google Fonts in `index.html`) |
| Display and headings | Plus Jakarta Sans | `font-display` on `h1`–`h4`, prices and key numerals |

| Style | Size / line height | Weight | Example |
| --- | --- | --- | --- |
| Display XL | 48 px / 1.1 | 800 | Landing hero (desktop) |
| Display L | 34–40 px / 1.1 | 800 | Hero (mobile) |
| Page title | 24–30 px / 1.2 | 700 | `PageHeader`, dashboard |
| Section title | 18–20 px / 1.3 | 700 | "Fresh on campus" |
| Card title | 14–16 px / 1.4 | 600 | Product name |
| Body | 14 px / 1.6 | 400 | Descriptions |
| Small | 13 px / 1.5 | 400–500 | Metadata |
| Micro | 10.5–11.5 px | 500–600 | Badges, timestamps, uppercase labels |

Use uppercase tracking only for tiny section labels (e.g. `text-[11px] uppercase tracking-wider text-muted`). Avoid all-caps headings. Prices use `font-display font-bold` and the `inr()` formatter (Indian digit grouping, no decimals).

---

## 4. Spacing and layout

- Base spacing scale: Tailwind's 4 px steps. Card padding `p-4`/`p-5`/`p-6`; section gaps `gap-4`–`gap-6`; page sections `space-y-12`–`space-y-20`.
- Page container: `.page-wrap` → `max-w-7xl`, responsive padding `px-4 sm:px-6 lg:px-8`.
- Desktop marketplace: 240 px sticky filter rail + fluid grid (1 / 2 / 3 columns).
- Chat: 300 px conversation rail + fluid thread, full-height panel.
- Admin: 224 px sidebar on desktop; horizontally scrollable pill nav on mobile.
- Mobile page padding bottom 24 (`pb-24`) to clear the fixed bottom navigation with safe-area inset.

---

## 5. Shape, elevation, motion

| Token | Value | Applied to |
| --- | --- | --- |
| `rounded-card` | 16 px | Cards, panels, modals (within the 12–18 px rule) |
| `rounded-control` | 11 px | Buttons, inputs, selects, tab containers (within 10–12 px) |
| `rounded-full` | — | Badges, chips, avatars, icon buttons |
| `shadow-card` | `0 1px 2px rgba(23,23,37,.04), 0 8px 24px -18px rgba(23,23,37,.18)` | Default surfaces |
| `shadow-lift` | `0 12px 32px -16px rgba(23,23,37,.24)` | Hover, modals, toasts, dropdowns |
| `shadow-focus` | `0 0 0 3px rgba(109,74,255,.18)` | Focus ring |

Motion:

Every animation and transition reads from one clock in `liquid-glass.css`, taken from Apple's WWDC25 "Meet Liquid Glass" session:

| Token | Value | Used for |
| --- | --- | --- |
| `--motion-instant` | 110 ms | Symmetry states that should feel immediate |
| `--motion-quick` | 160 ms | Hover, press release, colour changes |
| `--motion-base` | 240 ms | Focus rings, veil and fill shifts |
| `--motion-slow` | 320 ms | Menus, sheets, small morphs |
| `--motion-lens` | 480 ms | Materialisation of cards, pages, panels |
| `--motion-morph` | 460 ms | Controls morphing between states |
| `--motion-standard` / `-enter` / `-exit` / `-spring` | curves | The same four easings everywhere |
| `--press-scale` | 0.96 | Gel press on every pressable surface |

Rules:

- Glass never fades and never travels. Content arrives with `glass-materialize` (lens pulls focus, pane settles from 0.966, edges light up), menus and sheets open in place with `glass-morph`, and removals use `glass-dematerialize`. No `translateY` entrances and no stagger delays.
- Pressing a control lights it: `MotionEffects` spawns a `.press-glow` from the point of contact, and the surface flexes via `scale` (not `transform`, so it never fights a layout transform).
- Only transform, scale, opacity, filter and shadow animate. Cards lift by 2 px on hover; nothing loops except skeleton shimmer and the typing indicator.
- Tailwind's `transition`/`duration`/`ease-*` utilities resolve to the same tokens (`ease-spring`, `ease-enter`, 160 ms default), so utility classes and hand-written CSS cannot drift apart.
- `prefers-reduced-motion` removes animation and transition duration globally and cancels the gel press.

---

## 6. Components

All components are in `frontend/src/components`.

### Common (`components/common`)

| Component | Notes |
| --- | --- |
| `Button` | Variants `primary`, `secondary`, `outline`, `ghost`, `danger`, `success`; sizes `xs`–`lg`; `loading` spinner; optional icons; `buttonStyles()` helper for links |
| `Form` | `Input`, `Textarea`, `Select`, `Checkbox`, `Field`; label, hint, error with icon, required marker, invalid styling |
| `SearchBar` | Search icon, clear button, form submission |
| `Badge` | Tones neutral/brand/success/warning/danger/info; `StatusBadge` maps domain statuses; `VerifiedBadge` for students |
| `Avatar` | Initials fallback, sizes xs–xl, image support |
| `Modal` | Backdrop, Escape/backdrop close, focus trap, body scroll lock, responsive bottom-sheet on mobile |
| `ConfirmDialog` | Built on Modal; async confirm with loading; destructive styling |
| `Feedback` | `Spinner`, `LoadingPage`, `Skeleton`, `ProductCardSkeleton`, `ListSkeleton`, `EmptyState`, `ErrorState`, `InlineAlert` |
| `Pagination` | Prev/next plus a five-page window; hidden for a single page |
| `Tabs` | Pill tabs with counts, horizontal scroll, ARIA tablist |
| `RatingStars` | Filled/hollow stars, optional numeric value and count |
| `ProductImage` | Lazy image with branded gradient placeholder on missing/broken files |
| `Table` | Admin pages use semantic `<table>` markup with a horizontal scroll container |

### Layout (`components/layout`)

- `Navbar`: sticky, blurred surface; desktop links, notification bell, Sell Item CTA, avatar dropdown (dashboard, profile, listings, wishlist, settings, admin, sign out), theme toggle. Mobile: menu sheet with all workspace links.
- `MobileNav`: fixed bottom bar — Home, Explore, Sell (raised primary action), Chat (unread badge), Profile.
- `Footer`: brand, marketplace/account/trust columns, academic-project disclaimer.
- `AppLayout`, `AdminLayout`, `AuthLayout` (split brand panel + form).
- `PageHeader`: title, description, breadcrumb, actions.

### Domain components

- `marketplace/ProductCard`: 4:3 image, condition and discount badges, sold overlay, wishlist heart, price/original price, location, seller + verification, time.
- `marketplace/CategoryCard`: icon tile, name, live count.
- `marketplace/FilterPanel`: category tree select, condition checkboxes, price range, college, verified toggle, sort.
- `products/ListingForm`: create/edit form, image upload grid with progress, condition/category selects, price guide card with "Use this price", draft/submit visibility.
- `profile/ProfileHeader`: gradient cover, avatar, identity, badges, bio, four aggregate stats.
- `dashboard/StatCard`: label, value, icon tile, hint, optional link.

---

## 7. Page patterns

- **Marketplace** — sticky filter rail (desktop) or modal (mobile), search field, active filter chips, result count, 3-column grid, pagination, empty state with reset action.
- **Detail** — gallery + thumbnail strip on the left; price/actions/seller/safety cards on the right; description and attributes below; owner actions replace buyer actions.
- **Messages** — conversation rail with search and unread badges; thread header with counterpart and live status; contextual strip for latest offer, meeting, accepted price and transaction; message bubbles aligned by sender; composer with Enter-to-send and Shift+Enter newline.
- **Dashboards** — stat grid, contextual verification banner, two-column activity/performance, quick actions.
- **Admin** — sidebar nav, queue tabs, card lists or tables, modals for decisions with required reasons.
- **Auth** — split layout: violet brand story on the left (desktop), focused form on the right; demo account shortcuts in development.

---

## 8. States

| State | Treatment |
| --- | --- |
| Loading | Skeletons for lists/cards; spinner + label for pages; button spinners |
| Empty | Icon tile, headline, one-sentence explanation, primary action |
| Error | Warning icon, human message, retry button; field-level errors under inputs |
| Success | Toast (bottom-right desktop, above mobile nav), inline success alerts |
| Destructive | Red button + confirmation modal naming the consequence |
| Disabled | Reduced opacity, not-allowed cursor, explanation nearby |
| Offline/unreachable | "Cannot reach the server. Check your connection and try again." |

---

## 9. Accessibility

- Semantic landmarks: `header`, `nav`, `main#main`, `footer`.
- Visible focus rings on all interactive elements; modals trap focus and restore scroll.
- Icon-only buttons have `aria-label`; toggles use `aria-pressed`/`aria-expanded`; tabs use `role="tablist"`/`aria-selected`.
- Form inputs are associated with labels; errors use `aria-invalid` and adjacent text (not colour alone).
- Status is always communicated with text as well as colour.
- Contrast targets: ink on surface and muted-on-surface meet AA for body text; semantic text uses darker shades on tinted backgrounds.
- Touch targets: primary buttons ≥ 40 px; mobile nav items ≥ 54 px wide.
- Reduced motion respected.

---

## 10. Iconography

Lucide React, 13–22 px depending on context, `stroke-width` default. Icons reinforce meaning but never replace a text label in navigation or primary actions. Category icons map from backend `icon` strings to a fixed Lucide map so unknown values fall back to a grid icon.

---

## 11. Implementation references

| Concern | File |
| --- | --- |
| Tokens and base styles | `frontend/src/styles/index.css` |
| Tailwind theme extension | `frontend/tailwind.config.js` |
| Fonts | `frontend/index.html` |
| Status maps and navigation | `frontend/src/constants/index.js` |
| Formatting (INR, dates, initials) | `frontend/src/utils/format.js` |
| Theme switching | `frontend/src/context/ThemeContext.jsx` |
