"use client";

import React from "react";
import Link from "next/link";
import { useCurrency } from "@/app/context/CurrencyContext";
import AdSenseBanner from "./AdSenseBanner";
import { ADSENSE_CLIENT, AD_SLOTS } from "@/lib/ads";

export type CalculatorCurrency = "INR" | "USD" | "EUR" | "GBP";

const CURRENCY_OPTIONS: { code: CalculatorCurrency; label: string }[] = [
  { code: "INR", label: "INR (₹)" },
  { code: "USD", label: "USD ($)" },
  { code: "EUR", label: "EUR (€)" },
  { code: "GBP", label: "GBP (£)" },
];

/** The site-wide currency, narrowed to one the calculators support. */
export function useCalculatorCurrency(): CalculatorCurrency {
  const { baseCurrency } = useCurrency();
  return CURRENCY_OPTIONS.some((o) => o.code === baseCurrency)
    ? (baseCurrency as CalculatorCurrency)
    : "INR";
}

/**
 * Shared frame for the standalone calculator routes: back link, heading,
 * currency switch (bound to the same jurisdiction as the dashboard) and an ad
 * slot, on the site's dark theme.
 */
export default function CalculatorShell(props: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const { setBaseCurrency } = useCurrency();
  const currency = useCalculatorCurrency();

  return (
    <div className="min-h-screen bg-[#050508] text-zinc-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <Link href="/" className="text-xs font-mono text-emerald-400 hover:underline mb-6 inline-block">
          &larr; Back to Dashboard
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-white/[0.08] pb-8 mb-10 gap-4">
          <div>
            <span className="text-xs font-mono uppercase tracking-[0.2em] text-zinc-500 block mb-2">
              {props.eyebrow}
            </span>
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white">{props.title}</h1>
            <p className="text-sm text-zinc-400 mt-2">{props.subtitle}</p>
          </div>

          <div
            role="group"
            aria-label="Currency"
            className="flex flex-wrap items-center gap-1 bg-white/[0.03] p-1 rounded-lg border border-white/[0.08] self-start sm:self-auto"
          >
            {CURRENCY_OPTIONS.map((option) => (
              <button
                key={option.code}
                onClick={() => setBaseCurrency(option.code)}
                aria-pressed={currency === option.code}
                className={`px-3 py-1 text-xs font-mono rounded-md transition ${
                  currency === option.code
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : "text-zinc-400 hover:text-white border border-transparent"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {props.children}

        <AdSenseBanner client={ADSENSE_CLIENT} slot={AD_SLOTS.calculator} />
      </div>
    </div>
  );
}

export function CalculatorSlider(props: {
  label: string;
  display: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  minLabel?: string;
  maxLabel?: string;
}) {
  return (
    <div>
      <div className="flex justify-between items-baseline mb-3 gap-3">
        <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">{props.label}</span>
        <span className="font-mono text-xl sm:text-2xl font-bold text-white">{props.display}</span>
      </div>
      <input
        type="range"
        aria-label={props.label}
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value))}
        className="w-full accent-emerald-400"
      />
      {(props.minLabel || props.maxLabel) && (
        <div className="flex justify-between text-[11px] font-mono text-zinc-500 mt-2">
          <span>{props.minLabel}</span>
          <span>{props.maxLabel}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Two-part donut: `share` (0..1) of the first part, the remainder is the second.
 * Used for Invested vs Return and Principal vs Interest breakdowns.
 */
export function BreakdownDonut(props: {
  share: number;
  centerLabel: string;
  centerValue: string;
  firstLabel: string;
  secondLabel: string;
}) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const share = Math.min(1, Math.max(0, Number.isFinite(props.share) ? props.share : 0));

  return (
    <figure className="flex flex-col items-center my-6">
      <div className="relative w-40 h-40 flex items-center justify-center">
        <svg
          className="w-full h-full -rotate-90"
          viewBox="0 0 140 140"
          role="img"
          aria-label={`${props.firstLabel} ${Math.round(share * 100)}%, ${props.secondLabel} ${Math.round((1 - share) * 100)}%`}
        >
          {/* second part: the full ring underneath */}
          <circle cx="70" cy="70" r={radius} stroke="#34d399" strokeWidth="14" fill="transparent" />
          {/* first part drawn on top */}
          <circle
            cx="70"
            cy="70"
            r={radius}
            stroke="#52525b"
            strokeWidth="14"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - share * circumference}
            className="transition-all duration-300 ease-out"
          />
        </svg>
        <div className="absolute text-center">
          <span className="text-[10px] font-mono uppercase text-zinc-400 block">{props.centerLabel}</span>
          <span className="text-sm font-semibold text-white">{props.centerValue}</span>
        </div>
      </div>
      <figcaption className="flex gap-4 mt-3 text-[11px] font-mono text-zinc-400">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-zinc-600" /> {props.firstLabel}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400" /> {props.secondLabel}
        </span>
      </figcaption>
    </figure>
  );
}
