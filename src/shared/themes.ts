import type { Theme } from './types'

/**
 * Base stylesheet for every deck. Slides are a fixed 1280x720 canvas; the
 * runtime scales them to fit. Themes only change the CSS variables.
 * The utility classes below are also described to the AI in the system prompt.
 */
export const BASE_CSS = `
*,*::before,*::after{box-sizing:border-box}
.slide{position:relative;width:1280px;height:720px;overflow:hidden;
  padding:72px 88px;display:flex;flex-direction:column;gap:24px;
  background:var(--bg);color:var(--fg);font-family:var(--font);font-size:28px;line-height:1.4}
.slide h1{font-family:var(--heading-font);font-size:72px;line-height:1.05;margin:0;font-weight:800;letter-spacing:-.02em}
.slide h2{font-family:var(--heading-font);font-size:52px;line-height:1.1;margin:0;font-weight:750;letter-spacing:-.01em}
.slide h3{font-family:var(--heading-font);font-size:32px;margin:0;font-weight:700}
.slide p{margin:0}
.slide ul,.slide ol{margin:0;padding-inline-start:1.2em;display:flex;flex-direction:column;gap:14px}
.slide li::marker{color:var(--accent)}
.slide a{color:var(--accent)}
.slide code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.85em;
  background:var(--surface);padding:.1em .35em;border-radius:6px}
.slide pre{margin:0;background:var(--surface);padding:24px;border-radius:14px;font-size:22px;overflow:hidden}
.slide pre code{background:none;padding:0}
.slide img,.slide svg{max-width:100%}
.slide.center,.slide .center{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
.slide.rtl{direction:rtl}
.slide.rtl h1,.slide.rtl h2,.slide.rtl h3{line-height:1.35;letter-spacing:0}
.slide .muted{color:var(--muted)}
.slide .accent{color:var(--accent)}
.slide .kicker{font-size:22px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--accent)}
.slide .lead{font-size:32px;color:var(--muted);max-width:900px}
.slide .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:32px;flex:1;min-height:0}
.slide .grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:28px;flex:1;min-height:0}
.slide .card{background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:28px;
  display:flex;flex-direction:column;gap:12px}
.slide .stat{font-family:var(--heading-font);font-size:84px;font-weight:800;color:var(--accent);line-height:1}
.slide .badge{display:inline-block;padding:6px 16px;border-radius:999px;background:var(--accent);color:var(--accent-fg);
  font-size:20px;font-weight:700;width:fit-content}
.slide .spacer{flex:1}
.slide .footer{position:absolute;inset-inline:88px;bottom:36px;font-size:18px;color:var(--muted);display:flex;justify-content:space-between}
.slide .fade-up{opacity:0;transform:translateY(24px)}
.slide.active .fade-up{animation:lv-fade-up .6s ease forwards}
.slide.active .fade-up:nth-child(2){animation-delay:.1s}
.slide.active .fade-up:nth-child(3){animation-delay:.2s}
.slide.active .fade-up:nth-child(4){animation-delay:.3s}
.slide.active .fade-up:nth-child(5){animation-delay:.4s}
@keyframes lv-fade-up{to{opacity:1;transform:none}}
`

function vars(v: Record<string, string>): string {
  return ':root{' + Object.entries(v).map(([k, val]) => `--${k}:${val}`).join(';') + '}'
}

const SANS = `"Inter","Segoe UI","Noto Sans Arabic","Noto Sans",system-ui,-apple-system,sans-serif`
const SERIF = `"Georgia","Noto Naskh Arabic","Times New Roman",serif`

export const THEMES: Theme[] = [
  {
    id: 'midnight',
    name: 'Midnight',
    swatch: ['#0f1117', '#7c9cff'],
    css: vars({
      bg: '#0f1117', fg: '#f3f4f8', muted: '#9aa1b5', accent: '#7c9cff', 'accent-fg': '#0f1117',
      surface: '#1a1d27', border: '#2a2f3d', font: SANS, 'heading-font': SANS
    })
  },
  {
    id: 'paper',
    name: 'Paper',
    swatch: ['#faf8f3', '#c2410c'],
    css: vars({
      bg: '#faf8f3', fg: '#1c1917', muted: '#6b645c', accent: '#c2410c', 'accent-fg': '#fff',
      surface: '#f1ede4', border: '#e3ddd0', font: SANS, 'heading-font': SERIF
    })
  },
  {
    id: 'ocean',
    name: 'Ocean',
    swatch: ['#06283d', '#47b5ff'],
    css: vars({
      bg: 'linear-gradient(135deg,#06283d,#0b3d5c)', fg: '#eaf6ff', muted: '#9cc3dc', accent: '#47b5ff',
      'accent-fg': '#06283d', surface: 'rgba(255,255,255,.07)', border: 'rgba(255,255,255,.14)',
      font: SANS, 'heading-font': SANS
    })
  },
  {
    id: 'sunset',
    name: 'Sunset',
    swatch: ['#2b1331', '#ff8a5b'],
    css: vars({
      bg: 'linear-gradient(140deg,#2b1331,#5b1f3a 60%,#8a3b2e)', fg: '#fff4ec', muted: '#e7c1b3',
      accent: '#ff8a5b', 'accent-fg': '#2b1331', surface: 'rgba(255,255,255,.08)',
      border: 'rgba(255,255,255,.16)', font: SANS, 'heading-font': SANS
    })
  },
  {
    id: 'mono',
    name: 'Mono',
    swatch: ['#ffffff', '#111111'],
    css: vars({
      bg: '#ffffff', fg: '#111111', muted: '#666666', accent: '#111111', 'accent-fg': '#ffffff',
      surface: '#f4f4f4', border: '#e2e2e2', font: SANS, 'heading-font': SANS
    })
  }
]

export function getTheme(id: string): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0]
}
