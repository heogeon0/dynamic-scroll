"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const NAV_ITEMS = [
  {
    group: "Playground",
    items: [{ title: "Chat Demo", href: "/" }],
  },
  {
    group: "How It Works",
    items: [
      { title: "Virtual Scroll", href: "/how-it-works#virtual-scroll" },
      { title: "Binary Search", href: "/how-it-works#binary-search" },
      { title: "Height Measurement", href: "/how-it-works#measurement" },
      { title: "Sticky Group Header", href: "/how-it-works#sticky-group-header" },
      { title: "Bidirectional Scroll", href: "/how-it-works#bidirectional-scroll" },
    ],
  },
  {
    group: "Patterns",
    items: [
      { title: "Chat App Patterns", href: "/how-it-works#chat-patterns" },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader className="p-5">
        <Link href="/" className="flex flex-col gap-1">
          <span className="font-semibold text-base tracking-tight">
            dynamic-scroll
          </span>
          <span className="text-xs text-muted-foreground leading-snug">
            Pre-render measurement based virtual scroll
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {NAV_ITEMS.map((group) => (
          <SidebarGroup key={group.group}>
            <SidebarGroupLabel className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
              {group.group}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={
                        pathname === item.href ||
                        (pathname.startsWith(item.href.split("#")[0]) &&
                          item.href.split("#")[0] !== "/")
                      }
                    >
                      {item.title}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
