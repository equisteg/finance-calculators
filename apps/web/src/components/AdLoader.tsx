'use client';

import { useEffect } from 'react';
import { ADSENSE_CLIENT } from '@/lib/ads';
import { useAdsAllowed } from './ProProvider';

/** Adds the AdSense script only once we know the visitor is on the free plan. Pro users never download it. */
export function AdLoader() {
  const allowed = useAdsAllowed();
  useEffect(() => {
    if (!allowed || !ADSENSE_CLIENT || document.getElementById('adsbygoogle-js')) return;
    const s = document.createElement('script');
    s.id = 'adsbygoogle-js';
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(ADSENSE_CLIENT)}`;
    document.head.appendChild(s);
  }, [allowed]);
  return null;
}
