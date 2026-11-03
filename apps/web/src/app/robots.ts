import type { MetadataRoute } from 'next';
import { config } from '@/lib/config';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  if (config.noindex) return { rules: { userAgent: '*', disallow: '/' } };
  return { rules: { userAgent: '*', allow: '/', disallow: ['/pro/', '/my-plan/'] }, sitemap: `${config.siteUrl}/sitemap.xml` };
}
