'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Key, Users, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiSections } from '@/lib/api-data';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getIcon } from '@/lib/icons';
import { Badge } from '@/components/ui/badge';

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:block fixed top-0 left-0 h-screen w-[220px] lg:w-[280px] border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-30">
      <div className="flex h-full flex-col">
        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
              <span className="text-white text-sm font-bold">Y</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold">YapaGachis</span>
              <span className="text-[10px] text-muted-foreground -mt-1">API Documentation</span>
            </div>
          </Link>
        </div>
        <ScrollArea className="flex-1 px-3 py-4">
          <div className="space-y-1">
            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Guide
            </p>
            <Link
              href="/docs"
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent group',
                pathname === '/docs' && 'bg-accent text-accent-foreground font-medium'
              )}
            >
              <BookOpen className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
              Introduction
              {pathname === '/docs' && <ChevronRight className="ml-auto h-4 w-4" />}
            </Link>
            <Link
              href="/docs/authentication"
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent group',
                pathname === '/docs/authentication' && 'bg-accent text-accent-foreground font-medium'
              )}
            >
              <Key className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
              Authentification
              {pathname === '/docs/authentication' && <ChevronRight className="ml-auto h-4 w-4" />}
            </Link>
            <Link
              href="/docs/roles"
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent group',
                pathname === '/docs/roles' && 'bg-accent text-accent-foreground font-medium'
              )}
            >
              <Users className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
              Roles Utilisateurs
              {pathname === '/docs/roles' && <ChevronRight className="ml-auto h-4 w-4" />}
            </Link>
          </div>

          <div className="mt-6 space-y-1">
            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              API Reference
            </p>
            {apiSections.map((section) => {
              const IconComponent = getIcon(section.icon);
              const isActive = pathname === `/docs/${section.id}`;
              return (
                <Link
                  key={section.id}
                  href={`/docs/${section.id}`}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent group',
                    isActive && 'bg-accent text-accent-foreground font-medium'
                  )}
                >
                  <IconComponent className="h-4 w-4 text-muted-foreground group-hover:text-foreground flex-shrink-0" />
                  <span className="truncate">{section.title}</span>
                  <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0">
                    {section.endpoints.length}
                  </Badge>
                </Link>
              );
            })}
          </div>
        </ScrollArea>

        <div className="border-t p-4">
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs font-medium">Base URL</p>
            <code className="text-[10px] text-muted-foreground break-all">
              https://api.yapasgachis.com/api/v1
            </code>
          </div>
        </div>
      </div>
    </aside>
  );
}
