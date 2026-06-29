# BMFC Club Hub — brand design tokens

Raw values from `tailwind.config.js`, `src/index.css`, PWA config, and related sources.  
Last extracted from the codebase for reference when building external assets or docs.

---

## `tailwind.config.js` (full)

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: '#2B5FC0',
          gold: '#D4A017',
          navy: '#0D1B4B',
          white: '#FFFFFF',
          light: '#F0F4FF',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Figtree', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      borderRadius: {
        card: '20px',
        pill: '50px',
      },
      boxShadow: {
        glass: '0 8px 32px rgba(13, 27, 75, 0.08)',
        'glass-hover': '0 12px 40px rgba(13, 27, 75, 0.12)',
      },
    },
  },
  plugins: [],
}
```

No custom spacing scale is defined in Tailwind config (default Tailwind spacing scale applies).

---

## Brand colour tokens

| Token | Hex | Tailwind class |
|-------|-----|----------------|
| `brand.blue` | `#2B5FC0` | `text-brand-blue`, `bg-brand-blue`, etc. |
| `brand.gold` | `#D4A017` | `text-brand-gold`, `bg-brand-gold`, etc. |
| `brand.navy` | `#0D1B4B` | `text-brand-navy`, `bg-brand-navy`, etc. |
| `brand.white` | `#FFFFFF` | `text-brand-white`, `bg-brand-white`, etc. |
| `brand.light` | `#F0F4FF` | `text-brand-light`, `bg-brand-light`, etc. |

---

## Additional colours (hardcoded outside Tailwind tokens)

### `index.html`

```html
<meta name="theme-color" content="#2B5FC0" />
```

### `vite.config.ts` (PWA manifest)

```
theme_color: '#2B5FC0',
background_color: '#0a0a0a',
```

### `src/index.css`

```
body text: #374151
.page-bg gradient: #F0F4FF 0%, #E8EEFF 100%
.glass-card border: rgba(43, 95, 192, 0.15)
.glass-card shadow: rgba(13, 27, 75, 0.08)
.glass-nav border-bottom: rgba(43, 95, 192, 0.12)
.admin-section / .admin-inner-card border: rgba(43, 95, 192, 0.15)
.admin-section / .admin-inner-card shadow: rgba(13, 27, 75, 0.08)
.btn-primary shadow: rgba(43, 95, 192, 0.25)
.btn-primary:hover shadow: rgba(43, 95, 192, 0.3)
.btn-secondary:hover shadow: rgba(13, 27, 75, 0.08)
::-webkit-scrollbar-track: #f0f4ff
::-webkit-scrollbar-thumb: rgba(43, 95, 192, 0.25)
::-webkit-scrollbar-thumb:hover: #2B5FC0
.landing-download-glow background: rgba(43, 95, 192, 0.55)
```

### `src/App.tsx` (react-hot-toast)

```
color: '#0D1B4B'
border: '1px solid rgba(43, 95, 192, 0.15)'
background: 'rgba(255, 255, 255, 0.92)'
boxShadow: '0 8px 32px rgba(13, 27, 75, 0.08)'
success iconTheme primary: '#2B5FC0', secondary: '#FFFFFF'
error iconTheme primary: '#DC2626', secondary: '#FFFFFF'
borderRadius: '50px'
padding: '10px 20px'
```

### `src/pages/Landing.tsx`

```
subtitle text: #6B7280
```

### `src/components/ui/LandingDownloadButton.tsx`

```
shadow-[0_4px_16px_rgba(212,160,23,0.32)]
hover:shadow-[0_8px_24px_rgba(212,160,23,0.4)]
```

### `scripts/generate-pwa-icons.mjs`

```
PWA icon canvas background: { r: 0, g: 0, b: 0, alpha: 1 }
maskable icon inner size: 384px in 512px canvas
```

### `src/components/club/PlayerRadarChart.tsx`

```
stroke="#2B5FC0"
```

---

## Font families

### Google Fonts load (`index.html`)

```html
<link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;600;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
```

### Tailwind tokens

```
font-sans    → Inter, system-ui, sans-serif
font-display → Figtree, system-ui, sans-serif
font-mono    → ui-monospace, SFMono-Regular, Menlo, monospace
```

### Base typography (`src/index.css`)

```css
body { @apply font-sans text-[#374151] antialiased; }
h1, h2, h3, h4 { @apply text-brand-navy font-display; }
```

---

## Border radius values

### Tailwind custom tokens

```
rounded-card → 20px
rounded-pill → 50px
```

### CSS component classes (`src/index.css`)

```
.glass-card          → border-radius: 20px
.admin-section       → border-radius: 16px
.admin-inner-card     → border-radius: 16px
.input-field          → rounded-2xl (Tailwind default: 1rem / 16px)
::-webkit-scrollbar-thumb → border-radius: 3px
Toaster               → borderRadius: '50px'
```

---

## Logo usage

No dedicated brand guidelines doc exists beyond this file and in-code usage.

### Assets

```
public/logo.png          — primary raster crest
public/logo.svg          — wrapper SVG (references logo.png); aria-label="Bishop Middleham Football Club crest"
public/favicon.png       — 32×32
public/pwa-192.png       — 192×192
public/pwa-512.png       — 512×512
public/pwa-512-maskable.png — 512×512 (384×384 inner, black background)
public/apple-touch-icon.png — 180×180
```

### Generation (`scripts/generate-pwa-icons.mjs`)

```
Source: public/logo.png (or generated from public/logo.svg at 512×512, fit: contain, black background)
Icons resized with fit: contain, background: { r: 0, g: 0, b: 0, alpha: 1 }
```

### In-app sizes

```
Navbar:     h-10 w-10 sm:h-11 sm:w-11 object-contain drop-shadow-sm, alt="BMFC"
Landing:    h-20 w-20 object-contain drop-shadow-md mb-8, alt="BMFC"
LoginForm:  h-20 w-20 mx-auto mb-4 object-contain drop-shadow-md, alt="BMFC"
InviteForm: h-20 w-20 mx-auto mb-4 object-contain drop-shadow-md, alt="BMFC"
PlayerProfileView badge: w-5 h-5 object-contain opacity-80
Fallback:   onError → src='/logo.svg' (Navbar, Landing, Login, Invite); PlayerProfile hides on error
```

### Nav behaviour (`docs/PAGES.md`)

```
Logged out: logo → /
Pending: logo → /
Approved (mobile): logo + first name only
```

---

## `src/index.css` (full)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html {
    scroll-padding-bottom: calc(7rem + env(safe-area-inset-bottom, 0px));
  }

  @media (min-width: 768px) {
    html {
      scroll-padding-bottom: 0;
    }
  }
}

@layer base {
  body {
    @apply font-sans text-[#374151] antialiased;
    min-height: 100vh;
    -webkit-tap-highlight-color: transparent;
  }

  html {
    -webkit-text-size-adjust: 100%;
  }

  #root {
    min-height: 100vh;
  }

  h1, h2, h3, h4 {
    @apply text-brand-navy font-display;
  }
}

@layer components {
  .page-bg {
    background: linear-gradient(135deg, #F0F4FF 0%, #E8EEFF 100%);
  }

  .glass-card {
    background: rgba(255, 255, 255, 0.65);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(43, 95, 192, 0.15);
    border-radius: 20px;
    box-shadow: 0 8px 32px rgba(13, 27, 75, 0.08);
  }

  .glass-nav {
    background: rgba(255, 255, 255, 0.72);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(43, 95, 192, 0.12);
  }

  .admin-section {
    background: rgba(255, 255, 255, 0.65);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(43, 95, 192, 0.15);
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(13, 27, 75, 0.08);
    @apply p-4 sm:p-6 mb-8 pb-8 border-b border-brand-blue/10 last:mb-0 last:border-b-0 last:pb-6;
  }

  .admin-section-heading {
    @apply flex items-stretch gap-3 text-lg font-semibold text-brand-navy;
  }

  .admin-section-heading-accent {
    @apply w-1 shrink-0 rounded-sm bg-brand-blue;
  }

  .admin-inner-card {
    background: rgba(255, 255, 255, 0.65);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(43, 95, 192, 0.15);
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(13, 27, 75, 0.08);
  }

  .btn-primary {
    @apply inline-flex items-center justify-center px-6 py-3 min-h-[48px] rounded-pill font-semibold text-white bg-brand-blue transition-all duration-200 touch-manipulation;
    box-shadow: 0 4px 16px rgba(43, 95, 192, 0.25);
  }

  .btn-primary:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 8px 24px rgba(43, 95, 192, 0.3);
  }

  @media (hover: none) {
    .btn-primary:hover:not(:disabled) {
      transform: none;
    }
  }

  .btn-primary:disabled {
    @apply opacity-50 cursor-not-allowed;
  }

  .btn-secondary {
    @apply inline-flex items-center justify-center px-6 py-3 rounded-pill font-semibold text-brand-blue bg-white/65 border border-brand-blue/30 transition-all duration-200;
    backdrop-filter: blur(12px);
  }

  .btn-secondary:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 8px 24px rgba(13, 27, 75, 0.08);
    @apply bg-white/80;
  }

  .btn-danger {
    @apply inline-flex items-center justify-center px-6 py-3 rounded-pill font-semibold text-red-600 bg-red-50 border border-red-200 transition-all duration-200;
  }

  .btn-danger:hover:not(:disabled) {
    transform: translateY(-1px);
    @apply bg-red-100;
  }

  .input-field {
    @apply w-full px-4 py-3 rounded-2xl bg-white/80 border border-brand-blue/15 text-brand-navy placeholder:text-gray-400 focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 transition-all;
  }

  .nav-link {
    @apply text-sm font-medium text-brand-navy hover:text-brand-blue transition-colors;
  }

  .nav-link-active {
    @apply text-brand-blue relative;
  }

  .nav-link-active::after {
    content: '';
    @apply absolute -bottom-1 left-0 right-0 h-0.5 bg-brand-blue rounded-full;
  }
}

@keyframes gradient-shift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-track {
  background: #f0f4ff;
}
::-webkit-scrollbar-thumb {
  background: rgba(43, 95, 192, 0.25);
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: #2B5FC0;
}

.page-enter {
  animation: fade-in 200ms ease-out;
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes landing-scroll-bounce {
  0%, 100% { transform: translateY(0); opacity: 0.5; }
  50% { transform: translateY(6px); opacity: 0.85; }
}

.landing-scroll-hint {
  animation: landing-scroll-bounce 2s ease-in-out infinite;
}

@keyframes landing-download-glow-pulse {
  0%, 100% {
    opacity: 0.18;
    transform: scale(0.97);
  }
  50% {
    opacity: 0.42;
    transform: scale(1.06);
  }
}

.landing-download-glow {
  background: rgba(43, 95, 192, 0.55);
  filter: blur(14px);
  animation: landing-download-glow-pulse 3.2s ease-in-out infinite;
}

.landing-download-glow-wrap:hover .landing-download-glow {
  animation-play-state: paused;
  opacity: 0.35;
}

@media (prefers-reduced-motion: reduce) {
  .landing-download-glow {
    animation: none;
    opacity: 0.28;
  }
}
```

---

## Copy rules

See [`docs/COPY-RULES.md`](./COPY-RULES.md) for full user-facing copy guidance (not duplicated here).
