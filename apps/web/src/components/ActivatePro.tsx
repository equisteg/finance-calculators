'use client';

import Link from 'next/link';
import { useState } from 'react';
import { TOKEN_REFRESH_SECONDS } from '@finealth/finance-core';
import { config } from '@/lib/config';
import { KEY_HINT } from '@/lib/pro';
import { usePro } from './ProProvider';

const PLAN_LABEL: Record<string, string> = { pro_yearly: 'Pro Yearly', pro_lifetime: 'Pro Lifetime', pro_monthly: 'Pro Monthly' };

const dateFromSeconds = (s: number) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(s * 1000));

export function ActivatePro() {
  const { status, activate, remove, pendingId } = usePro();
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  if (status.state === 'checking') return <div className="card p-6 min-h-[320px] animate-pulse" aria-busy="true" />;

  if (status.state === 'pro') {
    // The token is re-checked with Razorpay before it expires (≤ 7 days); show when that next happens.
    // eslint-disable-next-line react-hooks/purity -- "next check" date is display-only; re-rendered when the token changes
    const nextCheck = dateFromSeconds(Math.max(status.claims.exp - TOKEN_REFRESH_SECONDS, Math.floor(Date.now() / 1000)));
    return (
      <div className="card p-6 sm:p-8" data-testid="pro-active">
        <p className="pill pill-ok">Active in this browser</p>
        <h2 className="mt-3 text-2xl font-bold">{PLAN_LABEL[status.claims.plan] ?? 'Pro'}</h2>
        {done && <p className="notice notice-ok mt-4" role="status">Pro is now active. Ads are gone and every Pro feature is unlocked.</p>}
        <dl className="mt-4 grid gap-2 text-[0.95rem]">
          <div className="flex flex-wrap gap-2">
            <dt className="text-sub">Licence:</dt>
            <dd className="m-0">Purchased via {status.claims.src === 'play' ? 'Google Play' : 'Razorpay'}</dd>
          </div>
          <div className="flex flex-wrap gap-2">
            <dt className="text-sub">Renews check on:</dt>
            <dd className="m-0" data-testid="pro-renews">
              {nextCheck}
            </dd>
          </div>
        </dl>
        <p className="mt-4 text-sub text-[0.95rem]">
          We re-confirm your purchase with Razorpay in the background about once a week. Only the payment or subscription ID and the last Pro token are sent; nothing about you or your finances.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/health-check/" className="btn btn-primary">
            Open your health check
          </Link>
          <button
            type="button"
            className="btn btn-danger"
            data-testid="remove-pro"
            onClick={() => {
              if (window.confirm('Remove Pro from this browser? You can restore it again with the same payment or subscription ID.')) remove();
            }}
          >
            Remove Pro from this browser
          </button>
        </div>
      </div>
    );
  }

  const unavailable = !config.licencePublicKey;

  return (
    <form
      className="card p-6 sm:p-8 grid gap-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        const r = await activate(key);
        setBusy(false);
        if (r.ok) setDone(true);
        else setError(r.message);
      }}
    >
      <div>
        <label htmlFor="licence-key" className="label">
          Payment ID or subscription ID
        </label>
        <input
          id="licence-key"
          className="input font-mono"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="pay_… or sub_…"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          maxLength={60}
          required
          aria-describedby="licence-hint"
          data-testid="licence-key"
        />
        <p id="licence-hint" className="hint">
          {KEY_HINT} Lifetime purchases have a payment ID; Yearly subscriptions have a subscription ID. It was also shown when you bought.
        </p>
      </div>
      {pendingId && (
        <p className="notice notice-warn m-0" role="status" data-testid="pending-confirm">
          A payment is still being confirmed in this browser (ID <code className="font-mono break-all select-all">{pendingId}</code>). Pro switches on by itself once it is confirmed; you can also paste this ID above.
        </p>
      )}
      {error && (
        <p className="notice notice-danger m-0" role="alert" data-testid="activate-error">
          {error}
        </p>
      )}
      {unavailable && <p className="notice notice-warn m-0">Pro activation is not switched on for this site yet.</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn btn-primary" disabled={busy || unavailable} data-testid="activate-pro">
          {busy ? 'Checking…' : 'Restore Pro'}
        </button>
        <Link href="/pricing/">Not bought yet? See plans</Link>
      </div>
    </form>
  );
}
