'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { apiSections } from '@/lib/api-data';

export function SearchCommand() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const runCommand = React.useCallback((command: () => unknown) => {
    setOpen(false);
    command();
  }, []);

  return (
    <>
      <Button
        variant="outline"
        className="relative h-9 w-full justify-start rounded-md text-sm text-muted-foreground sm:pr-12 md:w-40 lg:w-64"
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        <span className="hidden lg:inline-flex">Rechercher...</span>
        <span className="inline-flex lg:hidden">Rechercher...</span>
        <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Rechercher une route, section..." />
        <CommandList>
          <CommandEmpty>Aucun resultat trouve.</CommandEmpty>
          {apiSections.map((section) => (
            <CommandGroup key={section.id} heading={section.title}>
              <CommandItem
                onSelect={() => runCommand(() => router.push(`/docs/${section.id}`))}
              >
                <span>{section.title}</span>
              </CommandItem>
              {section.endpoints.slice(0, 3).map((endpoint, i) => (
                <CommandItem
                  key={`${section.id}-${i}`}
                  onSelect={() => runCommand(() => router.push(`/docs/${section.id}`))}
                >
                  <span className={`mr-2 text-xs font-mono px-1.5 py-0.5 rounded method-${endpoint.method.toLowerCase()}`}>
                    {endpoint.method}
                  </span>
                  <span className="font-mono text-sm">{endpoint.path}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
