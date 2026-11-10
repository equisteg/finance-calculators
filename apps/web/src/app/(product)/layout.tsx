import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import { ProNotice } from '@/components/ProProvider';

export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen text-zinc-100">
      <SiteHeader />
      <ProNotice />
      <main id="main" className="wrap pt-8 pb-4 sm:pt-12 sm:pb-6">{children}</main>
      <SiteFooter />
    </div>
  );
}
