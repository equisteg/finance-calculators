import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import { ProNotice } from '@/components/ProProvider';

export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#050508] text-zinc-100 selection:bg-emerald-500/30">
      <SiteHeader />
      <ProNotice />
      <main className="wrap py-8 sm:py-12">{children}</main>
      <SiteFooter />
    </div>
  );
}
