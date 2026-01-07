import { notFound } from 'next/navigation';
import { apiSections } from '@/lib/api-data';
import { EndpointCard } from '@/components/endpoint-card';
import { Badge } from '@/components/ui/badge';
import { getIcon } from '@/lib/icons';

interface SectionPageProps {
  params: Promise<{
    section: string;
  }>;
}

export async function generateStaticParams() {
  return apiSections.map((section) => ({
    section: section.id,
  }));
}

export default async function SectionPage({ params }: SectionPageProps) {
  const { section: sectionId } = await params;
  const section = apiSections.find((s) => s.id === sectionId);

  if (!section) {
    notFound();
  }

  const IconComponent = getIcon(section.icon);

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <IconComponent className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">{section.title}</h1>
        </div>
        <p className="text-muted-foreground">{section.description}</p>
        <div className="flex items-center gap-2 mt-4">
          <Badge variant="outline">{section.endpoints.length} endpoints</Badge>
          <Badge variant="secondary">Base: /api/v1</Badge>
        </div>
      </div>

      <div className="space-y-4">
        {section.endpoints.map((endpoint, index) => (
          <EndpointCard key={index} endpoint={endpoint} />
        ))}
      </div>
    </div>
  );
}
