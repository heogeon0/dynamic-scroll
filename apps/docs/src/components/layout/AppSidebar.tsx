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
    group: "플레이그라운드",
    items: [
      { title: "채팅 데모", href: "/" },
    ],
  },
  {
    group: "구현 원리",
    items: [
      { title: "가상 스크롤 원리", href: "/how-it-works#virtual-scroll" },
      { title: "이진 탐색 알고리즘", href: "/how-it-works#binary-search" },
      { title: "높이 측정 시스템", href: "/how-it-works#measurement" },
      { title: "양방향 무한 스크롤", href: "/how-it-works#bidirectional-scroll" },
    ],
  },
  {
    group: "응용 패턴",
    items: [
      { title: "채팅 앱 구현 패턴", href: "/how-it-works#chat-patterns" },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          dynamic-scroll
        </Link>
        <p className="text-xs text-muted-foreground">
          사전 측정 기반 가상 스크롤 라이브러리
        </p>
      </SidebarHeader>
      <SidebarContent>
        {NAV_ITEMS.map((group) => (
          <SidebarGroup key={group.group}>
            <SidebarGroupLabel>{group.group}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={pathname === item.href || (pathname.startsWith(item.href.split("#")[0]) && item.href.split("#")[0] !== "/")}
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
