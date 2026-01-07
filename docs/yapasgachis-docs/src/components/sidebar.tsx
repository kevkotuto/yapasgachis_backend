'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { apiSections } from '@/lib/api-data';
import { ScrollArea } from '@/components/ui/scroll-area';
import * as Icons from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="hidden border-r bg-muted/40 md:block">
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-xs font-bold">Y</span>
            </div>
            <span>YapaGachis API</span>
          </Link>
        </div>
        <ScrollArea className="flex-1 px-3">
          <div className="space-y-1 py-2">
            <Link
              href="/docs"
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent',
                pathname === '/docs' && 'bg-accent'
              )}
            >
              <Icons.BookOpen className="h-4 w-4" />
              Introduction
            </Link>
            <Link
              href="/docs/authentication"
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent',
                pathname === '/docs/authentication' && 'bg-accent'
              )}
            >
              <Icons.Key className="h-4 w-4" />
              Authentification
            </Link>
            <Link
              href="/docs/roles"
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent',
                pathname === '/docs/roles' && 'bg-accent'
              )}
            >
              <Icons.Users className="h-4 w-4" />
              Roles Utilisateurs
            </Link>
          </div>
          <div className="py-2">
            <h4 className="mb-1 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              API Reference
            </h4>
            <div className="space-y-1">
              {apiSections.map((section) => {
                const IconComponent = (Icons as Record<string, React.ComponentType<{ className?: string }>>)[section.icon] || Icons.Circle;
                return (
                  <Link
                    key={section.id}
                    href={`/docs/${section.id}`}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent',
                      pathname === `/docs/${section.id}` && 'bg-accent'
                    )}
                  >
                    <IconComponent className="h-4 w-4" />
                    {section.title}
                  </Link>
                );
              })}
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
