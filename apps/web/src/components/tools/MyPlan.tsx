'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { formatMoney, toCsv } from '@finealth/finance-core';
import { clearAll, download, exportBackup, importBackup, isSnapshotList, KEYS, load, save, type Snapshot } from '@/lib/storage';
import { LineChart, Panel, ProGate, Stat } from '../ui';

const day = (iso: string) => iso.slice(0, 10);

export function MyPlan() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const file = useRef<HTMLInputElement>(null);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- read browser-only storage after mount so server HTML and the first client render match
  useEffect(() => setSnapshots(load(KEYS.snapshots, [], isSnapshotList)), []);

  const latest = snapshots.at(-1);
  const first = snapshots[0];

  const exportCsv = () =>
    download(
      'finealth-progress.csv',
      toCsv(
        ['Date', 'Score', 'Net worth', 'Currency', 'Savings', 'Emergency', 'Debt payments', 'Costly debt', 'Retirement', 'Protection'],
        snapshots.map((s) => [day(s.at), s.score, s.netWorth, s.currency, s.pillars.savings, s.pillars.emergency, s.pillars.debtLoad, s.pillars.costlyDebt, s.pillars.retirement, s.pillars.protection]),
      ),
      'text/csv',
    );

  return (
    <div className="grid gap-6">
      <div className="border-b border-white/[0.08] pb-6">
        <span className="eyebrow block mb-2">Saved on this device only</span>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white">My Plan</h1>
        <p className="text-zinc-400 mt-2 max-w-2xl">Your health-check snapshots over time, and a backup of everything you entered. Nothing here is uploaded.</p>
      </div>

      <ProGate feature="Progress tracking" detail="Save a health-check snapshot each month and watch your score and net worth move. Export it to CSV any time." testId="myplan-pro-gate">
        <Panel title="Progress" testId="myplan-progress">
          {snapshots.length === 0 ? (
            <p className="m-0 text-zinc-300">
              No snapshots yet. Run the <Link href="/health-check/" className="link">Health Check</Link> and press <em>Save snapshot</em>.
            </p>
          ) : (
            <div className="grid gap-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <Stat label="Latest score" value={String(latest!.score)} tone="ok" testId="myplan-latest" />
                <Stat label="Change since first" value={`${latest!.score - first.score >= 0 ? '+' : ''}${latest!.score - first.score} pts`} />
                <Stat label="Net worth" value={formatMoney(latest!.netWorth, latest!.currency)} />
              </div>
              {snapshots.length > 1 && (
                <LineChart ariaLabel="Health score over time" series={[{ name: 'Score', colour: '#34d399', points: snapshots.map((s) => s.score) }]} xLabel={(i) => day(snapshots[i]?.at ?? '')} yLabel={(v) => `${v}`} />
              )}
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn btn-secondary" onClick={exportCsv} data-testid="export-progress-csv">
                  Export CSV
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    if (window.confirm('Delete all saved snapshots from this device?')) {
                      save(KEYS.snapshots, []);
                      setSnapshots([]);
                    }
                  }}
                >
                  Delete snapshots
                </button>
              </div>
            </div>
          )}
        </Panel>
      </ProGate>

      <Panel title="Backup and restore">
        <p className="mt-0 text-zinc-300">Your plans live in this browser. Download a backup file to keep them safe or move them to another device.</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary" onClick={() => download(`finealth-backup-${day(new Date().toISOString())}.json`, JSON.stringify(exportBackup(), null, 2), 'application/json')} data-testid="backup-download">
            Download backup
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => file.current?.click()}>
            Restore from file
          </button>
          <input
            ref={file}
            type="file"
            accept="application/json,.json"
            className="hidden"
            aria-label="Backup file"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              if (f.size > 2_000_000) return setMessage({ ok: false, text: 'That file is too large to be a Finealth backup.' });
              const r = importBackup(await f.text());
              setMessage(r.ok ? { ok: true, text: `Restored: ${r.restored.join(', ')}. Open any tool to see your numbers.` } : { ok: false, text: r.message });
              setSnapshots(load(KEYS.snapshots, [], isSnapshotList));
              e.target.value = '';
            }}
          />
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => {
              if (window.confirm('Delete every number Finealth saved in this browser? Your Pro licence stays.')) {
                clearAll();
                setSnapshots([]);
                setMessage({ ok: true, text: 'Everything Finealth saved in this browser is deleted.' });
              }
            }}
          >
            Delete my data
          </button>
        </div>
        {message && (
          <p className={`notice mt-4 mb-0 ${message.ok ? 'notice-ok' : 'notice-danger'}`} role="status">
            {message.text}
          </p>
        )}
      </Panel>
    </div>
  );
}
