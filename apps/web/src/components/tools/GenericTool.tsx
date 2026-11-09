'use client';

import Link from 'next/link';
import { useId, useMemo, useState } from 'react';
import { formatMoney, formatNumber } from '@finealth/finance-core';
import { CHECKED_LABEL, TOOL_BY_SLUG, type Fmt, type Values } from '@/lib/toolCatalog';
import { NumberField, Panel, Stat, ToolPage, useMoney } from '../ui';
import { toolIcon } from '../GlassIcon';

function SelectField(props: { label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (v: string) => void; testId?: string }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="label">
        {props.label}
      </label>
      <select id={id} className="input" value={props.value} onChange={(e) => props.onChange(e.target.value)} data-testid={props.testId}>
        {props.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/** One calculator page from the tools library, driven entirely by its catalog entry. */
export function GenericTool({ slug }: { slug: string }) {
  const { currency } = useMoney();
  // Re-start from the right defaults when the site currency changes.
  return <ToolBody key={TOOL_BY_SLUG[slug].currency ?? currency} slug={slug} />;
}

function ToolBody({ slug }: { slug: string }) {
  const def = TOOL_BY_SLUG[slug];
  const { currency: siteCurrency } = useMoney();
  const currency = def.currency ?? siteCurrency;
  const isInr = !def.currency && siteCurrency === 'INR';

  const [values, setValues] = useState<Values>(() =>
    Object.fromEntries(def.fields.map((f) => [f.key, isInr && f.inr !== undefined ? f.inr : f.def]))
  );
  const set = (k: string, v: number | string | boolean) => setValues((old) => ({ ...old, [k]: v }));

  const fmt: Fmt = useMemo(
    () => ({
      money: (x, digits = 0) => formatMoney(x, currency, digits),
      pct: (x) => (x === null || !Number.isFinite(x) ? '—' : `${formatNumber(x, currency, 2)}%`),
      num: (x) => formatNumber(x, currency, 2),
    }),
    [currency]
  );

  let result: ReturnType<typeof def.compute>;
  try {
    result = def.compute(values, fmt);
  } catch {
    result = { rows: [{ label: 'Result', value: 'Check the inputs' }] };
  }

  return (
    <ToolPage eyebrow={`${def.region} · ${def.category}`} title={def.title} intro={def.summary} icon={toolIcon(def.slug, def.category)}>
      <div className="grid gap-6 md:grid-cols-12 items-start">
        <Panel title="Your numbers" className="md:col-span-5">
          <div className="grid gap-4 grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
            {def.fields.map((f) => {
              const testId = `in-${f.key}`;
              if (f.kind === 'select')
                return (
                  <div key={f.key} className="col-span-2 md:col-span-1 lg:col-span-2">
                    <SelectField label={f.label} value={String(values[f.key])} options={f.options ?? []} onChange={(v) => set(f.key, v)} testId={testId} />
                  </div>
                );
              if (f.kind === 'toggle')
                return (
                  <label key={f.key} className="col-span-2 md:col-span-1 lg:col-span-2 flex items-start gap-3 text-sm text-zinc-200">
                    <input type="checkbox" className="check mt-0.5" checked={values[f.key] === true} onChange={(e) => set(f.key, e.target.checked)} data-testid={testId} />
                    <span>
                      {f.label}
                      {f.hint && <span className="hint block">{f.hint}</span>}
                    </span>
                  </label>
                );
              if (f.kind === 'text')
                return (
                  <div key={f.key} className="col-span-2 md:col-span-1 lg:col-span-2">
                    <label className="label" htmlFor={`${slug}-${f.key}`}>
                      {f.label}
                    </label>
                    <textarea
                      id={`${slug}-${f.key}`}
                      rows={4}
                      className="input font-mono"
                      value={String(values[f.key])}
                      onChange={(e) => set(f.key, e.target.value)}
                      data-testid={testId}
                    />
                    {f.hint && <p className="hint">{f.hint}</p>}
                  </div>
                );
              return (
                <NumberField
                  key={f.key}
                  label={f.label}
                  value={Number(values[f.key])}
                  onChange={(x) => set(f.key, f.max !== undefined ? Math.min(f.max, x) : x)}
                  suffix={f.suffix}
                  hint={f.hint}
                  max={f.max}
                  step={f.step}
                  testId={testId}
                />
              );
            })}
          </div>
        </Panel>

        <div className="md:col-span-7 grid gap-4 content-start">
          <Panel title="Result" testId="tool-result">
            <div className="grid gap-3 grid-cols-2">
              {result.rows.map((r, i) => (
                <Stat key={r.label} label={r.label} value={r.value} tone={r.tone} sub={r.sub} testId={i === 0 ? 'tool-primary' : undefined} />
              ))}
            </div>
            {result.note && <p className="mt-4 text-sm text-amber-200" data-testid="tool-note">{result.note}</p>}
          </Panel>
          <div className="card p-5 text-sm text-zinc-300 leading-relaxed" data-testid="tool-source">
            <p className="m-0">
              <strong className="text-white">How it is worked out.</strong> {def.source}
            </p>
            {def.statutory && (
              <p className="mt-2 mb-0">
                <strong className="text-white">Rates last checked:</strong> {CHECKED_LABEL}. Governments change rates in budgets; always confirm with the official source
                {def.official ? (
                  <>
                    {' '}
                    (
                    <a className="link" href={def.official.url} target="_blank" rel="noopener noreferrer">
                      {def.official.label}
                    </a>
                    )
                  </>
                ) : null}
                .
              </p>
            )}
            {def.limits && (
              <p className="mt-2 mb-0">
                <strong className="text-white">Not covered:</strong> {def.limits}
              </p>
            )}
            <p className="mt-2 mb-0">
              Found a mistake? <Link className="link" href="/contact/">Tell us</Link> and we will check and fix it.
            </p>
          </div>
        </div>
      </div>
    </ToolPage>
  );
}
