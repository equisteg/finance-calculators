import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      // Warm Editorial palette (v10): every colour is a CSS variable, so one class works in both the light "Paper"
      // and dark "Espresso" modes (values in globals.css). white = ink, zinc = warm greys, emerald = sage (gain),
      // red/rose = clay (loss), amber = ochre (Pro), brand = terracotta (act).
      colors: {
        white: 'rgb(var(--c-ink) / <alpha-value>)',
        ground: 'rgb(var(--c-bg) / <alpha-value>)',
        zinc: { 50: 'rgb(var(--c-zinc-50) / <alpha-value>)', 100: 'rgb(var(--c-zinc-100) / <alpha-value>)', 200: 'rgb(var(--c-zinc-200) / <alpha-value>)', 300: 'rgb(var(--c-zinc-300) / <alpha-value>)', 400: 'rgb(var(--c-zinc-400) / <alpha-value>)', 500: 'rgb(var(--c-zinc-500) / <alpha-value>)', 600: 'rgb(var(--c-zinc-600) / <alpha-value>)', 700: 'rgb(var(--c-zinc-700) / <alpha-value>)', 800: 'rgb(var(--c-zinc-800) / <alpha-value>)', 900: 'rgb(var(--c-zinc-900) / <alpha-value>)', 950: 'rgb(var(--c-zinc-950) / <alpha-value>)' },
        emerald: { 50: 'rgb(var(--c-emerald-50) / <alpha-value>)', 100: 'rgb(var(--c-emerald-100) / <alpha-value>)', 200: 'rgb(var(--c-emerald-200) / <alpha-value>)', 300: 'rgb(var(--c-emerald-300) / <alpha-value>)', 400: 'rgb(var(--c-emerald-400) / <alpha-value>)', 500: 'rgb(var(--c-emerald-500) / <alpha-value>)', 600: 'rgb(var(--c-emerald-600) / <alpha-value>)', 700: 'rgb(var(--c-emerald-700) / <alpha-value>)', 800: 'rgb(var(--c-emerald-800) / <alpha-value>)', 900: 'rgb(var(--c-emerald-900) / <alpha-value>)', 950: 'rgb(var(--c-emerald-950) / <alpha-value>)' },
        red: { 50: 'rgb(var(--c-red-50) / <alpha-value>)', 100: 'rgb(var(--c-red-100) / <alpha-value>)', 200: 'rgb(var(--c-red-200) / <alpha-value>)', 300: 'rgb(var(--c-red-300) / <alpha-value>)', 400: 'rgb(var(--c-red-400) / <alpha-value>)', 500: 'rgb(var(--c-red-500) / <alpha-value>)', 600: 'rgb(var(--c-red-600) / <alpha-value>)', 700: 'rgb(var(--c-red-700) / <alpha-value>)', 800: 'rgb(var(--c-red-800) / <alpha-value>)', 900: 'rgb(var(--c-red-900) / <alpha-value>)', 950: 'rgb(var(--c-red-950) / <alpha-value>)' },
        rose: { 50: 'rgb(var(--c-red-50) / <alpha-value>)', 100: 'rgb(var(--c-red-100) / <alpha-value>)', 200: 'rgb(var(--c-red-200) / <alpha-value>)', 300: 'rgb(var(--c-red-300) / <alpha-value>)', 400: 'rgb(var(--c-red-400) / <alpha-value>)', 500: 'rgb(var(--c-red-500) / <alpha-value>)', 600: 'rgb(var(--c-red-600) / <alpha-value>)', 700: 'rgb(var(--c-red-700) / <alpha-value>)', 800: 'rgb(var(--c-red-800) / <alpha-value>)', 900: 'rgb(var(--c-red-900) / <alpha-value>)', 950: 'rgb(var(--c-red-950) / <alpha-value>)' },
        amber: { 50: 'rgb(var(--c-amber-50) / <alpha-value>)', 100: 'rgb(var(--c-amber-100) / <alpha-value>)', 200: 'rgb(var(--c-amber-200) / <alpha-value>)', 300: 'rgb(var(--c-amber-300) / <alpha-value>)', 400: 'rgb(var(--c-amber-400) / <alpha-value>)', 500: 'rgb(var(--c-amber-500) / <alpha-value>)', 600: 'rgb(var(--c-amber-600) / <alpha-value>)', 700: 'rgb(var(--c-amber-700) / <alpha-value>)', 800: 'rgb(var(--c-amber-800) / <alpha-value>)', 900: 'rgb(var(--c-amber-900) / <alpha-value>)', 950: 'rgb(var(--c-amber-950) / <alpha-value>)' },
        brand: { 50: 'rgb(var(--c-brand-50) / <alpha-value>)', 100: 'rgb(var(--c-brand-100) / <alpha-value>)', 200: 'rgb(var(--c-brand-200) / <alpha-value>)', 300: 'rgb(var(--c-brand-300) / <alpha-value>)', 400: 'rgb(var(--c-brand-400) / <alpha-value>)', 500: 'rgb(var(--c-brand-500) / <alpha-value>)', 600: 'rgb(var(--c-brand-600) / <alpha-value>)', 700: 'rgb(var(--c-brand-700) / <alpha-value>)', 800: 'rgb(var(--c-brand-800) / <alpha-value>)', 900: 'rgb(var(--c-brand-900) / <alpha-value>)', 950: 'rgb(var(--c-brand-950) / <alpha-value>)' },
      },
      fontFamily: {
        serif: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;