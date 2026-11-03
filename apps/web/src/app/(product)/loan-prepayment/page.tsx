import type { Metadata } from 'next';
import { PrepaymentTool } from '@/components/tools/PrepaymentTool';

export const metadata: Metadata = {
  title: 'Loan Prepayment Calculator: reduce EMI or tenure?',
  description: 'Compare reducing your loan tenure with reducing your EMI after a part-payment, and see the interest each option saves.',
  alternates: { canonical: '/loan-prepayment/' },
};

export default function Page() {
  return <PrepaymentTool />;
}
