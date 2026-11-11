/**
 * Warm Editorial palette, taken from the website (apps/web/src/app/globals.css) so the app and the site look like one
 * product (RSK-011). Light and dark follow the phone's setting.
 */
export interface Palette {
  bg: string;
  surface: string;
  card: string;
  fg: string;
  muted: string;
  line: string;
  lineHi: string;
  accent: string;
  onAccent: string;
  ok: string;
  warn: string;
  bad: string;
  okBg: string;
  warnBg: string;
  badBg: string;
}

export const light: Palette = {
  bg: '#f5f1ea',
  surface: '#fbf8f3',
  card: '#fdfbf7',
  fg: '#1c1915',
  muted: '#5c544a',
  line: 'rgba(28,25,21,0.10)',
  lineHi: 'rgba(28,25,21,0.18)',
  accent: '#a84b2a',
  onAccent: '#ffffff',
  ok: '#2f6b3a',
  warn: '#8a5a00',
  bad: '#a3261b',
  okBg: 'rgba(47,107,58,0.10)',
  warnBg: 'rgba(196,140,20,0.14)',
  badBg: 'rgba(163,38,27,0.10)',
};

export const dark: Palette = {
  bg: '#14110e',
  surface: '#1f1a16',
  card: '#241e19',
  fg: '#f3ede4',
  muted: '#b9ae9f',
  line: 'rgba(243,237,228,0.10)',
  lineHi: 'rgba(243,237,228,0.18)',
  accent: '#e2805a',
  onAccent: '#14110e',
  ok: '#8fcf98',
  warn: '#f0c46a',
  bad: '#f19a8f',
  okBg: 'rgba(143,207,152,0.12)',
  warnBg: 'rgba(240,196,106,0.12)',
  badBg: 'rgba(241,154,143,0.12)',
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;
export const radius = { sm: 10, md: 14, lg: 20 } as const;
/** Android minimum touch target (Material) and WCAG 2.2 target size. */
export const TOUCH = 48;
