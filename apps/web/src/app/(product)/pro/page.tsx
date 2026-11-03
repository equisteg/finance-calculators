import type { Metadata } from 'next';
import { ActivatePro } from '@/components/ActivatePro';

export const metadata: Metadata = {
  title: 'Restore Pro',
  description: 'Use Finealth Pro in this browser with the payment or subscription ID from your receipt.',
  robots: { index: false },
};

export default function Page() {
  return (
    <div className="max-w-2xl grid gap-6">
      <div>
        <span className="eyebrow block mb-2">No account needed</span>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white">Finealth Pro</h1>
      </div>
      <ActivatePro />
    </div>
  );
}
