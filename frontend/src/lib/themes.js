// Preset themes — 10 curated color palettes. Layout stays the same across themes;
// only Tailwind emerald-* utility classes are re-mapped to the theme's palette via
// injected CSS `!important` overrides.
export const THEMES = [
  { id: 'emerald', name: 'সবুজ প্রকৃতি', primary: '#047857', dark: '#065f46', mid: '#059669', light: '#d1fae5', tint: '#ecfdf5', accent: '#f59e0b' },
  { id: 'rose', name: 'গোলাপি ভোর', primary: '#be123c', dark: '#9f1239', mid: '#e11d48', light: '#ffe4e6', tint: '#fff1f2', accent: '#f97316' },
  { id: 'ocean', name: 'আকাশ নীল', primary: '#1d4ed8', dark: '#1e40af', mid: '#2563eb', light: '#dbeafe', tint: '#eff6ff', accent: '#f59e0b' },
  { id: 'royal', name: 'রাজকীয় বেগুনি', primary: '#7c3aed', dark: '#6d28d9', mid: '#8b5cf6', light: '#ede9fe', tint: '#f5f3ff', accent: '#f59e0b' },
  { id: 'sunset', name: 'সূর্যাস্ত', primary: '#ea580c', dark: '#c2410c', mid: '#f97316', light: '#ffedd5', tint: '#fff7ed', accent: '#0d9488' },
  { id: 'teal', name: 'সাগর', primary: '#0d9488', dark: '#0f766e', mid: '#14b8a6', light: '#ccfbf1', tint: '#f0fdfa', accent: '#f59e0b' },
  { id: 'gold', name: 'সোনালী', primary: '#b45309', dark: '#92400e', mid: '#d97706', light: '#fef3c7', tint: '#fffbeb', accent: '#059669' },
  { id: 'midnight', name: 'রাত', primary: '#4338ca', dark: '#3730a3', mid: '#6366f1', light: '#e0e7ff', tint: '#eef2ff', accent: '#fbbf24' },
  { id: 'slate', name: 'ধূসর মিনিমাল', primary: '#334155', dark: '#1e293b', mid: '#475569', light: '#e2e8f0', tint: '#f8fafc', accent: '#f59e0b' },
  { id: 'blossom', name: 'পিংক ফুল', primary: '#db2777', dark: '#be185d', mid: '#ec4899', light: '#fce7f3', tint: '#fdf2f8', accent: '#059669' },
];

export const findTheme = (id) => THEMES.find((t) => t.id === id) || THEMES[0];

/**
 * Builds a CSS rule set that overrides Tailwind emerald-* classes to use the
 * provided theme's palette. Injected as a <style> tag so it wins over class-based
 * rules without touching every component.
 */
export const buildThemeCss = (theme) => `
:root {
  --brand: ${theme.primary};
  --brand-dark: ${theme.dark};
  --brand-mid: ${theme.mid};
  --brand-light: ${theme.light};
  --brand-tint: ${theme.tint};
  --brand-accent: ${theme.accent};
}
.bg-emerald-700 { background-color: ${theme.primary} !important; }
.bg-emerald-800 { background-color: ${theme.dark} !important; }
.bg-emerald-600 { background-color: ${theme.mid} !important; }
.bg-emerald-500 { background-color: ${theme.mid} !important; }
.bg-emerald-400 { background-color: ${theme.mid} !important; opacity: 0.85; }
.bg-emerald-100 { background-color: ${theme.light} !important; }
.bg-emerald-50 { background-color: ${theme.tint} !important; }
.bg-emerald-50\\/40 { background-color: ${theme.tint}66 !important; }
.bg-emerald-50\\/50 { background-color: ${theme.tint}80 !important; }
.text-emerald-900 { color: ${theme.dark} !important; }
.text-emerald-800 { color: ${theme.dark} !important; }
.text-emerald-700 { color: ${theme.primary} !important; }
.text-emerald-600 { color: ${theme.mid} !important; }
.text-emerald-500 { color: ${theme.mid} !important; }
.text-emerald-400 { color: ${theme.mid} !important; }
.border-emerald-700 { border-color: ${theme.primary} !important; }
.border-emerald-600 { border-color: ${theme.mid} !important; }
.border-emerald-500 { border-color: ${theme.mid} !important; }
.border-emerald-400 { border-color: ${theme.mid} !important; }
.border-emerald-300 { border-color: ${theme.light} !important; }
.border-emerald-200 { border-color: ${theme.light} !important; }
.border-emerald-100 { border-color: ${theme.tint} !important; }
.ring-emerald-100 { --tw-ring-color: ${theme.tint} !important; }
.hover\\:bg-emerald-800:hover { background-color: ${theme.dark} !important; }
.hover\\:bg-emerald-700:hover { background-color: ${theme.primary} !important; }
.hover\\:bg-emerald-600:hover { background-color: ${theme.mid} !important; }
.hover\\:bg-emerald-500:hover { background-color: ${theme.mid} !important; }
.hover\\:bg-emerald-100:hover { background-color: ${theme.light} !important; }
.hover\\:bg-emerald-50:hover { background-color: ${theme.tint} !important; }
.hover\\:text-emerald-800:hover { color: ${theme.dark} !important; }
.hover\\:text-emerald-700:hover { color: ${theme.primary} !important; }
.hover\\:border-emerald-400:hover { border-color: ${theme.mid} !important; }
.hover\\:border-emerald-300:hover { border-color: ${theme.light} !important; }
.focus\\:border-emerald-500:focus { border-color: ${theme.mid} !important; }
.accent-emerald-600 { accent-color: ${theme.mid} !important; }
.from-emerald-700 { --tw-gradient-from: ${theme.primary} !important; --tw-gradient-to: ${theme.primary}00 !important; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to) !important; }
.to-emerald-500 { --tw-gradient-to: ${theme.mid} !important; }
.from-emerald-500 { --tw-gradient-from: ${theme.mid} !important; --tw-gradient-to: ${theme.mid}00 !important; }
.from-emerald-50 { --tw-gradient-from: ${theme.tint} !important; --tw-gradient-to: ${theme.tint}00 !important; }
.to-emerald-50 { --tw-gradient-to: ${theme.tint} !important; }
.via-emerald-50 { --tw-gradient-via: ${theme.tint} !important; }
meta[name="theme-color"] { content: "${theme.primary}"; }
`.trim();
