'use client';

import { useEffect } from 'react';
import { useAdsAllowed } from './ProProvider';

interface AdSenseBannerProps {
  client: string;
  slot: string;
  format?: 'auto' | 'fluid' | 'rectangle' | 'horizontal';
  responsive?: 'true' | 'false';
  className?: string;
}

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>;
  }
}

/**
 * A display ad unit, outside the calculation flow and never inside a result (docs/standards/product-categories.md §1).
 * Renders nothing until a real slot id is configured (src/lib/ads.ts), and nothing at all for Pro users.
 * The container reserves its height before the ad loads, so a filled unit does not push content down (CLS).
 */
export default function AdSenseBanner({ client, slot, format = 'auto', responsive = 'true', className = '' }: AdSenseBannerProps) {
  const allowed = useAdsAllowed();
  useEffect(() => {
    if (!slot || !allowed) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      console.error('AdSense push error:', err);
    }
  }, [slot, allowed]);

  if (!slot || !allowed) return null;

  return (
    <div className={`no-print overflow-hidden text-center my-6 min-h-[100px] ${className}`} aria-label="Advertisement">
      <ins
        className="adsbygoogle"
        style={{ display: 'block', minHeight: 100 }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive}
      />
    </div>
  );
}
