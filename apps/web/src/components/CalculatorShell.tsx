"use client";

import React from "react";
import { useCurrency } from "@/app/context/CurrencyContext";
import { ToolPage } from "./ui";
import type { GlyphName, Tone } from "./GlassIcon";

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
 * Shared frame for the standalone calculators (SIP, EMI, compound interest):
 * the same glass page header, disclaimer and ad slot as every other tool, with
 * the currency switch as a row of chips.
 */
export default function CalculatorShell(props: {
  eyebrow: string;
  title: string;
  subtitle: string;
  icon?: { name: GlyphName; tone: Tone };
  children: React.ReactNode;
}) {
  const { setBaseCurrency } = useCurrency();
  const currency = useCalculatorCurrency();

  return (
    <ToolPage
      eyebrow={props.eyebrow}
      title={props.title}
      intro={props.subtitle}
      icon={props.icon}
      actions={
        <div role="group" aria-label="Currency" className="flex flex-wrap gap-1.5">
          {CURRENCY_OPTIONS.map((option) => (
            <button key={option.code} type="button" onClick={() => setBaseCurrency(option.code)} aria-pressed={currency === option.code} className="chip !px-3 !py-1 !text-xs">
              {option.label}
            </button>
          ))}
        </div>
      }
    >
      {props.children}
    </ToolPage>
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
      <div className="flex flex-wrap justify-between items-baseline mb-3 gap-x-3 gap-y-1">
        <span className="label !mb-0">{props.label}</span>
        <span className="tabular-nums text-xl sm:text-2xl font-bold text-white shrink-0">{props.display}</span>
      </div>
      <input
        type="range"
        aria-label={props.label}
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value))}
        className="range w-full"
      />
      {(props.minLabel || props.maxLabel) && (
        <div className="flex justify-between gap-3 text-[11px] tabular-nums text-zinc-500 mt-2">
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
          <circle cx="70" cy="70" r={radius} stroke="#6f9a62" strokeWidth="14" fill="transparent" />
          {/* first part drawn on top */}
          <circle
            cx="70"
            cy="70"
            r={radius}
            stroke="#c8653f"
            strokeWidth="14"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - share * circumference}
            className="transition-all duration-300 ease-out"
          />
        </svg>
        <div className="absolute text-center">
          <span className="text-[10px] font-semibold tracking-wider uppercase text-zinc-400 block">{props.centerLabel}</span>
          <span className="text-sm font-semibold text-white">{props.centerValue}</span>
        </div>
      </div>
      <figcaption className="flex flex-wrap justify-center gap-4 mt-3 text-xs text-zinc-400">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#c8653f]" /> {props.firstLabel} <b className="tabular-nums text-white">{Math.round(share * 100)} %</b>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#6f9a62]" /> {props.secondLabel} <b className="tabular-nums text-white">{100 - Math.round(share * 100)} %</b>
        </span>
      </figcaption>
    </figure>
  );
}
