'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { apiSections } from '@/lib/api-data';
import * as Icons from 'lucide-react';

export function MobileNav() {
  const pathname = usePathname();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <div className="flex h-14 items-center border-b px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-xs font-bold">Y</span>
            </div>
            <span>YapaGachis API</span>
          </Link>
        </div>
        <ScrollArea className="h-[calc(100vh-3.5rem)] px-3 py-4">
          <div className="space-y-1">
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
          <div className="py-4">
            <h4 className="mb-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
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
      </SheetContent>
    </Sheet>
  );
}
