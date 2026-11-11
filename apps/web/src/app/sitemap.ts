import type { MetadataRoute } from 'next';
import { config } from '@/lib/config';
import { TOOLS } from '@/lib/toolCatalog';

export const dynamic = 'force-static';

const ROUTES = ['/', '/health-check/', '/debt-payoff/', '/goal-planner/', '/retirement-planner/', '/loan-prepayment/', '/pricing/', '/sip-calculator/', '/emi-calculator/', '/compound-interest/', '/quick-calculators/', '/about/', '/privacy/', '/terms/', '/refund/', '/contact/', '/tools/', ...TOOLS.map((t) => `/tools/${t.slug}/`)];

export default function sitemap(): MetadataRoute.Sitemap {
  return ROUTES.map((r) => ({ url: `${config.siteUrl}${r}`, changeFrequency: 'monthly', priority: r === '/health-check/' ? 1 : 0.7 }));
}
