'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { PLAN_PRICES, PRO_FEATURES } from '@finealth/finance-core';
import type { CheckoutResult } from '@/lib/checkout';
import { config } from '@/lib/config';
import type { WebPlan } from '@/lib/pro';
import { useCurrency } from '@/app/context/CurrencyContext';
import { usePro } from './ProProvider';
import { useFitRows } from './ui';

const FREE_FEATURES = [
  'Financial Health Check: score, grade and your top priority',
  'Debt payoff planner for up to 3 debts (snowball vs avalanche)',
  'Goal planner for one goal, inflation-adjusted',
  'Retirement projection and loan prepayment optimiser',
  '55+ calculators: tax for 7 countries, VAT/GST for 60+, SIP, EMI, NPV/IRR, XIRR and more',
  'JSON backup and restore; nothing leaves your device',
];

const TESTID: Record<WebPlan, string> = { pro_yearly: 'buy-yearly', pro_lifetime: 'buy-lifetime' };

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-secondary btn-sm"
      data-testid="copy-key"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
        } catch {
          /* clipboard blocked: the ID is selectable on screen */
        }
      }}
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

/** What happened after the buyer closed or completed Razorpay Checkout. */
function CheckoutOutcome({ result }: { result: CheckoutResult }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => ref.current?.focus(), []);
  if (result.kind === 'success') {
    return (
      <div ref={ref} tabIndex={-1} className="notice notice-ok mb-6 grid gap-3" role="status" data-testid="checkout-success">
        <p className="m-0 font-semibold">Pro is active. Ads are gone and every Pro feature is unlocked in this browser.</p>
        <p className="m-0">
          Your licence key:{' '}
          <code className="font-mono break-all select-all" data-testid="licence-key-display">
            {result.key}
          </code>{' '}
          <CopyButton text={result.key} />
        </p>
        <p className="m-0 text-[0.95rem]">
          Keep it: it is also the {result.key.startsWith('sub_') ? 'subscription' : 'payment'} ID in your Razorpay receipt email. Paste it on <Link href="/pro/">Restore Pro</Link> to use Pro in another browser.
        </p>
      </div>
    );
  }
  if (result.kind === 'recover') {
    return (
      <div ref={ref} tabIndex={-1} className="notice notice-warn mb-6 grid gap-3" role="alert" data-testid="checkout-recover">
        <p className="m-0 font-semibold">{result.message}</p>
        {result.id && (
          <p className="m-0">
            Your ID:{' '}
            <code className="font-mono break-all select-all" data-testid="licence-key-display">
              {result.id}
            </code>{' '}
            <CopyButton text={result.id} />
          </p>
        )}
        <p className="m-0 text-[0.95rem]">
          It is also in your Razorpay receipt email. <Link href="/pro/">Open Restore Pro</Link> · Stuck? Email <a href={`mailto:${config.contactEmail}`}>{config.contactEmail}</a> with this ID.
        </p>
      </div>
    );
  }
  if (result.kind === 'error') {
    return (
      <div ref={ref} tabIndex={-1} className="notice notice-danger mb-6" role="alert" data-testid="checkout-error">
        {result.message}
      </div>
    );
  }
  return null;
}

export function PriceCards() {
  const { isPro, status, buy } = usePro();
  const { baseCurrency } = useCurrency();
  const [inr, setInr] = useState(false);
  const [busy, setBusy] = useState<WebPlan | null>(null);
  const [result, setResult] = useState<CheckoutResult | null>(null);
  const [agreed, setAgreed] = useState(false);
  const fitRef = useFitRows();
  useEffect(() => {
    // ₹ when the site currency is INR or the browser locale is Indian (en-IN, hi-IN …); US$ everywhere else.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- navigator.language exists only in the browser
    setInr(baseCurrency === 'INR' || /-IN$/i.test(navigator.language));
  }, [baseCurrency]);
  const yearly = PLAN_PRICES.find((p) => p.plan === 'pro_yearly')!;
  const lifetime = PLAN_PRICES.find((p) => p.plan === 'pro_lifetime')!;
  const monthly = PLAN_PRICES.find((p) => p.plan === 'pro_monthly')!;
  const price = (p: typeof yearly) => (inr ? p.inr : p.intl);
  const enabled = config.razorpayEnabled && !!config.licencePublicKey;

  const onBuy = async (plan: WebPlan) => {
    setBusy(plan);
    setResult(null);
    const r = await buy(plan, inr ? 'INR' : 'USD');
    setBusy(null);
    setResult(r.kind === 'dismissed' ? null : r);
  };

  const buyButton = (plan: WebPlan, label: string, primary: boolean) => {
    if (isPro) return <span className="btn btn-secondary w-full" aria-disabled="true">Pro is active</span>;
    if (!enabled) {
      return (
        <button type="button" className="btn btn-secondary w-full" disabled data-testid={TESTID[plan]}>
          Coming soon
        </button>
      );
    }
    return (
      <button
        type="button"
        className={`btn w-full ${primary ? 'btn-primary' : 'btn-secondary'}`}
        disabled={busy !== null || !agreed}
        title={agreed ? undefined : 'Tick the box above the plans first'}
        aria-busy={busy === plan} onClick={() => onBuy(plan)} data-testid={TESTID[plan]}>
        {busy === plan ? 'Opening secure checkout…' : label}
      </button>
    );
  };

  return (
    <div ref={fitRef}>
      {result && <CheckoutOutcome key={JSON.stringify(result)} result={result} />}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <p className="m-0 text-sub">
          Prices in {inr ? 'Indian rupees, including GST' : 'US dollars'}. Payment is processed securely by Razorpay; the final amount is shown at checkout.
        </p>
        <div className="flex items-center gap-1" role="group" aria-label="Pay in" data-testid="currency-toggle">
          <span className="text-sub text-sm mr-1">Pay in</span>
          <button type="button" className={`btn btn-sm ${inr ? 'btn-primary' : 'btn-ghost'}`} aria-pressed={inr} onClick={() => setInr(true)} disabled={busy !== null}>
            ₹ INR
          </button>
          <button type="button" className={`btn btn-sm ${!inr ? 'btn-primary' : 'btn-ghost'}`} aria-pressed={!inr} onClick={() => setInr(false)} disabled={busy !== null}>
            US$ USD
          </button>
        </div>
      </div>
      {!isPro && (
        <label className="notice notice-warn mb-4 flex items-start gap-3 text-[0.95rem] cursor-pointer" data-testid="pay-ack">
          <input type="checkbox" className="mt-1 shrink-0" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} data-testid="pay-ack-box" />
          <span>
            I understand that Finealth and Finealth Pro give <strong>estimates for information only</strong>, not financial, investment, tax or legal
            advice; that results can contain errors and tax rates can change; and that I will check important decisions with the official source or a
            qualified professional. I agree to the <Link href="/terms/">Terms</Link> and the <Link href="/refund/">Refund &amp; cancellation policy</Link>.
          </span>
        </label>
      )}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card p-6 flex flex-col">
          <h2 className="text-xl font-bold">Free</h2>
          <p className="mt-2 font-display text-4xl font-bold">{inr ? '₹0' : '$0'}</p>
          <p className="text-sub">forever, no signup</p>
          <ul className="mt-5 grid content-start gap-2 text-[0.95rem] flex-1">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex gap-2">
                <span className="text-ok font-bold shrink-0" aria-hidden="true">✓</span>
                {f}
              </li>
            ))}
          </ul>
          <Link href="/health-check/" className="btn btn-secondary mt-6 w-full">
            Start your health check
          </Link>
        </div>

        <div className="card p-6 flex flex-col border-2 !border-emerald-400 relative">
          <span className="pill pill-pro absolute -top-3 left-6">Most popular</span>
          <h2 className="text-xl font-bold">Pro · {yearly.label}</h2>
          <p className="mt-2 font-display text-4xl font-bold" data-testid="price-yearly">
            {price(yearly)}
          </p>
          <p className="text-sub">{inr ? yearly.note : 'per year'}</p>
          <ul className="mt-5 grid content-start gap-2 text-[0.95rem] flex-1">
            <li className="flex gap-2 font-semibold">
              <span className="text-ok shrink-0" aria-hidden="true">✓</span>Everything in Free, plus:
            </li>
            {PRO_FEATURES.map((f) => (
              <li key={f.id} className="flex gap-2">
                <span className="text-ok font-bold shrink-0" aria-hidden="true">✓</span>
                <span>
                  <strong>{f.title}.</strong> <span className="text-sub">{f.detail}</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-6">{buyButton('pro_yearly', `Buy yearly · ${price(yearly)}`, true)}</div>
        </div>

        <div className="card p-6 flex flex-col">
          <h2 className="text-xl font-bold">Pro · {lifetime.label}</h2>
          <p className="mt-2 font-display text-4xl font-bold" data-testid="price-lifetime">
            {price(lifetime)}
          </p>
          <p className="text-sub">{lifetime.note}</p>
          <ul className="mt-5 grid content-start gap-2 text-[0.95rem] flex-1">
            {[
              'Every Pro feature listed under Yearly',
              'One payment: no renewal to remember',
              'Costs the same as about 2½ years of Yearly',
              'Use your licence key on up to 5 browsers',
              'No ads anywhere, in any browser you activate',
            ].map((f) => (
              <li key={f} className="flex gap-2">
                <span className="text-ok font-bold shrink-0" aria-hidden="true">✓</span>
                {f}
              </li>
            ))}
          </ul>
          <div className="mt-6">{buyButton('pro_lifetime', `Buy lifetime · ${price(lifetime)}`, false)}</div>
        </div>
      </div>
      <section className="card p-5 sm:p-6 mt-6" aria-label="How our price compares" data-testid="price-compare">
        <h2 className="text-lg font-bold">How our price compares</h2>
        <p className="text-sub text-sm mt-1">Typical published prices for money apps, checked 9 November 2026.</p>
        <div className="fitgrid grid gap-3 mt-4">
          {(inr
            ? [
                ['Indian money-tracker apps', '₹149 a month', 'about ₹1,800 a year'],
                ['Indian investing-app premium', '₹499 a year', 'single feature set'],
                ['Lifetime plans in India', '₹4,999 and up', 'one payment'],
                ['Finealth Pro', `${price(yearly)} a year`, `or ${price(lifetime)} for life`],
              ]
            : [
                ['Leading budgeting apps', 'US$95-110 a year', 'billed yearly'],
                ['Monthly budgeting plans', 'US$6.99-14.99 a month', 'billed monthly'],
                ['Finealth Pro', `${price(yearly)} a year`, `or ${price(lifetime)} for life`],
              ]
          ).map(([what, amount, note], i, all) => (
            <div key={what} className="stat">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400">{what}</span>
              <span className={`block mt-1 text-lg font-bold tabular-nums ${i === all.length - 1 ? 'text-emerald-300' : 'text-white'}`}>{amount}</span>
              <span className="block text-xs text-zinc-500">{note}</span>
            </div>
          ))}
        </div>
      </section>
      <p className="mt-4 text-sm text-sub">
        {monthly.label} ({price(monthly)} {monthly.note}) is available in the Android app only{config.playUrl ? <> — <a href={config.playUrl}>get it on Google Play</a></> : ''}. Already bought? <Link href="/pro/">Restore Pro with your payment or subscription ID</Link>.
        {status.state === 'pro' ? ' Pro is active in this browser.' : ''}
      </p>
    </div>
  );
}
