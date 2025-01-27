import { source } from '../../../lib/source';
import {
  DocsPage,
  DocsBody,
  DocsDescription,
  DocsTitle,
} from 'fumadocs-ui/page';
import { notFound } from 'next/navigation';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import { absoluteUrl, cn } from '../../../lib/utils';
import { Accordion, Accordions } from 'fumadocs-ui/components/accordion';
import { Step, Steps } from 'fumadocs-ui/components/steps';
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';
import { TypeTable } from 'fumadocs-ui/components/type-table';
import { Link, Folder, Files } from 'lucide-react';

export default async function Page(props: {
  params: Promise<{ slug?: string[] }>;
}) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const MDX = page.data.body;

  return (
    <DocsPage
      toc={page.data.toc}
      full={page.data.full}
      tableOfContent={{
        style: 'clerk',
        header: <div className="w-10 h-4"></div>,
      }}
      footer={{
        enabled: true,
        component: <div className="w-10 h-4" />,
      }}
    >
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <MDX
          components={{
            ...defaultMdxComponents,
            Link: ({
              className,
              ...props
            }: React.ComponentProps<typeof Link>) => (
              <Link
                className={cn(
                  'font-medium underline underline-offset-4',
                  className
                )}
                {...props}
              />
            ),
            Step,
            Steps,

            Folder,
            Files,
            Tab,
            Tabs,

            TypeTable,

            Accordion,
            Accordions,
            iframe: (props) => (
              <iframe {...props} className="w-full h-[500px]" />
            ),
          }}
        />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  const res = source.getPages().map((page) => ({
    slug: page.slugs,
  }));
  return source.generateParams();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;
  const page = source.getPage(slug);
  if (page == null) notFound();
  const baseUrl = process.env.NEXT_PUBLIC_URL || process.env.VERCEL_URL;
  const url = new URL(`${baseUrl}/api/og`);
  const { title, description } = page.data;
  const pageSlug = page.file.path;
  url.searchParams.set('type', 'Documentation');
  url.searchParams.set('mode', 'dark');
  url.searchParams.set('heading', `${title}`);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      url: absoluteUrl(`docs/${pageSlug}`),
      images: [
        {
          url: url.toString(),
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [url.toString()],
    },
  };
}
