import type { HealthReport } from '@finealth/finance-core';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

/** Printable full health report (Pro). Built on the phone and handed to Android's print / save-as-PDF dialog only. */
export function reportHtml(r: HealthReport, money: (n: number) => string, date = new Date()): string {
  const pillars = r.pillars
    .map((p) => `<tr><td>${esc(p.title)}</td><td>${p.score}/100</td><td>${esc(p.measure)}</td><td>${esc(p.target)}</td></tr>`)
    .join('');
  const actions = r.actions.map((a) => `<li><b>${esc(a.title)}</b> (+${a.pointsAvailable} pts)<br/>${esc(a.detail)}</li>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"/><style>
body{font-family:sans-serif;color:#1c1915;padding:24px}h1{color:#a84b2a}table{border-collapse:collapse;width:100%}
td,th{border:1px solid #ddd;padding:6px;text-align:left;font-size:12px}.note{font-size:11px;color:#5c544a;margin-top:24px}
</style></head><body>
<h1>Finealth health report</h1><p>${esc(date.toISOString().slice(0, 10))} · Score <b>${r.score}/100</b> (${esc(r.grade)})</p>
<p>Monthly surplus: ${esc(money(r.metrics.monthlySurplus))}</p>
<h2>Six pillars</h2><table><tr><th>Pillar</th><th>Score</th><th>You</th><th>Rule of thumb</th></tr>${pillars}</table>
<h2>Actions, biggest gain first</h2><ol>${actions || '<li>Every rule of thumb is met.</li>'}</ol>
<p class="note">Information only. These are estimates from the numbers you entered and common rules of thumb. They are not financial, tax,
investment or legal advice, may contain errors, and rules change. Check important decisions with a qualified professional.
Finealth, a product by Equisteg.</p></body></html>`;
}
