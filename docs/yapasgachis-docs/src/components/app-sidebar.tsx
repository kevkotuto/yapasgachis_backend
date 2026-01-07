'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Key, Users, ExternalLink } from 'lucide-react';
import { apiSections } from '@/lib/api-data';
import { getIcon } from '@/lib/icons';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
} from '@/components/ui/sidebar';

const guideItems = [
  { title: 'Introduction', url: '/docs', icon: BookOpen },
  { title: 'Authentification', url: '/docs/authentication', icon: Key },
  { title: 'Roles Utilisateurs', url: '/docs/roles', icon: Users },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader className="p-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm font-bold">Y</span>
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-bold">YapaGachis</span>
            <span className="text-[10px] text-muted-foreground leading-tight">API Documentation</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Guide</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {guideItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                    tooltip={item.title}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>API Reference</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {apiSections.map((section) => {
                const IconComponent = getIcon(section.icon);
                const isActive = pathname === `/docs/${section.id}`;
                return (
                  <SidebarMenuItem key={section.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={section.title}
                    >
                      <Link href={`/docs/${section.id}`}>
                        <IconComponent className="h-4 w-4" />
                        <span>{section.title}</span>
                      </Link>
                    </SidebarMenuButton>
                    <SidebarMenuBadge className="group-data-[collapsible=icon]:hidden">
                      {section.endpoints.length}
                    </SidebarMenuBadge>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="rounded-lg bg-muted/50 p-3 group-data-[collapsible=icon]:hidden">
          <p className="text-xs font-medium mb-1">Base URL</p>
          <code className="text-[10px] text-muted-foreground break-all">
            https://api.yapasgachis.com/api/v1
          </code>
        </div>
        <SidebarMenu className="group-data-[collapsible=icon]:hidden">
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="sm">
              <a
                href="https://api.yapasgachis.com/api-docs"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4" />
                <span>Swagger UI</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
