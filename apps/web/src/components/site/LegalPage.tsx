import type { ReactNode } from 'react';

export const LEGAL_UPDATED = '9 November 2026';

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="max-w-3xl prose-legal">
      <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white">{title}</h1>
      <p className="text-sm text-zinc-500">Last updated {LEGAL_UPDATED}</p>
      {children}
    </article>
  );
}
