import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { GenericTool } from '@/components/tools/GenericTool';
import { TOOLS, TOOL_BY_SLUG } from '@/lib/toolCatalog';

export const dynamicParams = false;

export function generateStaticParams() {
  return TOOLS.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const t = TOOL_BY_SLUG[slug];
  if (!t) return {};
  return {
    title: t.region === 'Global' ? t.title : `${t.title} (${t.region})`,
    description: t.summary,
    alternates: { canonical: `/tools/${t.slug}/` },
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!TOOL_BY_SLUG[slug]) notFound();
  return <GenericTool slug={slug} />;
}
